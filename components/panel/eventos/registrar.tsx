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
  METODOS_CASTRACION,
  MOTIVOS_EGRESO,
  MOTIVOS_INGRESO,
  TIPOS_HACIENDA,
  TIPOS_PERDIDA,
  tipoHacienda,
} from "@/lib/eventos-hacienda";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { ChoiceChip } from "@/components/choice";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Spinner, Textarea, buttonClass, cx, fieldAria } from "@/components/ui";
import { IconArrowLeft, IconClose, IconPlus, IconSearch } from "@/components/icons";

type Opt = { codigo: string; nombre: string };
export type CategoriaOpt = Opt & { especie: string; sexo?: string | null };
export type LoteOpt = { id: string; nombre: string; especie: string; anonimo: boolean; conteo: Record<string, number> };

export interface RegistrarEventoProps {
  /** Qué tipos ofrece el selector (Hacienda o Reproducción). */
  modulo?: "hacienda" | "reproduccion";
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
  hoy: string;
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
  const [tipo, setTipo] = useState(p.tipoInicial && tipoHacienda(p.tipoInicial) && !tipoHacienda(p.tipoInicial)?.redirige ? p.tipoInicial : "");
  const meta = tipoHacienda(tipo);
  const [sujeto, setSujeto] = useState<"animales" | "lote">(p.loteInicial && !p.animalesIniciales.length ? "lote" : "animales");
  const [animales, setAnimales] = useState<AnimalElegido[]>(p.animalesIniciales);
  const [loteId, setLoteId] = useState(p.loteInicial ?? "");
  const [busca, setBusca] = useState("");
  const [buscaErr, setBuscaErr] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([{ key: 0, especie: "BOV", sexo: "", categoria: "" }]);
  const [causa, setCausa] = useState("");
  const [madre, setMadre] = useState<AnimalElegido | null>(null);
  const [toros, setToros] = useState<AnimalElegido[]>([]);

  const sujetoEfectivo = meta && !meta.sujetos.includes(sujeto) ? meta.sujetos[0] : sujeto;
  const creaAnimales = sujetoEfectivo === "animales" && (tipo === "hacienda.ingreso" || tipo === "hacienda.nacimiento");
  const lote = p.lotes.find((l) => l.id === loteId);
  const conConteo = sujetoEfectivo === "lote" && ["hacienda.ingreso", "hacienda.nacimiento", "hacienda.egreso", "hacienda.muerte", "hacienda.perdida", "hacienda.faena"].includes(tipo);
  const especieSel = animales[0]?.especie ?? lote?.especie ?? "";

  async function sumar(valor: string, destino: "animales" | "madre" | "toros" = "animales") {
    if (!valor.trim()) return;
    setBuscando(true);
    setBuscaErr("");
    const r = await buscarAnimalAction(valor);
    setBuscando(false);
    if (!r.animal) return setBuscaErr(r.error ?? "No lo encontramos.");
    if (destino === "madre") return setMadre(r.animal);
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
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="sujeto" value={sujetoEfectivo} />
      {sujetoEfectivo === "animales" && !creaAnimales && animales.map((a) => <input key={a.id} type="hidden" name="animal_id" value={a.id} />)}
      {madre && <input type="hidden" name="madre_id" value={madre.id} />}
      {tipo === "reproduccion.servicio_natural" && toros.map((t) => <input key={t.id} type="hidden" name="toro_id" value={t.id} />)}

      <div className="min-w-0 space-y-4">
        {/* 1. Qué pasó */}
        <Card className="overflow-hidden">
          <CardHeader title={<Paso n={1}>¿Qué pasó?</Paso>} description={meta ? meta.ayuda : p.modulo === "reproduccion" ? "Elegí el evento. Las hembras que cargues actualizan su estado reproductivo y el calendario de partos." : "Elegí el evento. Las identificaciones se cargan en la ficha del animal."} action={meta ? <button type="button" onClick={() => setTipo("")} className="text-[13px] font-medium text-campo hover:underline">Cambiar</button> : undefined} />
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
                description={creaAnimales ? "Una fila por animal. La caravana es opcional pero conviene: después se busca por ahí." : sujetoEfectivo === "lote" ? "El evento se registra sobre el lote y lo heredan los animales que después se caravaneen." : "Buscá por caravana, RFID o tatuaje. Podés sumar varios."}
                action={
                  meta.sujetos.length > 1 ? (
                    <div role="radiogroup" aria-label="Sujeto del evento" className="flex gap-2">
                      {meta.sujetos.map((s) => (
                        <ChoiceChip key={s} type="radio" name="_sujeto" label={s === "lote" ? "Un lote" : tipo === "hacienda.ingreso" || tipo === "hacienda.nacimiento" ? "Con caravana" : "Animales"} checked={sujetoEfectivo === s} onChange={() => setSujeto(s)} className="h-9 px-3.5 text-[13.5px]" />
                      ))}
                    </div>
                  ) : undefined
                }
              />
              <div className="px-5 py-4">
                {sujetoEfectivo === "lote" ? (
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
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <Field label={tipo === "reproduccion.servicio_natural" ? "Inicio del servicio" : "Fecha"} htmlFor="ocurrido_en" error={f.ocurrido_en}>
                  <Input id="ocurrido_en" name="ocurrido_en" type="date" defaultValue={p.hoy} max={p.hoy} {...fieldAria("ocurrido_en", f.ocurrido_en)} />
                </Field>
                <CamposTipo tipo={tipo} f={f} p={p} causa={causa} setCausa={setCausa} especie={especieSel} madre={madre} setMadre={setMadre} sumar={sumar} buscando={buscando} creaAnimales={creaAnimales} toros={toros} setToros={setToros} buscaErr={buscaErr} />
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
              ) : sujetoEfectivo === "lote" ? (
                lote?.nombre ?? <span className="text-subtle">Elegí un lote</span>
              ) : creaAnimales ? (
                `${filas.length} ${filas.length === 1 ? "animal nuevo" : "animales nuevos"}`
              ) : (
                `${animales.length} ${animales.length === 1 ? "animal" : "animales"}`
              )}
            </Linea>
          </dl>
          <div className="space-y-3 border-t border-border px-5 py-4">
            <FormAlerts state={state} pending={pending} />
            <Button type="submit" className="w-full" disabled={!meta || pending} icon={pending ? <Spinner /> : undefined}>
              Registrar evento
            </Button>
            <p className="text-[12.5px] leading-snug text-muted">Queda en la historia con tu nombre, rol y huella. No se borra: si te equivocás, se corrige o se anula con motivo.</p>
          </div>
        </Card>
        <Link href={p.modulo === "reproduccion" ? "/reproduccion" : "/hacienda/eventos"} className={buttonClass("ghost", "sm")}>
          <IconArrowLeft size={16} /> {p.modulo === "reproduccion" ? "Volver a Reproducción" : "Volver al registro"}
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
          <select name={`n_especie_${i}`} aria-label={`Especie fila ${i + 1}`} value={r.especie} onChange={(e) => set(i, "especie", e.target.value)} className={cx(cls, "border-border-strong")}>
            <option value="BOV">Bovino</option>
            <option value="BUB">Bubalino</option>
          </select>
          <select name={`n_sexo_${i}`} aria-label={`Sexo fila ${i + 1}`} value={r.sexo} onChange={(e) => set(i, "sexo", e.target.value)} className={cx(cls, err(`n_sexo_${i}`))}>
            <option value="">Sexo</option>
            <option value="H">Hembra</option>
            <option value="M">Macho</option>
          </select>
          <select name={`n_categoria_${i}`} aria-label={`Categoría fila ${i + 1}`} value={r.categoria} onChange={(e) => set(i, "categoria", e.target.value)} className={cx(cls, err(`n_categoria_${i}`))}>
            <option value="">Categoría</option>
            {categorias
              .filter((c) => c.especie === r.especie && (!r.sexo || !c.sexo || c.sexo === r.sexo))
              .map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
          </select>
          <select name={`n_raza_${i}`} aria-label={`Raza fila ${i + 1}`} defaultValue="" className={cx(cls, "border-border-strong")}>
            <option value="">Raza</option>
            {razas
              .filter((z) => z.especie === r.especie)
              .map((z) => (
                <option key={z.codigo} value={z.codigo}>
                  {z.nombre}
                </option>
              ))}
          </select>
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
  sumar,
  buscando,
  creaAnimales,
  toros,
  setToros,
  buscaErr,
}: {
  tipo: string;
  f: Record<string, string>;
  p: RegistrarEventoProps;
  causa: string;
  setCausa: (s: string) => void;
  especie: string;
  madre: AnimalElegido | null;
  setMadre: (a: AnimalElegido | null) => void;
  sumar: (v: string, d?: "animales" | "madre" | "toros") => Promise<void>;
  buscando: boolean;
  creaAnimales: boolean;
  toros: AnimalElegido[];
  setToros: (fn: (xs: AnimalElegido[]) => AnimalElegido[]) => void;
  buscaErr: string;
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
    case "reproduccion.inseminacion":
      return (
        <>
          {sel("tipo_ia", "Tipo", TIPOS_IA)}
          {txt("toro_nombre", "Toro (semen)", { placeholder: "Nombre o código de la pajuela" })}
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
