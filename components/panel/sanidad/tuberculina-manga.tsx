"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { buscarAnimalAction, type AnimalElegido } from "@/lib/evento-actions";
import { registrarTuberculinasAction } from "@/lib/tuberculina-actions";
import type { PesadaState } from "@/lib/pesaje-actions";
import { RESULTADO_TONO, calcularTuberculina, umbralesTexto, type TipoPrueba } from "@/lib/tuberculina";
import { uuidv7 } from "@/lib/uuid";
import { ChoiceChip } from "@/components/choice";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, Spinner, cx, fieldAria, inputClass } from "@/components/ui";
import { IconAlert, IconClose, IconInfo, IconShield } from "@/components/icons";

type Fila = { key: string; busca: string; animal: AnimalElegido | null; mm0: string; mm72: string; err?: string; buscando?: boolean };
const nueva = (): Fila => ({ key: uuidv7(), busca: "", animal: null, mm0: "", mm72: "" });
const RES_LABEL = { negativo: "Negativo", sospechoso: "Sospechoso", positivo: "Positivo", no_concluyente: "No concluyente" } as const;

/**
 * Lectura de tuberculina en la manga (TPA-34): caravana ↵ · mm a 0 h ↵ · mm a 72 h ↵.
 * El resultado sale en vivo de los umbrales del catálogo; los positivos se confirman
 * antes de guardar porque marcan al animal como reactor (dato privado).
 */
export function TuberculinaManga({ hoy, pruebas }: { hoy: string; pruebas: TipoPrueba[] }) {
  const [state, action, pending] = useActionState<PesadaState, FormData>(registrarTuberculinasAction, {});
  const [filas, setFilas] = useState<Fila[]>(() => [nueva()]);
  const [fecha, setFecha] = useState(hoy);
  const [codigo, setCodigo] = useState(pruebas[0]?.codigo ?? "");
  const [confirmo, setConfirmo] = useState(false);
  const refs = useRef(new Map<string, HTMLInputElement | null>());
  const [visto, setVisto] = useState<number | undefined>(undefined);
  const prueba = pruebas.find((p) => p.codigo === codigo);

  if (state.ts && state.ts !== visto) {
    setVisto(state.ts);
    const ok = new Set(state.guardadas ?? []);
    setFilas([...filas.filter((f) => !ok.has(f.key) && (f.animal || f.busca)), nueva()]);
    setConfirmo(false);
  }

  const foco = (key: string, campo: "busca" | "mm0" | "mm72") => setTimeout(() => refs.current.get(`${campo}:${key}`)?.focus(), 0);
  const set = (key: string, c: Partial<Fila>) => setFilas((xs) => xs.map((f) => (f.key === key ? { ...f, ...c } : f)));
  const siguiente = (f: Fila) => {
    const i = filas.findIndex((x) => x.key === f.key);
    if (i === filas.length - 1) {
      const n = nueva();
      setFilas((xs) => [...xs, n]);
      foco(n.key, "busca");
    } else foco(filas[i + 1].key, "busca");
  };

  async function buscar(f: Fila) {
    const v = f.busca.trim();
    if (!v) return;
    if (filas.some((o) => o.key !== f.key && o.animal?.ident.toUpperCase() === v.toUpperCase())) return set(f.key, { err: "Ya está en la sesión." });
    set(f.key, { buscando: true, err: undefined });
    const r = await buscarAnimalAction(v);
    if (!r.animal) return set(f.key, { buscando: false, animal: null, err: r.error });
    if (r.animal.estado && r.animal.estado !== "activo") return set(f.key, { buscando: false, animal: null, err: `${r.animal.ident} figura como ${r.animal.estado}.` });
    set(f.key, { buscando: false, animal: r.animal, busca: r.animal.ident });
    foco(f.key, "mm0");
  }

  const calc = (f: Fila) => calcularTuberculina(prueba, f.mm0, f.mm72);
  const listas = filas.filter((f) => f.animal && calc(f));
  const avisos = state.avisos ?? {};
  const conAviso = listas.filter((f) => avisos[f.key]);
  const cuenta = { negativo: 0, sospechoso: 0, positivo: 0 };
  for (const f of listas) {
    const r = calc(f)!.resultado;
    if (r in cuenta) cuenta[r as keyof typeof cuenta]++;
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("filas", JSON.stringify(listas.map((f) => ({ key: f.key, animal_id: f.animal!.id, mm0: f.mm0, mm72: f.mm72 }))));
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (sub?.value === "confirmar") for (const f of conAviso) fd.append("confirmar_key", f.key);
    startTransition(() => action(fd));
  }

  const mmInput = (f: Fila, campo: "mm0" | "mm72", i: number) => (
    <input
      ref={(el) => {
        refs.current.set(`${campo}:${f.key}`, el);
      }}
      aria-label={`${campo === "mm0" ? "Lectura a 0 h" : "Lectura a 72 h"} fila ${i + 1}`}
      inputMode="decimal"
      maxLength={5}
      disabled={!f.animal}
      value={f[campo]}
      onChange={(e) => set(f.key, { [campo]: e.target.value.replace(/[^\d.,]/g, "") })}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (campo === "mm0") foco(f.key, "mm72");
          else if (calc(f)) siguiente(f);
        }
      }}
      className={cx(inputClass, "h-10 text-right font-semibold tabular-nums disabled:bg-base")}
    />
  );

  return (
    <form onSubmit={enviar} noValidate>
      <Card className="overflow-hidden">
        <CardHeader title="Planilla de lectura" description="Caravana ↵ · espesor del pliegue a 0 h ↵ · a 72 h ↵. Se guarda una prueba por animal." />
        <div className="grid gap-4 border-b border-border bg-base px-5 py-4 lg:grid-cols-[180px_auto_minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Fecha de la lectura" htmlFor="ocurrido_en" error={state.fields?.ocurrido_en}>
            <Input id="ocurrido_en" name="ocurrido_en" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} {...fieldAria("ocurrido_en", state.fields?.ocurrido_en)} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">Prueba</legend>
            <div className="flex flex-wrap gap-2">
              {pruebas.map((p) => (
                <ChoiceChip key={p.codigo} type="radio" name="prueba" value={p.codigo} label={p.nombre.replace(/^Tuberculina /, "")} checked={codigo === p.codigo} onChange={() => setCodigo(p.codigo)} />
              ))}
            </div>
          </fieldset>
          <Field label="Veterinario" htmlFor="veterinario" optional>
            <Input id="veterinario" name="veterinario" maxLength={200} placeholder="Quién leyó la prueba" />
          </Field>
          <Field label="N.º de protocolo" htmlFor="protocolo_numero" optional>
            <Input id="protocolo_numero" name="protocolo_numero" maxLength={200} />
          </Field>
        </div>
        {prueba && (
          <p className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5 text-[12.5px] text-muted">
            <IconInfo size={14} className="shrink-0" /> Umbrales del catálogo (v{prueba.version}): {umbralesTexto(prueba)}.
            {!prueba.validadoPorVet && <span className="font-medium text-warning">Todavía no validados por un veterinario: confirmalos con el tuyo.</span>}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                <th className="w-[44px] border-b border-border py-2.5 pl-5 pr-2">#</th>
                <th className="w-[180px] border-b border-border px-2 py-2.5">Caravana</th>
                <th className="border-b border-border px-2 py-2.5">Animal</th>
                <th className="w-[110px] border-b border-border px-2 py-2.5 text-right">0 h (mm)</th>
                <th className="w-[110px] border-b border-border px-2 py-2.5 text-right">72 h (mm)</th>
                <th className="w-[100px] border-b border-border px-2 py-2.5 text-right">Diferencia</th>
                <th className="w-[150px] border-b border-border px-2 py-2.5">Resultado</th>
                <th className="w-[52px] border-b border-border py-2.5 pr-5" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const c = f.animal ? calc(f) : null;
                const err = state.errores?.[f.key] ?? f.err;
                const aviso = avisos[f.key];
                return (
                  <tr key={f.key} className={cx("align-top", c?.resultado === "positivo" && "bg-danger-bg/40", aviso && "bg-warning-bg/50")}>
                    <td className="border-b border-border py-3 pl-5 pr-2 tabular-nums text-muted">{i + 1}</td>
                    <td className="border-b border-border px-2 py-2">
                      <div className="relative">
                        <input
                          ref={(el) => {
                            refs.current.set(`busca:${f.key}`, el);
                          }}
                          aria-label={`Caravana fila ${i + 1}`}
                          value={f.busca}
                          placeholder="0142"
                          onChange={(e) => set(f.key, { busca: e.target.value, animal: null, err: undefined })}
                          onBlur={() => f.busca && !f.animal && void buscar(f)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (f.animal) foco(f.key, "mm0");
                              else void buscar(f);
                            }
                          }}
                          className={cx(inputClass, "h-10 tabular-nums")}
                        />
                        {f.buscando && (
                          <span className="absolute right-3 top-3">
                            <Spinner />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-border px-2 py-3">
                      {f.animal ? (
                        <span className="font-medium text-ink">
                          {f.animal.categoria} <span className="font-normal text-muted">· {f.animal.especie === "BUB" ? "Bubalino" : "Bovino"}</span>
                        </span>
                      ) : err ? (
                        <span className="text-[13px] font-medium text-danger">{err}</span>
                      ) : (
                        <span className="text-[13px] text-subtle">—</span>
                      )}
                      {f.animal && err && <span className="block text-[12.5px] font-medium text-danger">{err}</span>}
                      {aviso && (
                        <span className="mt-1 flex items-start gap-1.5 text-[12.5px] font-medium text-warning">
                          <IconAlert size={14} className="mt-0.5 shrink-0" /> {aviso.join(" ")}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-border px-2 py-2">{mmInput(f, "mm0", i)}</td>
                    <td className="border-b border-border px-2 py-2">{mmInput(f, "mm72", i)}</td>
                    <td className="border-b border-border px-2 py-3 text-right font-semibold tabular-nums">{c ? `${c.diferencia.toLocaleString("es-AR")} mm` : <span className="font-normal text-subtle">—</span>}</td>
                    <td className="border-b border-border px-2 py-2.5">
                      {c ? (
                        <Badge tone={RESULTADO_TONO[c.resultado]} icon={c.resultado === "positivo" ? <IconAlert size={14} /> : undefined}>
                          {RES_LABEL[c.resultado]}
                        </Badge>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="border-b border-border py-2 pr-5 text-right">
                      {(f.animal || f.busca) && (
                        <button
                          type="button"
                          aria-label={`Quitar fila ${i + 1}`}
                          onClick={() => setFilas((xs) => (xs.length === 1 ? [nueva()] : xs.filter((x) => x.key !== f.key)))}
                          className="grid h-10 w-9 place-items-center rounded-[8px] text-muted hover:bg-base hover:text-ink"
                        >
                          <IconClose size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 px-5 py-4">
          {(state.total ?? 0) > 0 && !pending && (
            <Notice tone="success" title={`${state.total} ${state.total === 1 ? "prueba guardada" : "pruebas guardadas"} en esta sesión.`}>
              Quedaron en la ficha de cada animal. Si hubo positivos, figuran como reactores en Sanidad (privado: nunca se publican).
            </Notice>
          )}
          {state.error && <Notice tone="danger" title={state.error} />}
          {cuenta.positivo > 0 && (
            <label className={cx("flex cursor-pointer gap-3 rounded-[12px] border px-4 py-3", state.fields?.confirmo_positivos ? "border-danger bg-danger-bg" : "border-danger-border bg-danger-bg")}>
              <input type="checkbox" name="confirmo_positivos" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-monte" />
              <span className="text-[14px] text-ink">
                <span className="block font-semibold text-danger">
                  Confirmo {cuenta.positivo === 1 ? "el positivo" : `los ${cuenta.positivo} positivos`}: {cuenta.positivo === 1 ? "pasa" : "pasan"} a reactores
                </span>
                <span className="text-[13px] text-muted">Revisá las lecturas con el veterinario. El dato queda privado y TROPILLA avisa si se intenta vender u ofertar al animal.</span>
              </span>
            </label>
          )}
          {conAviso.length > 0 && <Notice tone="warning" title="Algunas pruebas quedaron sin guardar: revisá los avisos de las filas." />}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-2 text-[14px] text-muted">
              {listas.length ? (
                <>
                  <span className="font-semibold tabular-nums text-ink">{listas.length}</span> {listas.length === 1 ? "animal" : "animales"}:
                  <Badge tone="success">{cuenta.negativo} neg.</Badge>
                  {cuenta.sospechoso > 0 && <Badge tone="warning">{cuenta.sospechoso} sosp.</Badge>}
                  {cuenta.positivo > 0 && <Badge tone="danger">{cuenta.positivo} pos.</Badge>}
                </>
              ) : (
                "Cargá caravana y las dos lecturas para empezar."
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {conAviso.length > 0 && (
                <Button type="submit" name="modo" value="confirmar" variant="outline" disabled={pending}>
                  Guardar igual
                </Button>
              )}
              <Button type="submit" disabled={pending || !listas.length || (cuenta.positivo > 0 && !confirmo)} icon={pending ? <Spinner /> : <IconShield size={18} />}>
                Guardar {listas.length > 1 ? `${listas.length} pruebas` : "prueba"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </form>
  );
}
