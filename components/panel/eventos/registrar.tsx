"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type FormEvent, type ReactNode } from "react";
import { buscarAnimalAction, registrarEventoAction, type AnimalElegido } from "@/lib/evento-actions";
import {
  DENTICION,
  FACILIDAD_PARTO,
  GRUPOS,
  GRUPOS_MODULO,
  TIPOS_IA,
  METODOS_TACTO,
  TAMANOS,
  TIPOS_PARTO,
  TIPOS_DESTETE,
  METODOS_CASTRACION,
  MOTIVOS_EGRESO,
  MOTIVOS_INGRESO,
  TIPOS_HACIENDA,
  TIPOS_PERDIDA,
  tipoHacienda,
  type ModuloRegistrar,
  type SujetoTipo,
} from "@/lib/eventos-hacienda";
import { METODOS_DOSIFICACION, NUMERO_DOSIS, RESULTADOS_PRUEBA, TIPOS_ANALISIS, TIPOS_DESPARASITACION, VIAS, retiroTexto } from "@/lib/sanidad";
import { RESULTADO_TONO, calcularTuberculina, umbralesTexto, type TipoPrueba } from "@/lib/tuberculina";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { fpp, gestacion, type Gestaciones } from "@/lib/gestacion";
import { fecha as fmtFecha } from "@/lib/format";
import { uuidv7 } from "@/lib/uuid";
import { ChoiceChip } from "@/components/choice";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Spinner, Textarea, buttonClass, cx, fieldAria } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconClose, IconPlus, IconSearch } from "@/components/icons";

type Opt = { codigo: string; nombre: string };
export type CategoriaOpt = Opt & { especie: string; sexo?: string | null };
export type LoteOpt = { id: string; nombre: string; especie: string; anonimo: boolean; conteo: Record<string, number>; retiroHasta?: string | null };
export type ProductoOpt = {
  id: string;
  nombre: string;
  tipo: string;
  via: string | null;
  dosis: string | null;
  principio: string | null;
  carne: number | null;
  leche: number | null;
  enfermedades: string[];
  especies: string[];
};
/** Tarea del plan sanitario que se cierra con este registro. */
export type TareaOpt = { id: string; titulo: string; tipo: string; enfermedad: string | null; productoId: string | null; loteId: string | null; potreroId: string | null; vence: string };
export type ReproductorExternoOpt = { id: string; nombre: string; rp?: string | null; registro_genealogico?: string | null; especie_codigo: string };

export interface RegistrarEventoProps {
  /** Qué tipos ofrece el selector (Hacienda o Reproducción). */
  modulo?: ModuloRegistrar;
  tipoInicial?: string;
  animalesIniciales: AnimalElegido[];
  loteInicial?: string;
  lotes: LoteOpt[];
  potreros: Array<{ id: string; nombre: string }>;
  categorias: CategoriaOpt[];
  razas: Array<Opt & { especie: string }>;
  causasMuerte: Opt[];
  destinos: Opt[];
  categoriasFaena: Opt[];
  gestaciones: Gestaciones;
  hoy: string;
  productos?: ProductoOpt[];
  enfermedades?: Opt[];
  tarea?: TareaOpt | null;
  potreroInicial?: string;
  pruebas?: TipoPrueba[];
  reproductoresExternos?: ReproductorExternoOpt[];
}

type Fila = { key: number; especie: string; sexo: string; categoria: string };

const ESPECIE_LABEL: Record<string, string> = { BOV: "Bovino", BUB: "Bubalino" };

/**
 * Registrar un evento de hacienda (TPA-22): qué pasó → a quiénes → datos.
 * Formularios guiados por tipo (nada de JSON); el resumen de la derecha dice
 * exactamente qué se va a guardar. El envío es manual para que React no
 * limpie lo cargado si la API devuelve un error.
 */
export function RegistrarEvento(p: RegistrarEventoProps) {
  const router = useRouter();
  const { state, formAction, pending, f, idem } = useActionForm(registrarEventoAction);
  const [docIds] = useState(() => ({ id: uuidv7(), version: uuidv7() }));
  const tipoIni = p.tarea?.tipo ?? p.tipoInicial;
  const [tipo, setTipo] = useState(tipoIni && tipoHacienda(tipoIni) && !tipoHacienda(tipoIni)?.redirige ? tipoIni : "");
  const meta = tipoHacienda(tipo);
  const [sujeto, setSujeto] = useState<SujetoTipo>(
    p.tarea?.potreroId || (p.potreroInicial && !p.animalesIniciales.length) ? "potrero" : (p.tarea?.loteId || p.loteInicial) && !p.animalesIniciales.length ? "lote" : "animales",
  );
  const [potreroId, setPotreroId] = useState(p.tarea?.potreroId ?? p.potreroInicial ?? "");
  const [animales, setAnimales] = useState<AnimalElegido[]>(p.animalesIniciales);
  const [loteId, setLoteId] = useState(p.tarea?.loteId ?? p.loteInicial ?? "");
  const [busca, setBusca] = useState("");
  const [buscaErr, setBuscaErr] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([{ key: 0, especie: "BOV", sexo: "", categoria: "" }]);
  const [causa, setCausa] = useState("");
  const [madre, setMadre] = useState<AnimalElegido | null>(null);
  const [padre, setPadre] = useState<AnimalElegido | null>(null);
  const [madreExternaId, setMadreExternaId] = useState("");
  const [padreExternoId, setPadreExternoId] = useState("");
  const [toros, setToros] = useState<AnimalElegido[]>([]);

  const sujetoEfectivo = meta && !meta.sujetos.includes(sujeto) ? meta.sujetos[0] : sujeto;
  const creaAnimales = sujetoEfectivo === "animales" && (tipo === "hacienda.ingreso" || tipo === "hacienda.nacimiento");
  const lote = p.lotes.find((l) => l.id === loteId);
  const conConteo = sujetoEfectivo === "lote" && ["hacienda.ingreso", "hacienda.nacimiento", "hacienda.egreso", "hacienda.muerte", "hacienda.perdida", "hacienda.faena"].includes(tipo);
  const especieSel = animales[0]?.especie ?? lote?.especie ?? "";

  async function sumar(valor: string, destino: "animales" | "madre" | "padre" | "toros" = "animales") {
    if (!valor.trim()) return;
    setBuscando(true);
    setBuscaErr("");
    const r = await buscarAnimalAction(valor);
    setBuscando(false);
    if (!r.animal) return setBuscaErr(r.error ?? "No lo encontramos.");
    if (destino === "madre") { setMadreExternaId(""); return setMadre(r.animal); }
    if (destino === "padre") {
      if (r.animal.sexo !== "M") return setBuscaErr(`${r.animal.ident} no es macho.`);
      setPadreExternoId(""); return setPadre(r.animal);
    }
    if (destino === "toros") {
      if (r.animal.sexo !== "M") return setBuscaErr(`${r.animal.ident} no es macho.`);
      if (!toros.some((t) => t.id === r.animal!.id)) setToros((xs) => [...xs, r.animal!]);
      return;
    }
    if (r.animal.estado && r.animal.estado !== "activo") return setBuscaErr(`${r.animal.ident} figura como ${r.animal.estado}: no se le pueden cargar eventos de manejo.`);
    if (animales.some((a) => a.id === r.animal!.id)) return setBuscaErr(`${r.animal.ident} ya está en la lista.`);
    setAnimales((xs) => [...xs, r.animal!]);
    setBusca("");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (sub?.name) fd.set(sub.name, sub.value);
    startTransition(() => formAction(fd));
  }

  const grupos = GRUPOS_MODULO[p.modulo ?? "hacienda"].map((g) => ({ g, label: GRUPOS[g], tipos: TIPOS_HACIENDA.filter((t) => t.grupo === g) }));

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="doc_id" value={docIds.id} />
      <input type="hidden" name="doc_version_id" value={docIds.version} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="sujeto" value={sujetoEfectivo} />
      {sujetoEfectivo === "animales" && !creaAnimales && animales.map((a) => <input key={a.id} type="hidden" name="animal_id" value={a.id} />)}
      {madre && <input type="hidden" name="madre_id" value={madre.id} />}
      {padre && <input type="hidden" name="padre_id" value={padre.id} />}
      {madreExternaId && <input type="hidden" name="madre_externa_id" value={madreExternaId} />}
      {padreExternoId && <input type="hidden" name="padre_externo_id" value={padreExternoId} />}
      {tipo === "reproduccion.servicio_natural" && toros.map((t) => <input key={t.id} type="hidden" name="toro_id" value={t.id} />)}
      {p.tarea && tipo === p.tarea.tipo && <input type="hidden" name="tarea_id" value={p.tarea.id} />}

      <div className="min-w-0 space-y-4">
        {/* 1. Qué pasó */}
        <Card className="overflow-hidden">
          <CardHeader title={<Paso n={1}>¿Qué pasó?</Paso>} description={meta ? meta.ayuda : p.modulo === "reproduccion" ? "Elegí el evento. Las hembras que cargues actualizan su estado reproductivo y el calendario de partos." : p.modulo === "sanidad" ? "Elegí qué se aplicó. Se puede registrar a un animal, a un lote entero o a todo un potrero en un solo paso." : "Elegí el evento. Las identificaciones se cargan en la ficha del animal."} action={meta ? <button type="button" onClick={() => setTipo("")} className="text-[13px] font-medium text-campo hover:underline">Cambiar</button> : undefined} />
          {meta ? (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Badge tone="info">{GRUPOS[meta.grupo]}</Badge>
              <span className="text-[15px] font-semibold text-ink">{meta.titulo}</span>
            </div>
          ) : (
            <div className={cx("grid gap-x-6 gap-y-5 px-5 py-5", grupos.length > 1 && "md:grid-cols-2", grupos.length === 3 && "xl:grid-cols-3")}>
              {grupos.map(({ g, label, tipos }) => (
                <section key={g}>
                  <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</h3>
                  <ul className="divide-y divide-border rounded-[10px] border border-border">
                    {tipos.map((t) => (
                      <li key={t.codigo}>
                        <button type="button" onClick={() => (t.redirige ? router.push(animales.length ? `${t.redirige}?animal=${animales[0].id}` : t.redirige) : setTipo(t.codigo))} className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-base">
                          <span className="min-w-0">
                            <span className="block text-[14.5px] font-semibold text-ink">{t.titulo}</span>
                            <span className="block truncate text-[12.5px] text-muted">{t.corto}</span>
                          </span>
                          <IconPlus size={16} className="shrink-0 text-subtle" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        {meta && (
          <>
            {/* 2. A quiénes */}
            <Card className="overflow-hidden">
              <CardHeader
                title={<Paso n={2}>{creaAnimales ? (tipo === "hacienda.nacimiento" ? "Crías" : "Animales que entran") : "¿A quiénes?"}</Paso>}
                description={
                  creaAnimales
                    ? "Una fila por animal. La caravana es opcional pero conviene: después se busca por ahí."
                    : sujetoEfectivo === "potrero"
                      ? "Alcanza a toda la hacienda que está hoy en el potrero: lotes por cantidades y animales identificados."
                      : sujetoEfectivo === "lote"
                        ? "El evento se registra sobre el lote y lo heredan los animales que después se caravaneen."
                        : "Buscá por caravana, RFID o tatuaje. Podés sumar varios."
                }
                action={
                  meta.sujetos.length > 1 ? (
                    <div role="radiogroup" aria-label="Sujeto del evento" className="flex gap-2">
                      {meta.sujetos.map((s) => (
                        <ChoiceChip key={s} type="radio" name="_sujeto" label={s === "lote" ? "Un lote" : s === "potrero" ? "Un potrero" : tipo === "hacienda.ingreso" || tipo === "hacienda.nacimiento" ? "Con caravana" : "Animales"} checked={sujetoEfectivo === s} onChange={() => setSujeto(s)} className="h-9 px-3.5 text-[13.5px]" />
                      ))}
                    </div>
                  ) : undefined
                }
              />
              <div className="px-5 py-4">
                {sujetoEfectivo === "potrero" ? (
                  <Field label="Potrero" htmlFor="potrero_id" error={f.potrero_id}>
                    <Select id="potrero_id" name="potrero_id" value={potreroId} onChange={(e) => setPotreroId(e.target.value)} {...fieldAria("potrero_id", f.potrero_id)}>
                      <option value="">Elegí un potrero</option>
                      {p.potreros.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : sujetoEfectivo === "lote" ? (
                  <div className="space-y-4">
                    <Field label="Lote" htmlFor="lote_id" error={f.lote_id}>
                      <Select id="lote_id" name="lote_id" value={loteId} onChange={(e) => setLoteId(e.target.value)} {...fieldAria("lote_id", f.lote_id)}>
                        <option value="">Elegí un lote</option>
                        {p.lotes.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nombre} · {ESPECIE_LABEL[l.especie] ?? l.especie}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {conConteo && lote && <Conteo lote={lote} categorias={p.categorias} suma={tipo === "hacienda.ingreso" || tipo === "hacienda.nacimiento"} error={f.conteo} />}
                  </div>
                ) : creaAnimales ? (
                  <FilasNuevas filas={filas} setFilas={setFilas} categorias={p.categorias} razas={p.razas} f={f} conPeso={tipo === "hacienda.nacimiento"} />
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                        <Input
                          aria-label="Caravana, RFID o tatuaje"
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void sumar(busca);
                            }
                          }}
                          placeholder="Caravana, RFID o tatuaje y Enter"
                          className="pl-10"
                          {...fieldAria("animales", f.animales || buscaErr)}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={() => void sumar(busca)} disabled={buscando} icon={buscando ? <Spinner /> : <IconPlus size={16} />}>
                        Sumar
                      </Button>
                    </div>
                    {(buscaErr || f.animales) && <p className="text-[12.5px] font-medium text-danger">{buscaErr || f.animales}</p>}
                    {animales.length ? (
                      <ul className="flex flex-wrap gap-2">
                        {animales.map((a) => (
                          <li key={a.id} className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-base py-1 pl-3 pr-1 text-[13.5px]">
                            <span className="font-semibold tabular-nums text-ink">{a.ident}</span>
                            <span className="text-muted">{a.categoria}</span>
                            <button type="button" aria-label={`Quitar ${a.ident}`} onClick={() => setAnimales((xs) => xs.filter((x) => x.id !== a.id))} className="grid h-7 w-7 place-items-center rounded-[6px] text-muted hover:bg-surface hover:text-ink">
                              <IconClose size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] text-muted">
                        Todavía no sumaste animales. También podés elegirlos desde el{" "}
                        <Link href="/hacienda" className="font-medium text-campo hover:underline">
                          listado de Hacienda
                        </Link>{" "}
                        y tocar «Registrar evento».
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* 3. Datos */}
            <Card className="overflow-hidden">
              <CardHeader title={<Paso n={3}>Datos del evento</Paso>} />
              {(tipo === "hacienda.egreso" || tipo === "hacienda.faena") && <AvisoVenta animales={sujetoEfectivo === "animales" ? animales : []} lote={sujetoEfectivo === "lote" ? lote : undefined} />}
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <Field label={tipo === "reproduccion.servicio_natural" ? "Inicio del servicio" : "Fecha"} htmlFor="ocurrido_en" error={f.ocurrido_en}>
                  <Input id="ocurrido_en" name="ocurrido_en" type="date" defaultValue={p.hoy} max={p.hoy} {...fieldAria("ocurrido_en", f.ocurrido_en)} />
                </Field>
                <CamposTipo tipo={tipo} f={f} p={p} causa={causa} setCausa={setCausa} especie={especieSel} madre={madre} setMadre={setMadre} padre={padre} setPadre={setPadre} madreExternaId={madreExternaId} setMadreExternaId={setMadreExternaId} padreExternoId={padreExternoId} setPadreExternoId={setPadreExternoId} sumar={sumar} buscando={buscando} creaAnimales={creaAnimales} toros={toros} setToros={setToros} buscaErr={buscaErr} animales={animales} />
                <div className="sm:col-span-2">
                  <Field label="Observaciones" htmlFor="observaciones" optional>
                    <Textarea id="observaciones" name="observaciones" maxLength={2000} rows={3} className="min-h-[84px]" placeholder="Lo que sirva para entender el evento después." />
                  </Field>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Resumen y guardar */}
      <aside className="space-y-3 xl:sticky xl:top-6">
        <Card className="overflow-hidden">
          <CardHeader title="Se va a registrar" />
          <dl className="divide-y divide-border text-[14px]">
            <Linea label="Evento">{meta?.titulo ?? <span className="text-subtle">Sin elegir</span>}</Linea>
            <Linea label="Sobre">
              {!meta ? (
                <span className="text-subtle">—</span>
              ) : sujetoEfectivo === "potrero" ? (
                p.potreros.find((x) => x.id === potreroId)?.nombre ?? <span className="text-subtle">Elegí un potrero</span>
              ) : sujetoEfectivo === "lote" ? (
                lote?.nombre ?? <span className="text-subtle">Elegí un lote</span>
              ) : creaAnimales ? (
                `${filas.length} ${filas.length === 1 ? "animal nuevo" : "animales nuevos"}`
              ) : (
                `${animales.length} ${animales.length === 1 ? "animal" : "animales"}`
              )}
            </Linea>
            {p.tarea && tipo === p.tarea.tipo && <Linea label="Cierra la tarea">{p.tarea.titulo}</Linea>}
          </dl>
          <div className="space-y-3 border-t border-border px-5 py-4">
            <FormAlerts state={state} pending={pending} />
            <Button type="submit" className="w-full" disabled={!meta || pending} icon={pending ? <Spinner /> : undefined}>
              Registrar evento
            </Button>
            <p className="text-[12.5px] leading-snug text-muted">Queda en la historia con tu nombre, rol y huella. No se borra: si te equivocás, se corrige o se anula con motivo.</p>
          </div>
        </Card>
        <Link href={p.modulo === "reproduccion" ? "/reproduccion" : p.modulo === "sanidad" ? "/sanidad" : "/hacienda/eventos"} className={buttonClass("ghost", "sm")}>
          <IconArrowLeft size={16} /> {p.modulo === "reproduccion" ? "Volver a Reproducción" : p.modulo === "sanidad" ? "Volver a Sanidad" : "Volver al registro"}
        </Link>
      </aside>
    </form>
  );
}

function Paso({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-monte text-[12px] font-bold tabular-nums text-blanco">{n}</span>
      {children}
    </span>
  );
}

function Linea({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

function Opciones({ lista, vacio }: { lista: readonly (readonly [string, string])[] | Opt[]; vacio?: string }) {
  return (
    <>
      {vacio !== undefined && <option value="">{vacio}</option>}
      {lista.map((o) => {
        const [c, n] = Array.isArray(o) ? o : [(o as Opt).codigo, (o as Opt).nombre];
        return (
          <option key={c} value={c}>
            {n}
          </option>
        );
      })}
    </>
  );
}

/** Cabezas por categoría sobre un lote (bajas: no más de las que hay). */
function Conteo({ lote, categorias, suma, error }: { lote: LoteOpt; categorias: CategoriaOpt[]; suma: boolean; error?: string }) {
  const cats = suma ? categorias.filter((c) => c.especie === lote.especie) : categorias.filter((c) => (lote.conteo[c.codigo] ?? 0) > 0);
  if (!cats.length) {
    return <p className="rounded-[10px] border border-border bg-base px-4 py-3 text-[13.5px] text-muted">Este lote no tiene cabezas por cantidades. Si sus animales tienen caravana, elegí «Animales».</p>;
  }
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold text-ink">{suma ? "Cabezas que entran" : "Cabezas"}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cats.map((c) => (
          <label key={c.codigo} className="flex items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2">
            <span className="min-w-0 text-[13.5px]">
              <span className="block truncate font-medium text-ink">{c.nombre}</span>
              {!suma && <span className="text-[12px] tabular-nums text-muted">hay {lote.conteo[c.codigo]}</span>}
            </span>
            <input type="hidden" name={`d_${c.codigo}`} value={lote.conteo[c.codigo] ?? 0} />
            <input name={`c_${c.codigo}`} inputMode="numeric" aria-label={`Cabezas de ${c.nombre}`} className="h-9 w-16 rounded-[8px] border border-border-strong px-2 text-right text-[14px] tabular-nums focus:border-campo focus:outline-none" />
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

/** Filas de animales nuevos (ingreso con caravana o crías). */
function FilasNuevas({
  filas,
  setFilas,
  categorias,
  razas,
  f,
  conPeso,
}: {
  filas: Fila[];
  setFilas: (fn: (xs: Fila[]) => Fila[]) => void;
  categorias: CategoriaOpt[];
  razas: Array<Opt & { especie: string }>;
  f: Record<string, string>;
  conPeso: boolean;
}) {
  const set = (i: number, k: keyof Fila, v: string) => setFilas((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v, ...(k === "especie" ? { categoria: "" } : {}), ...(k === "sexo" ? { categoria: "" } : {}) } : x)));
  const err = (k: string) => (f[k] ? "border-danger" : "border-border-strong");
  const cls = "h-10 w-full rounded-[8px] border bg-surface px-2.5 text-[14px] focus:border-campo focus:outline-none";
  return (
    <div className="space-y-2">
      <input type="hidden" name="filas" value={filas.length} />
      <div className="hidden grid-cols-[1.1fr_0.9fr_0.8fr_1.2fr_1fr_1fr_36px] gap-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted md:grid">
        <span>Caravana</span>
        <span>Especie</span>
        <span>Sexo</span>
        <span>Categoría</span>
        <span>Raza</span>
        <span>{conPeso ? "Peso al nacer" : "Nacimiento"}</span>
        <span />
      </div>
      {filas.map((r, i) => (
        <div key={r.key} className="grid grid-cols-2 gap-2 rounded-[10px] border border-border p-2 md:grid-cols-[1.1fr_0.9fr_0.8fr_1.2fr_1fr_1fr_36px] md:border-0 md:p-0">
          <input name={`n_caravana_${i}`} aria-label={`Caravana fila ${i + 1}`} placeholder="Ej. 0731" maxLength={64} className={cx(cls, err(`n_caravana_${i}`), "tabular-nums")} />
          <Select name={`n_especie_${i}`} aria-label={`Especie fila ${i + 1}`} value={r.especie} onChange={(e) => set(i, "especie", e.target.value)} className="h-10 px-2.5 text-[14px]">
            <option value="BOV">Bovino</option>
            <option value="BUB">Bubalino</option>
          </Select>
          <Select name={`n_sexo_${i}`} aria-label={`Sexo fila ${i + 1}`} value={r.sexo} onChange={(e) => set(i, "sexo", e.target.value)} className={cx("h-10 px-2.5 text-[14px]", err(`n_sexo_${i}`))}>
            <option value="">Sexo</option>
            <option value="H">Hembra</option>
            <option value="M">Macho</option>
          </Select>
          <Select name={`n_categoria_${i}`} aria-label={`Categoría fila ${i + 1}`} value={r.categoria} onChange={(e) => set(i, "categoria", e.target.value)} className={cx("h-10 px-2.5 text-[14px]", err(`n_categoria_${i}`))}>
            <option value="">Categoría</option>
            {categorias
              .filter((c) => c.especie === r.especie && (!r.sexo || !c.sexo || c.sexo === r.sexo))
              .map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
          </Select>
          <Select name={`n_raza_${i}`} aria-label={`Raza fila ${i + 1}`} defaultValue="" className={cx("h-10 px-2.5 text-[14px]", "border-border-strong")}>
            <option value="">Raza</option>
            {razas
              .filter((z) => z.especie === r.especie)
              .map((z) => (
                <option key={z.codigo} value={z.codigo}>
                  {z.nombre}
                </option>
              ))}
          </Select>
          {conPeso ? (
            <input name={`n_peso_${i}`} inputMode="decimal" aria-label={`Peso al nacer fila ${i + 1}`} placeholder="kg" className={cx(cls, "border-border-strong tabular-nums")} />
          ) : (
            <input name={`n_nacimiento_${i}`} type="date" aria-label={`Nacimiento fila ${i + 1}`} className={cx(cls, err(`n_nacimiento_${i}`))} />
          )}
          <button
            type="button"
            aria-label={`Quitar fila ${i + 1}`}
            disabled={filas.length === 1}
            onClick={() => setFilas((xs) => xs.filter((_, j) => j !== i))}
            className="grid h-10 w-9 place-items-center rounded-[8px] text-muted hover:bg-base hover:text-ink disabled:opacity-30"
          >
            <IconClose size={16} />
          </button>
        </div>
      ))}
      {f.animales && <p className="text-[12.5px] font-medium text-danger">{f.animales}</p>}
      <button
        type="button"
        onClick={() => setFilas((xs) => [...xs, { key: Date.now(), especie: xs.at(-1)?.especie ?? "BOV", sexo: xs.at(-1)?.sexo ?? "", categoria: xs.at(-1)?.categoria ?? "" }])}
        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-campo hover:underline"
      >
        <IconPlus size={16} /> Agregar otra fila
      </button>
    </div>
  );
}

/** Campos específicos de cada tipo (functional/02 §2.1). */
function CamposTipo({
  tipo,
  f,
  p,
  causa,
  setCausa,
  especie,
  madre,
  setMadre,
  padre,
  setPadre,
  madreExternaId,
  setMadreExternaId,
  padreExternoId,
  setPadreExternoId,
  sumar,
  buscando,
  creaAnimales,
  toros,
  setToros,
  buscaErr,
  animales,
}: {
  tipo: string;
  f: Record<string, string>;
  p: RegistrarEventoProps;
  causa: string;
  setCausa: (s: string) => void;
  especie: string;
  madre: AnimalElegido | null;
  setMadre: (a: AnimalElegido | null) => void;
  sumar: (v: string, d?: "animales" | "madre" | "padre" | "toros") => Promise<void>;
  padre: AnimalElegido | null;
  setPadre: (a: AnimalElegido | null) => void;
  madreExternaId: string;
  setMadreExternaId: (id: string) => void;
  padreExternoId: string;
  setPadreExternoId: (id: string) => void;
  buscando: boolean;
  creaAnimales: boolean;
  toros: AnimalElegido[];
  setToros: (fn: (xs: AnimalElegido[]) => AnimalElegido[]) => void;
  buscaErr: string;
  animales: AnimalElegido[];
}) {
  const sel = (name: string, label: string, lista: readonly (readonly [string, string])[] | Opt[], vacio = "Elegí", optional = false) => (
    <Field label={label} htmlFor={name} error={f[name]} optional={optional}>
      <Select id={name} name={name} defaultValue="" {...fieldAria(name, f[name])}>
        <Opciones lista={lista} vacio={vacio} />
      </Select>
    </Field>
  );
  const txt = (name: string, label: string, opts: { optional?: boolean; placeholder?: string; max?: number; full?: boolean; kg?: boolean } = {}) => (
    <div className={opts.full ? "sm:col-span-2" : undefined}>
      <Field label={label} htmlFor={name} error={f[name]} optional={opts.optional}>
        <div className="relative">
          <Input id={name} name={name} maxLength={opts.max ?? 120} placeholder={opts.placeholder} inputMode={opts.kg ? "decimal" : undefined} className={opts.kg ? "pr-10 tabular-nums" : undefined} {...fieldAria(name, f[name])} />
          {opts.kg && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">kg</span>}
        </div>
      </Field>
    </div>
  );
  const destinoAlta = creaAnimales && (
    <>
      <Field label="Lote de destino" htmlFor="destino_lote_id" optional>
        <Select id="destino_lote_id" name="destino_lote_id" defaultValue="">
          <option value="">Sin lote</option>
          {p.lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Potrero" htmlFor="destino_potrero_id" optional>
        <Select id="destino_potrero_id" name="destino_potrero_id" defaultValue="">
          <option value="">Sin indicar</option>
          {p.potreros.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );

  switch (tipo) {
    case "hacienda.ingreso":
      return (
        <>
          {sel("motivo", "Motivo", MOTIVOS_INGRESO)}
          {txt("vendedor", "Vendedor u origen", { optional: true, placeholder: "Cabaña, consignataria o productor" })}
          {txt("localidad", "Localidad de origen", { optional: true })}
          {txt("renspa_declarado", "RENSPA de origen", { optional: true, max: 40, placeholder: "Privado: no se publica" })}
          {txt("dte_numero", "N.º de DT-e", { optional: true, max: 40 })}
          {destinoAlta}
        </>
      );
    case "hacienda.nacimiento":
      return (
        <>
          {sel("facilidad", "Facilidad de parto", FACILIDAD_PARTO, "Sin indicar", true)}
          <div className="sm:col-span-2">
            <Field label="Madre" htmlFor="madre_busca" optional hint="Si la madre tiene caravana en el sistema, buscala; si no, describila.">
              {madre ? (
                <div className="flex items-center justify-between rounded-[10px] border border-border bg-base px-3 py-2 text-[14px]">
                  <span>
                    <span className="font-semibold tabular-nums">{madre.ident}</span> <span className="text-muted">{madre.categoria}</span>
                  </span>
                  <button type="button" onClick={() => setMadre(null)} className="text-[13px] font-medium text-campo hover:underline">
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    id="madre_busca"
                    placeholder="Caravana de la madre y Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sumar(e.currentTarget.value, "madre");
                      }
                    }}
                    disabled={buscando}
                  />
                  <Input name="madre_externa" maxLength={120} placeholder="O: «vaca colorada del vecino»" aria-label="Madre fuera del sistema" />
                </div>
              )}
              {!madre && (p.reproductoresExternos ?? []).length > 0 && (
                <Select aria-label="Madre reproductora externa" value={madreExternaId} onChange={(e) => { setMadre(null); setMadreExternaId(e.target.value); }} className="mt-2">
                  <option value="">O elegí una madre del catálogo externo</option>
                  {p.reproductoresExternos!.filter((r) => !especie || r.especie_codigo === especie).map((r) => <option key={r.id} value={r.id}>{r.nombre}{r.rp ? ` · RP ${r.rp}` : ""}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Padre" htmlFor="padre_busca" optional hint="Buscá el macho por caravana o elegí un reproductor externo.">
              {padre ? (
                <div className="flex items-center justify-between rounded-[10px] border border-border bg-base px-3 py-2 text-[14px]"><span>{padre.ident} · del campo</span><button type="button" onClick={() => setPadre(null)} className="text-[13px] font-medium text-campo hover:underline">Cambiar</button></div>
              ) : (
                <Input id="padre_busca" placeholder="Caravana del padre y Enter" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sumar(e.currentTarget.value, "padre"); } }} disabled={buscando} />
              )}
              {!padre && (p.reproductoresExternos ?? []).length > 0 && (
                <Select aria-label="Padre reproductor externo" value={padreExternoId} onChange={(e) => { setPadre(null); setPadreExternoId(e.target.value); }} className="mt-2">
                  <option value="">O elegí un padre del catálogo externo</option>
                  {p.reproductoresExternos!.filter((r) => !especie || r.especie_codigo === especie).map((r) => <option key={r.id} value={r.id}>{r.nombre}{r.rp ? ` · RP ${r.rp}` : ""}</option>)}
                </Select>
              )}
            </Field>
          </div>
          {destinoAlta}
        </>
      );
    case "hacienda.egreso":
      return (
        <>
          {sel("motivo", "Motivo", MOTIVOS_EGRESO)}
          {sel("destino", "Destino", p.destinos, "Sin indicar", true)}
          {txt("comprador", "Comprador", { optional: true })}
          {txt("dte_numero", "N.º de DT-e", { optional: true, max: 40 })}
          {txt("destino_establecimiento", "Establecimiento de destino", { optional: true })}
          {txt("renspa_destino_declarado", "RENSPA de destino", { optional: true, max: 40, placeholder: "Privado: no se publica" })}
        </>
      );
    case "hacienda.traslado":
      return sel("potrero_destino_id", "Potrero de destino", p.potreros.map((x) => ({ codigo: x.id, nombre: x.nombre })));
    case "hacienda.cambio_lote":
      return sel("lote_destino_id", "Lote de destino", p.lotes.filter((l) => !especie || l.especie === especie).map((l) => ({ codigo: l.id, nombre: l.nombre })));
    case "hacienda.castracion":
      return (
        <>
          {sel("metodo", "Método", METODOS_CASTRACION, "Sin indicar", true)}
          {sel("categoria_nueva", "Pasa a categoría", p.categorias.filter((c) => (!especie || c.especie === especie) && c.sexo !== "H"), "Que lo sugieran las reglas", true)}
        </>
      );
    case "hacienda.denticion":
      return sel("denticion", "Dentición", DENTICION);
    case "hacienda.condicion_corporal":
      return (
        <>
          {sel("escala", "Escala", [["1-5", "1 a 5"], ["1-9", "1 a 9"]] as const, "Elegí")}
          {txt("valor", "Valor", { placeholder: "Ej. 3,5", max: 4 })}
        </>
      );
    case "hacienda.recategorizacion":
      return sel("categoria_nueva", "Categoría nueva", p.categorias.filter((c) => !especie || c.especie === especie));
    case "hacienda.muerte":
      return (
        <>
          <Field label="Causa" htmlFor="causa" error={f.causa}>
            <Select id="causa" name="causa" value={causa} onChange={(e) => setCausa(e.target.value)} {...fieldAria("causa", f.causa)}>
              <Opciones lista={p.causasMuerte} vacio="Elegí" />
            </Select>
          </Field>
          {causa === "otra" ? txt("causa_otra", "¿Cuál?", { placeholder: "Ej. mordedura de víbora" }) : <span className="hidden sm:block" />}
          <div className="sm:col-span-2">
            <Field label="Hallazgos" htmlFor="hallazgos" optional>
              <Textarea id="hallazgos" name="hallazgos" rows={3} maxLength={2000} className="min-h-[84px]" placeholder="Qué se vio: lugar, estado, lesiones." />
            </Field>
          </div>
        </>
      );
    case "hacienda.perdida":
      return (
        <>
          {sel("tipo_perdida", "¿Qué pasó?", TIPOS_PERDIDA)}
          {txt("denuncia_numero", "N.º de denuncia", { optional: true, max: 40 })}
          <div className="sm:col-span-2">
            <Field label="Circunstancias" htmlFor="circunstancias" optional>
              <Textarea id="circunstancias" name="circunstancias" rows={3} maxLength={2000} className="min-h-[84px]" />
            </Field>
          </div>
        </>
      );
    case "reproduccion.servicio_natural":
      return (
        <>
          <Field label="Fin del servicio" htmlFor="fin" error={f.fin} optional hint="Si los toros siguen con las hembras, dejalo vacío.">
            <Input id="fin" name="fin" type="date" max={p.hoy} {...fieldAria("fin", f.fin, true)} />
          </Field>
          <div className="sm:col-span-2 space-y-3 rounded-[10px] border border-border bg-base p-4">
            <p className="text-[13px] font-semibold text-ink">Toros</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Con caravana" htmlFor="toro_busca" optional>
                <Input
                  id="toro_busca"
                  placeholder="Caravana del toro y Enter"
                  disabled={buscando}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = e.currentTarget.value;
                      e.currentTarget.value = "";
                      void sumar(v, "toros");
                    }
                  }}
                />
              </Field>
              <Field label="Lote de toros" htmlFor="lote_toros_id" optional>
                <Select id="lote_toros_id" name="lote_toros_id" defaultValue="">
                  <option value="">Ninguno</option>
                  {p.lotes
                    .filter((l) => !especie || l.especie === especie)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            {toros.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {toros.map((t) => (
                  <li key={t.id} className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-surface py-1 pl-3 pr-1 text-[13.5px]">
                    <span className="font-semibold tabular-nums">{t.ident}</span>
                    <span className="text-muted">{t.categoria}</span>
                    <button type="button" aria-label={`Quitar ${t.ident}`} onClick={() => setToros((xs) => xs.filter((x) => x.id !== t.id))} className="grid h-7 w-7 place-items-center rounded-[6px] text-muted hover:bg-base">
                      <IconClose size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Field label="De afuera (prestados o sin caravana)" htmlFor="toros_externos" optional hint="Separados por coma. Ej.: «Toro Braford del vecino, Brangus colorado».">
              <Input id="toros_externos" name="toros_externos" maxLength={600} />
            </Field>
            {(f.toros || buscaErr) && <p className="text-[12.5px] font-medium text-danger">{f.toros || buscaErr}</p>}
          </div>
        </>
      );
    case "reproduccion.tacto":
      return <CamposTacto f={f} p={p} animales={animales} />;
    case "sanidad.prueba_diagnostica":
      return <CamposPrueba f={f} p={p} n={animales.length} />;
    case "sanidad.analisis_laboratorio":
      return (
        <>
          {sel("tipo_analisis", "Tipo de análisis", TIPOS_ANALISIS)}
          {txt("muestra", "Muestra", { optional: true, placeholder: "Ej. materia fecal de 10 bucerros", max: 200 })}
          {txt("laboratorio", "Laboratorio", { optional: true, placeholder: "Ej. Laboratorio de la FCV-UNNE", max: 200 })}
          <span className="hidden sm:block" />
          <div className="sm:col-span-2">
            <Field label="Resultado" htmlFor="resultado_texto" optional>
              <Textarea id="resultado_texto" name="resultado_texto" rows={3} maxLength={2000} className="min-h-[84px]" placeholder="Ej. HPG 450, Toxocara positivo." />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Informe del laboratorio" htmlFor="archivo" optional error={f.archivo} hint="PDF o foto, hasta 10 MB. Queda en Documentos con su huella.">
              <input id="archivo" name="archivo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="block w-full text-[14px] text-muted file:mr-3 file:h-10 file:cursor-pointer file:rounded-[8px] file:border file:border-border-strong file:bg-surface file:px-4 file:text-[14px] file:font-medium file:text-ink hover:file:bg-surface-2" />
            </Field>
          </div>
        </>
      );
    case "sanidad.vacunacion":
    case "sanidad.desparasitacion":
    case "sanidad.tratamiento":
      return <CamposAplicacion key={tipo} tipo={tipo} f={f} p={p} especie={especie} />;
    case "reproduccion.parto":
      return <CamposParto f={f} p={p} madre={animales[0]} />;
    case "reproduccion.aborto":
      return (
        <>
          <Field label="Días de gestación estimados" htmlFor="dias_gestacion" error={f.dias_gestacion} optional>
            <Input id="dias_gestacion" name="dias_gestacion" inputMode="numeric" maxLength={3} className="tabular-nums" {...fieldAria("dias_gestacion", f.dias_gestacion)} />
          </Field>
          {txt("causa_presunta", "Causa presunta", { optional: true, placeholder: "Ej. brucelosis, golpe, desconocida" })}
        </>
      );
    case "reproduccion.destete":
      return (
        <>
          {sel("tipo_destete", "Tipo de destete", TIPOS_DESTETE)}
          {txt("peso_kg", "Peso al destete", { optional: true, kg: true })}
          {sel("categoria_nueva", "Pasa a categoría", p.categorias.filter((c) => !especie || c.especie === especie), "Que lo sugieran las reglas", true)}
        </>
      );
    case "reproduccion.inseminacion":
      return (
        <>
          {sel("tipo_ia", "Tipo", TIPOS_IA)}
          <Field label="Reproductor del semen" htmlFor="semen_reproductor_externo_id" optional>
            <Select id="semen_reproductor_externo_id" name="semen_reproductor_externo_id" defaultValue="">
              <option value="">Sin vincular al catálogo</option>
              {(p.reproductoresExternos ?? []).filter((r) => !especie || r.especie_codigo === especie).map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}{r.rp ? ` · RP ${r.rp}` : ""}{r.registro_genealogico ? ` · ${r.registro_genealogico}` : ""}</option>
              ))}
            </Select>
          </Field>
          {txt("toro_nombre", "Toro (semen)", { optional: true, placeholder: "Nombre o código de la pajuela" })}
          <Field label="Raza del semen" htmlFor="semen_raza" optional>
            <Select id="semen_raza" name="semen_raza" defaultValue="">
              <option value="">Sin indicar</option>
              {p.razas
                .filter((z) => !especie || z.especie === especie)
                .map((z) => (
                  <option key={z.codigo} value={z.codigo}>
                    {z.nombre}
                  </option>
                ))}
            </Select>
          </Field>
          {txt("centro", "Centro genético", { optional: true, placeholder: "Ej. CIAVT, Select Sires" })}
          {txt("partida", "Partida", { optional: true, max: 60 })}
          {txt("inseminador", "Inseminador", { optional: true })}
        </>
      );
    case "hacienda.faena":
      return (
        <>
          {txt("frigorifico", "Frigorífico", { placeholder: "Ej. Frigorífico Goya" })}
          {txt("tropa_numero", "N.º de tropa", { optional: true, max: 40 })}
          {txt("peso_vivo_kg", "Peso vivo", { optional: true, kg: true })}
          {txt("pcc_kg", "Peso carcasa caliente", { optional: true, kg: true })}
          {txt("pcf_kg", "Peso carcasa fría", { optional: true, kg: true })}
          {txt("tipificacion", "Tipificación", { optional: true, max: 40 })}
          {sel("categoria_faena", "Categoría de faena", p.categoriasFaena, "Sin indicar", true)}
          {txt("decomisos", "Decomisos", { optional: true, max: 2000 })}
        </>
      );
    default:
      return null;
  }
}

/** Tacto: resultado, días y la fecha probable de parto en vivo por animal (gestación por especie y raza). */
function CamposTacto({ f, p, animales }: { f: Record<string, string>; p: RegistrarEventoProps; animales: AnimalElegido[] }) {
  const [resultado, setResultado] = useState("");
  const [dias, setDias] = useState("");
  const [fechaT, setFechaT] = useState(p.hoy);
  const d = Number(dias);
  return (
    <>
      <Field label="Método" htmlFor="metodo_tacto" error={f.metodo_tacto}>
        <Select id="metodo_tacto" name="metodo_tacto" defaultValue="tacto" {...fieldAria("metodo_tacto", f.metodo_tacto)}>
          <Opciones lista={METODOS_TACTO} />
        </Select>
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Resultado</legend>
        <div className="flex gap-2">
          <ChoiceChip type="radio" name="resultado" value="prenada" label="Preñada" checked={resultado === "prenada"} onChange={() => setResultado("prenada")} />
          <ChoiceChip type="radio" name="resultado" value="vacia" label="Vacía" checked={resultado === "vacia"} onChange={() => setResultado("vacia")} />
        </div>
        {f.resultado && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{f.resultado}</p>}
      </fieldset>
      {resultado === "prenada" && (
        <>
          <Field label="Días de gestación" htmlFor="dias_gestacion" error={f.dias_gestacion} hint="Lo que estimó el veterinario al tacto.">
            <Input id="dias_gestacion" name="dias_gestacion" inputMode="numeric" maxLength={3} value={dias} onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))} className="tabular-nums" {...fieldAria("dias_gestacion", f.dias_gestacion, true)} />
          </Field>
          <Field label="Tamaño" htmlFor="tamano" optional>
            <Select id="tamano" name="tamano" defaultValue="">
              <Opciones lista={TAMANOS} vacio="Sin indicar" />
            </Select>
          </Field>
          <div className="sm:col-span-2 rounded-[10px] border border-campo/40 bg-campo-50 px-4 py-3">
            <p className="text-[13px] font-semibold text-monte">Fecha probable de parto</p>
            {d > 0 && animales.length ? (
              <ul className="mt-1.5 space-y-1 text-[14px]">
                {animales.map((a) => {
                  const g = gestacion(p.gestaciones, a.especie, a.raza);
                  return (
                    <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2">
                      <span>
                        <span className="font-semibold tabular-nums">{a.ident}</span> <span className="text-muted">· gestación {g} días{a.raza ? "" : " (sin raza)"}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-ink">{fmtFecha(fpp(fechaT, d, g))}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-[13.5px] text-muted">Cargá los días de gestación y aparece la fecha de cada hembra según su especie y raza.</p>
            )}
            <FechaSync onChange={setFechaT} />
          </div>
        </>
      )}
      <Field label="Veterinario" htmlFor="veterinario" optional>
        <Input id="veterinario" name="veterinario" maxLength={120} />
      </Field>
    </>
  );
}

/** Sigue el campo «Fecha» del formulario (el tacto puede ser de otro día). */
function FechaSync({ onChange }: { onChange: (v: string) => void }) {
  return (
    <span
      hidden
      ref={(el) => {
        const input = el?.closest("form")?.querySelector<HTMLInputElement>("#ocurrido_en");
        if (!input) return;
        const h = () => input.value && onChange(input.value);
        input.addEventListener("change", h);
        return () => input.removeEventListener("change", h);
      }}
    />
  );
}

type Cria = { key: number; viva: boolean; sexo: string };

/** Parto: tipo y crías (vivas nacen en el sistema con la madre; muertas quedan en el parto). */
function CamposParto({ f, p, madre }: { f: Record<string, string>; p: RegistrarEventoProps; madre?: AnimalElegido }) {
  const [crias, setCrias] = useState<Cria[]>([{ key: 0, viva: true, sexo: "" }]);
  const setC = (i: number, c: Partial<Cria>) => setCrias((xs) => xs.map((x, j) => (j === i ? { ...x, ...c } : x)));
  const razas = p.razas.filter((z) => !madre?.especie || z.especie === madre.especie);
  const cls = "h-10 w-full rounded-[8px] border border-border-strong bg-surface px-2.5 text-[14px] focus:border-campo focus:outline-none";
  return (
    <>
      <Field label="Cómo fue" htmlFor="tipo_parto" error={f.tipo_parto}>
        <Select id="tipo_parto" name="tipo_parto" defaultValue="normal" {...fieldAria("tipo_parto", f.tipo_parto)}>
          <Opciones lista={TIPOS_PARTO} />
        </Select>
      </Field>
      <div className="hidden sm:block" />
      <div className="sm:col-span-2 space-y-2">
        <input type="hidden" name="crias" value={crias.length} />
        <p className="text-[13px] font-semibold text-ink">
          Crías {madre && <span className="font-normal text-muted">· de {madre.ident} ({madre.categoria})</span>}
        </p>
        {crias.map((c, i) => (
          <div key={c.key} className="grid grid-cols-2 items-center gap-2 rounded-[10px] border border-border p-2.5 md:grid-cols-[150px_130px_minmax(0,1fr)_minmax(0,1.3fr)_110px_36px]">
            <input type="hidden" name={`cr_viva_${i}`} value={c.viva ? "1" : "0"} />
            <div className="flex gap-1.5">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setC(i, { viva: v })}
                  className={cx("h-10 flex-1 rounded-[8px] border text-[13px] font-semibold", c.viva === v ? (v ? "border-monte bg-monte text-blanco" : "border-ink bg-ink text-blanco") : "border-border-strong bg-surface text-ink hover:border-campo")}
                >
                  {v ? "Viva" : "Muerta"}
                </button>
              ))}
            </div>
            <Select name={`cr_sexo_${i}`} aria-label={`Sexo cría ${i + 1}`} value={c.sexo} onChange={(e) => setC(i, { sexo: e.target.value })} className={cx("h-10 px-2.5 text-[14px]", f[`cr_sexo_${i}`] && "border-danger")}>
              <option value="">Sexo</option>
              <option value="H">Hembra</option>
              <option value="M">Macho</option>
            </Select>
            <input name={`cr_caravana_${i}`} aria-label={`Caravana cría ${i + 1}`} placeholder={c.viva ? "Caravana (opcional)" : "—"} disabled={!c.viva} maxLength={64} className={cx(cls, "tabular-nums disabled:bg-base")} />
            <Select name={`cr_raza_${i}`} aria-label={`Raza cría ${i + 1}`} defaultValue="" disabled={!c.viva} className={cx("h-10 px-2.5 text-[14px]", "disabled:bg-base")}>
              <option value="">{madre?.raza ? "Raza de la madre" : "Raza"}</option>
              {razas.map((z) => (
                <option key={z.codigo} value={z.codigo}>
                  {z.nombre}
                </option>
              ))}
            </Select>
            <div className="relative">
              <input name={`cr_peso_${i}`} inputMode="decimal" aria-label={`Peso al nacer cría ${i + 1}`} placeholder="Peso" className={cx(cls, "pr-9 tabular-nums", f[`cr_peso_${i}`] && "border-danger")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">kg</span>
            </div>
            <button type="button" aria-label={`Quitar cría ${i + 1}`} disabled={crias.length === 1} onClick={() => setCrias((xs) => xs.filter((_, j) => j !== i))} className="grid h-10 w-9 place-items-center rounded-[8px] text-muted hover:bg-base disabled:opacity-30">
              <IconClose size={16} />
            </button>
          </div>
        ))}
        {(f.crias || Object.keys(f).some((k) => k.startsWith("cr_"))) && <p className="text-[12.5px] font-medium text-danger">{f.crias ?? "Completá el sexo de cada cría."}</p>}
        {crias.length < 3 && (
          <button type="button" onClick={() => setCrias((xs) => [...xs, { key: Date.now(), viva: true, sexo: "" }])} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-campo hover:underline">
            <IconPlus size={16} /> Mellizos: agregar otra cría
          </button>
        )}
        <p className="text-[12.5px] text-muted">La categoría de cada cría sale de la especie y el sexo (ternero/a, bucerro/a); queda en el lote y potrero de la madre.</p>
      </div>
    </>
  );
}

const TIPOS_PRODUCTO_EVENTO: Record<string, string[]> = {
  "sanidad.vacunacion": ["vacuna"],
  "sanidad.desparasitacion": ["antiparasitario_interno", "antiparasitario_externo"],
  "sanidad.tratamiento": ["antibiotico", "hormona", "otro", "antiparasitario_interno", "antiparasitario_externo"],
};

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Vacunación, desparasitación y tratamiento (TPA-32): el producto sale del catálogo del
 * establecimiento y precarga vía, dosis declarada y retiro (editables: lo que vale es lo
 * que dice el marbete del envase usado). El retiro vigente lo calcula la API.
 */
function CamposAplicacion({ tipo, f, p, especie }: { tipo: string; f: Record<string, string>; p: RegistrarEventoProps; especie: string }) {
  const tipos = TIPOS_PRODUCTO_EVENTO[tipo] ?? [];
  const productos = (p.productos ?? []).filter((x) => tipos.includes(x.tipo) && (!especie || !x.especies.length || x.especies.includes(especie)));
  const inicial = p.tarea && p.tarea.tipo === tipo ? productos.find((x) => x.id === p.tarea?.productoId) : undefined;
  const [prodId, setProdId] = useState(inicial?.id ?? (productos.length === 1 ? productos[0].id : ""));
  const prod = productos.find((x) => x.id === prodId);
  const otro = prodId === "_otro";
  const [carne, setCarne] = useState(prod?.carne != null ? String(prod.carne) : "");
  const [fechaA, setFechaA] = useState(p.hoy);
  const enfermedadIni = (p.tarea?.tipo === tipo ? p.tarea.enfermedad : null) ?? prod?.enfermedades[0] ?? "";
  const nCarne = Number(carne);

  function elegir(id: string) {
    setProdId(id);
    const x = productos.find((y) => y.id === id);
    setCarne(x?.carne != null ? String(x.carne) : "");
  }

  const kp = prod?.id ?? (otro ? "otro" : "nada");
  return (
    <>
      <div className="sm:col-span-2">
        <Field
          label="Producto"
          htmlFor="producto_id"
          error={f.producto_id || f.producto_nombre}
          hint={productos.length ? undefined : <>No hay productos de este tipo en el catálogo. <Link href="/sanidad/productos" className="font-medium text-campo hover:underline">Cargalos acá</Link> o escribí el nombre.</>}
        >
          <Select id="producto_id" name="producto_id" value={prodId} onChange={(e) => elegir(e.target.value)} {...fieldAria("producto_id", f.producto_id)}>
            <option value="">Elegí del catálogo</option>
            {productos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
                {x.principio ? ` · ${x.principio}` : ""}
              </option>
            ))}
            <option value="_otro">Otro (no está en el catálogo)</option>
          </Select>
        </Field>
      </div>
      {otro || (!productos.length && !prodId) ? (
        <div className="sm:col-span-2">
          <Field label="Nombre del producto" htmlFor="producto_nombre" error={f.producto_nombre}>
            <Input id="producto_nombre" name="producto_nombre" maxLength={200} placeholder="Como figura en el envase" {...fieldAria("producto_nombre", f.producto_nombre)} />
          </Field>
        </div>
      ) : (
        <input type="hidden" name="producto_nombre" value={prod?.nombre ?? ""} />
      )}

      {tipo === "sanidad.vacunacion" && (
        <>
          <Field label="Enfermedad" htmlFor="enfermedad" error={f.enfermedad}>
            <Select key={`enf-${kp}`} id="enfermedad" name="enfermedad" defaultValue={enfermedadIni} {...fieldAria("enfermedad", f.enfermedad)}>
              <Opciones lista={p.enfermedades ?? []} vacio="Elegí" />
            </Select>
          </Field>
          <Field label="Dosis" htmlFor="numero_dosis" optional>
            <Select id="numero_dosis" name="numero_dosis" defaultValue="">
              <Opciones lista={NUMERO_DOSIS} vacio="Sin indicar" />
            </Select>
          </Field>
        </>
      )}
      {tipo === "sanidad.desparasitacion" && (
        <>
          <Field label="Tipo" htmlFor="tipo_desparasitacion" error={f.tipo_desparasitacion}>
            <Select key={`td-${kp}`} id="tipo_desparasitacion" name="tipo_desparasitacion" defaultValue={prod?.tipo === "antiparasitario_externo" ? "externo" : prod ? "interno" : ""} {...fieldAria("tipo_desparasitacion", f.tipo_desparasitacion)}>
              <Opciones lista={TIPOS_DESPARASITACION} vacio="Elegí" />
            </Select>
          </Field>
          <Field label="Principio activo" htmlFor="principio_activo" optional>
            <Input key={`pa-${kp}`} id="principio_activo" name="principio_activo" defaultValue={prod?.principio ?? ""} maxLength={120} />
          </Field>
          <Field label="Cómo se dosificó" htmlFor="metodo_dosificacion" optional>
            <Select id="metodo_dosificacion" name="metodo_dosificacion" defaultValue="">
              <Opciones lista={METODOS_DOSIFICACION} vacio="Sin indicar" />
            </Select>
          </Field>
          <Field label="Peso para dosificar" htmlFor="peso_dosificacion_kg" optional error={f.peso_dosificacion_kg} hint="El del más pesado, si se dosificó así.">
            <div className="relative">
              <Input id="peso_dosificacion_kg" name="peso_dosificacion_kg" inputMode="decimal" className="pr-10 tabular-nums" {...fieldAria("peso_dosificacion_kg", f.peso_dosificacion_kg, true)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">kg</span>
            </div>
          </Field>
        </>
      )}
      {tipo === "sanidad.tratamiento" && (
        <>
          <div className="sm:col-span-2">
            <Field label="Diagnóstico presuntivo" htmlFor="diagnostico_presuntivo" error={f.diagnostico_presuntivo}>
              <Input id="diagnostico_presuntivo" name="diagnostico_presuntivo" maxLength={200} placeholder="Ej. queratoconjuntivitis, pietín, neumonía" {...fieldAria("diagnostico_presuntivo", f.diagnostico_presuntivo)} />
            </Field>
          </div>
          <Field label="Días de tratamiento" htmlFor="duracion_dias" optional error={f.duracion_dias}>
            <Input id="duracion_dias" name="duracion_dias" inputMode="numeric" maxLength={3} className="tabular-nums" {...fieldAria("duracion_dias", f.duracion_dias)} />
          </Field>
          <Field label="Veterinario" htmlFor="veterinario" optional>
            <Input id="veterinario" name="veterinario" maxLength={200} />
          </Field>
        </>
      )}

      <Field label="Dosis aplicada" htmlFor="dosis_aplicada" optional hint={prod?.dosis ? `Declarada en el catálogo: ${prod.dosis}` : "La que indicó el veterinario o el marbete."}>
        <Input key={`dosis-${kp}`} id="dosis_aplicada" name="dosis_aplicada" defaultValue={prod?.dosis ?? ""} maxLength={200} />
      </Field>
      {tipo !== "sanidad.tratamiento" ? (
        <Field label="Vía" htmlFor="via" optional>
          <Select key={`via-${kp}`} id="via" name="via" defaultValue={prod?.via ?? ""}>
            <Opciones lista={VIAS} vacio="Sin indicar" />
          </Select>
        </Field>
      ) : (
        <span className="hidden sm:block" />
      )}

      {tipo === "sanidad.vacunacion" && (
        <>
          <Field label="Vacunador" htmlFor="vacunador" optional hint="Ej. vacunador de la fundación (FUCOSA).">
            <Input id="vacunador" name="vacunador" maxLength={200} />
          </Field>
          <Field label="Campaña" htmlFor="campana" optional>
            <Input id="campana" name="campana" maxLength={200} placeholder="Ej. 1.ª campaña 2026" />
          </Field>
          <Field label="Lote/serie del envase" htmlFor="envase_lote" optional>
            <Input id="envase_lote" name="envase_lote" maxLength={200} />
          </Field>
          <Field label="Vencimiento del envase" htmlFor="envase_vence" optional error={f.envase_vence}>
            <Input id="envase_vence" name="envase_vence" type="date" {...fieldAria("envase_vence", f.envase_vence)} />
          </Field>
        </>
      )}

      <fieldset className="sm:col-span-2 rounded-[10px] border border-border bg-base p-4">
        <legend className="px-1 text-[13px] font-semibold text-ink">Retiro</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Carne" htmlFor="retiro_carne_dias" optional error={f.retiro_carne_dias} hint={prod ? (prod.carne != null ? `Del catálogo: ${retiroTexto(prod.carne)}` : "El producto no tiene retiro cargado: copialo del marbete.") : undefined}>
            <div className="relative">
              <Input id="retiro_carne_dias" name="retiro_carne_dias" inputMode="numeric" maxLength={3} value={carne} onChange={(e) => setCarne(e.target.value.replace(/\D/g, ""))} className="pr-14 tabular-nums" {...fieldAria("retiro_carne_dias", f.retiro_carne_dias, !!prod)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">días</span>
            </div>
          </Field>
          <Field label="Leche" htmlFor="retiro_leche_dias" optional error={f.retiro_leche_dias}>
            <div className="relative">
              <Input key={`leche-${kp}`} id="retiro_leche_dias" name="retiro_leche_dias" inputMode="numeric" maxLength={3} defaultValue={prod?.leche ?? ""} className="pr-14 tabular-nums" {...fieldAria("retiro_leche_dias", f.retiro_leche_dias)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">días</span>
            </div>
          </Field>
        </div>
        <p className={cx("mt-3 flex gap-2 text-[13px]", nCarne > 0 ? "font-medium text-warning" : "text-muted")}>
          {nCarne > 0
            ? `No vender para faena hasta el ${fmtFecha(sumarDias(fechaA, nCarne))}: quedan con retiro vigente y TROPILLA avisa al ofertar o vender.`
            : "Sin retiro de carne: no quedan restricciones para vender."}
        </p>
        <FechaSync onChange={setFechaA} />
      </fieldset>
    </>
  );
}

/** Prueba diagnóstica: tuberculina con resultado calculado por umbrales del catálogo, o resultado declarado del laboratorio. */
function CamposPrueba({ f, p, n }: { f: Record<string, string>; p: RegistrarEventoProps; n: number }) {
  const pruebas = p.pruebas ?? [];
  const [codigo, setCodigo] = useState(pruebas[0]?.codigo ?? "");
  const [mm0, setMm0] = useState("");
  const [mm72, setMm72] = useState("");
  const t = pruebas.find((x) => x.codigo === codigo);
  const calculada = t?.metodo === "diferencia_mm";
  const c = calcularTuberculina(t, mm0, mm72);
  return (
    <>
      <Field label="Prueba" htmlFor="prueba" error={f.prueba}>
        <Select id="prueba" name="prueba" value={codigo} onChange={(e) => setCodigo(e.target.value)} {...fieldAria("prueba", f.prueba)}>
          {pruebas.map((x) => (
            <option key={x.codigo} value={x.codigo}>
              {x.nombre}
            </option>
          ))}
        </Select>
      </Field>
      {calculada ? (
        <div className="sm:col-span-2 grid gap-4 rounded-[10px] border border-border bg-base p-4 sm:grid-cols-3">
          <Field label="Lectura 0 h" htmlFor="lectura_0h_mm" error={f.lectura_0h_mm}>
            <div className="relative">
              <Input id="lectura_0h_mm" name="lectura_0h_mm" inputMode="decimal" value={mm0} onChange={(e) => setMm0(e.target.value)} className="pr-12 tabular-nums" {...fieldAria("lectura_0h_mm", f.lectura_0h_mm)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">mm</span>
            </div>
          </Field>
          <Field label="Lectura 72 h" htmlFor="lectura_72h_mm" error={f.lectura_72h_mm}>
            <div className="relative">
              <Input id="lectura_72h_mm" name="lectura_72h_mm" inputMode="decimal" value={mm72} onChange={(e) => setMm72(e.target.value)} className="pr-12 tabular-nums" {...fieldAria("lectura_72h_mm", f.lectura_72h_mm)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">mm</span>
            </div>
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">Resultado</p>
            {c ? (
              <Badge tone={RESULTADO_TONO[c.resultado]}>
                {RESULTADOS_PRUEBA.find(([k]) => k === c.resultado)?.[1]} · {c.diferencia.toLocaleString("es-AR")} mm
              </Badge>
            ) : (
              <p className="text-[13px] text-subtle">Cargá las dos lecturas</p>
            )}
          </div>
          <p className="sm:col-span-3 text-[12.5px] text-muted">
            Umbrales v{t?.version}: {umbralesTexto(t)}. {c?.resultado === "positivo" && <span className="font-semibold text-danger">Un positivo marca al animal como reactor (privado).</span>}
            {n > 1 && <span className="block font-medium text-warning">Cada animal tiene sus lecturas: para varios usá la lectura de tuberculina.</span>}
          </p>
        </div>
      ) : (
        <>
          <Field label="Resultado" htmlFor="resultado" error={f.resultado}>
            <Select id="resultado" name="resultado" defaultValue="" {...fieldAria("resultado", f.resultado)}>
              <Opciones lista={RESULTADOS_PRUEBA} vacio="Elegí" />
            </Select>
          </Field>
          <Field label="Laboratorio" htmlFor="laboratorio" optional>
            <Input id="laboratorio" name="laboratorio" maxLength={200} />
          </Field>
        </>
      )}
      <Field label="N.º de protocolo" htmlFor="protocolo_numero" optional>
        <Input id="protocolo_numero" name="protocolo_numero" maxLength={200} />
      </Field>
    </>
  );
}

/** TPA-35: antes de vender o faenar, avisar retiro vigente y reactores (no bloquea: la API pide confirmar). */
function AvisoVenta({ animales, lote }: { animales: AnimalElegido[]; lote?: LoteOpt }) {
  const conRetiro = animales.filter((a) => a.retiro);
  const reactores = animales.filter((a) => a.reactor);
  const loteRetiro = lote?.retiroHasta && lote.retiroHasta >= new Date().toISOString().slice(0, 10) ? lote.retiroHasta : null;
  if (!conRetiro.length && !reactores.length && !loteRetiro) return null;
  return (
    <div className="space-y-2 border-b border-border px-5 py-4">
      {(conRetiro.length > 0 || loteRetiro) && (
        <div role="alert" className="flex gap-3 rounded-[10px] border border-warning-border bg-warning-bg px-4 py-3 text-[14px] text-warning">
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            <span className="block font-semibold">
              {loteRetiro ? `El lote tiene retiro vigente hasta el ${fmtFecha(loteRetiro)}` : `${conRetiro.map((a) => a.ident).join(", ")} ${conRetiro.length === 1 ? "tiene" : "tienen"} retiro vigente`}
            </span>
            No se pueden faenar ni vender para faena hasta que termine el retiro. Si es una venta para invernada, aclaralo en las observaciones.
          </span>
        </div>
      )}
      {reactores.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-[10px] border border-danger-border bg-danger-bg px-4 py-3 text-[14px] text-danger">
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            <span className="block font-semibold">
              {reactores.map((a) => a.ident).join(", ")} {reactores.length === 1 ? "es reactor" : "son reactores"}
            </span>
            Consultá con tu veterinario el destino que corresponde antes de venderlo. El dato es privado: no se muestra al comprador.
          </span>
        </div>
      )}
    </div>
  );
}
