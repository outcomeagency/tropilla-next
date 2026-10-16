"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { cambioLoteGrupalAction, trasladoGrupalAction, type EventoState } from "@/lib/hacienda-actions";
import { IconAlert, IconChevronRight, IconClose, IconMap, IconRoute } from "@/components/icons";
import { Badge, Button, Field, Input, Notice, Select, SpeciesChip, Spinner, cx } from "@/components/ui";
import type { Especie } from "@/lib/types";

export interface FilaAnimal {
  id: string;
  ident: string;
  especie: Especie;
  sexo: string;
  categoria: string;
  sugerida?: string | null;
  raza?: string | null;
  edad?: string;
  peso?: string;
  pesoFecha?: string;
  lote?: string;
  potrero?: string;
  repro?: { label: string; tone: "success" | "warning" | "neutral" | "info" } | null;
  retiro: boolean;
}

export interface LoteOpcion {
  id: string;
  nombre: string;
  especie: Especie;
}

/**
 * Tabla del rodeo con selección múltiple (TPA-18). La selección habilita
 * eventos grupales sin salir del listado: traslado de potrero y, si se pasan
 * `lotes`, cambio de lote (TPA-20; sólo lotes de la misma especie).
 */
export function HaciendaTabla({
  filas,
  potreros,
  lotes,
  loteActual,
  puedeCargar,
  hoy,
}: {
  filas: FilaAnimal[];
  potreros: Array<{ id: string; nombre: string }>;
  lotes?: LoteOpcion[];
  /** En la ficha de un lote: no se ofrece como destino. */
  loteActual?: string;
  puedeCargar: boolean;
  hoy: string;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<null | "traslado" | "lote">(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [stTraslado, accionTraslado, pendTraslado] = useActionState(trasladoGrupalAction, {} as EventoState);
  const [stLote, accionLote, pendLote] = useActionState(cambioLoteGrupalAction, {} as EventoState);
  const [idem, setIdem] = useState(() => crypto.randomUUID());
  const [ultimo, setUltimo] = useState<"traslado" | "lote">("traslado");
  const todos = filas.length > 0 && filas.every((f) => sel.has(f.id));
  const esLote = modal === "lote";
  const state = (modal ?? ultimo) === "lote" ? stLote : stTraslado;
  const action = esLote ? accionLote : accionTraslado;
  const pending = esLote ? pendLote : pendTraslado;

  const especiesSel = new Set(filas.filter((f) => sel.has(f.id)).map((f) => f.especie));
  const mezcla = especiesSel.size > 1;
  const destinos = (lotes ?? []).filter((l) => l.id !== loteActual && especiesSel.has(l.especie));

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (modal && !d.open) d.showModal();
    if (!modal && d.open) d.close();
  }, [modal]);

  const [prevOk, setPrevOk] = useState<[EventoState["ok"], EventoState["ok"]]>([stTraslado.ok, stLote.ok]);
  if (stTraslado.ok !== prevOk[0] || stLote.ok !== prevOk[1]) {
    const cual = stLote.ok !== prevOk[1] ? "lote" : "traslado";
    setPrevOk([stTraslado.ok, stLote.ok]);
    if ((cual === "lote" ? stLote : stTraslado).ok) {
      setUltimo(cual);
      setSel(new Set());
      setModal(null);
      setIdem(crypto.randomUUID());
    }
  }

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <>
      {!modal && state.ok && (
        <div className="border-b border-border px-5 py-3">
          <Notice
            tone="success"
            title={`${ultimo === "lote" ? "Cambio de lote" : "Traslado"} registrado para ${state.ok.cantidad} ${state.ok.cantidad === 1 ? "animal" : "animales"}`}
          >
            Quedó en el historial de cada animal, con autor y huella.
          </Notice>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left text-[14px]">
          <thead>
            <tr>
              <th scope="col" className="w-10 border-b border-border py-2.5 pl-5 pr-2">
                {puedeCargar && (
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los animales de esta página"
                    checked={todos}
                    onChange={() => setSel(todos ? new Set() : new Set(filas.map((f) => f.id)))}
                    className="h-4 w-4 accent-monte"
                  />
                )}
              </th>
              {["Identificación", "Especie", "Categoría", "Edad", "Peso", "Lote · potrero", "Reproducción", "Sanidad", ""].map((h, i) => (
                <th
                  key={h || i}
                  scope="col"
                  className={cx("border-b border-border px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted", (h === "Peso" || h === "Edad") && "text-right")}
                >
                  {h || <span className="sr-only">Abrir</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const marcado = sel.has(f.id);
              return (
                <tr key={f.id} className={cx("transition-colors hover:bg-surface-2 [&:last-child>td]:border-b-0", marcado && "bg-campo-50 hover:bg-campo-50")}>
                  <td className="border-b border-border py-2.5 pl-5 pr-2">
                    {puedeCargar && (
                      <input type="checkbox" aria-label={`Seleccionar ${f.ident}`} checked={marcado} onChange={() => toggle(f.id)} className="h-4 w-4 accent-monte" />
                    )}
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <Link href={`/hacienda/${f.id}`} className="font-semibold tabular-nums text-ink hover:text-campo hover:underline">
                      {f.ident}
                    </Link>
                    <span className="block whitespace-nowrap text-[12px] text-muted">{[f.sexo, f.raza].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <SpeciesChip especie={f.especie} />
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <span className="text-ink">{f.categoria}</span>
                    {f.sugerida && (
                      <span className="mt-0.5 block">
                        <Badge tone="success">→ {f.sugerida} sugerida</Badge>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-border px-3 py-2.5 text-right tabular-nums text-ink">{f.edad || "—"}</td>
                  <td className="whitespace-nowrap border-b border-border px-3 py-2.5 text-right tabular-nums">
                    {f.peso ? (
                      <>
                        <span className="text-ink">{f.peso} kg</span>
                        <span className="block text-[12px] text-muted">{f.pesoFecha}</span>
                      </>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <span className="block max-w-[220px] truncate text-ink" title={f.lote}>
                      {f.lote ?? "Sin lote"}
                    </span>
                    {f.potrero && <span className="block text-[12px] text-muted">{f.potrero}</span>}
                  </td>
                  <td className="border-b border-border px-3 py-2.5">{f.repro ? <Badge tone={f.repro.tone}>{f.repro.label}</Badge> : <span className="text-subtle">—</span>}</td>
                  <td className="border-b border-border px-3 py-2.5">
                    {f.retiro ? (
                      <Badge tone="warning" icon={<IconAlert size={14} />}>
                        Retiro vigente
                      </Badge>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="w-10 border-b border-border px-3 py-2.5 text-right">
                    <Link
                      href={`/hacienda/${f.id}`}
                      aria-label={`Abrir ficha de ${f.ident}`}
                      className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-control)] text-subtle hover:bg-surface-2 hover:text-ink"
                    >
                      <IconChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sel.size > 0 && (
        <div className="sticky bottom-4 z-20 mx-4 mb-4 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-monte px-4 py-3 text-blanco shadow-[0_6px_20px_rgb(22_63_46/0.25)]">
          <p className="text-[14px] font-semibold">
            <span className="tabular-nums">{sel.size}</span> {sel.size === 1 ? "animal seleccionado" : "animales seleccionados"}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSel(new Set())} className="h-9 rounded-[8px] px-3 text-[13px] font-medium text-sidebar-muted hover:text-blanco">
              Limpiar
            </button>
            {lotes && (
              <button type="button" onClick={() => setModal("lote")} className="inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-[13px] font-semibold text-blanco ring-1 ring-sidebar-muted/50 hover:bg-monte-700">
                <IconRoute size={16} /> Cambiar de lote
              </button>
            )}
            <button type="button" onClick={() => setModal("traslado")} className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-crema px-3 text-[13px] font-semibold text-monte hover:bg-surface">
              <IconMap size={16} /> Trasladar de potrero
            </button>
          </div>
        </div>
      )}

      <dialog
        ref={dialog}
        onClose={() => setModal(null)}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-[var(--radius-card)] border border-border bg-surface p-0 text-ink backdrop:bg-carbon/40"
      >
        <form action={action}>
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[17px] font-semibold">
              {esLote ? "Cambiar de lote" : "Trasladar"} {sel.size} {sel.size === 1 ? "animal" : "animales"}
            </h2>
            <button type="button" onClick={() => setModal(null)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-[8px] text-muted hover:bg-surface-2">
              <IconClose size={18} />
            </button>
          </header>
          <div className="space-y-4 px-5 py-4">
            {[...sel].map((id) => (
              <input key={id} type="hidden" name="animal_ids" value={id} />
            ))}
            <input type="hidden" name="idem" value={idem} />
            {state.error && <Notice tone="danger" title={state.error} />}
            {state.advertencias && (
              <Notice tone="warning" title="Revisá antes de guardar">
                <ul className="list-disc pl-4">
                  {state.advertencias.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                <input type="hidden" name="confirmar" value="1" />
              </Notice>
            )}
            {esLote ? (
              mezcla ? (
                <Notice tone="warning" title="Elegiste bovinos y bubalinos juntos">
                  Un lote no mezcla especies: cambiá de lote una especie por vez.
                </Notice>
              ) : destinos.length ? (
                <Field label="Lote de destino" htmlFor="lote_destino_id" hint="Sólo lotes de la misma especie. El animal deja su lote actual.">
                  <Select key="lote" id="lote_destino_id" name="lote_destino_id" defaultValue="">
                    <option value="" disabled>
                      Elegí el lote
                    </option>
                    {destinos.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Notice tone="info" title="No hay otro lote de esta especie">
                  <Link href="/hacienda/lotes/nuevo" className="font-semibold underline">
                    Creá un lote
                  </Link>{" "}
                  y volvé a elegir los animales.
                </Notice>
              )
            ) : (
              <Field label="Potrero de destino" htmlFor="potrero_destino_id">
                <Select key="potrero" id="potrero_destino_id" name="potrero_destino_id" defaultValue="">
                  <option value="" disabled>
                    Elegí el potrero
                  </option>
                  {potreros.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Fecha" htmlFor="ocurrido_en">
              <Input id="ocurrido_en" name="ocurrido_en" type="date" defaultValue={hoy} max={hoy} />
            </Field>
            <Field label="Observaciones" htmlFor="observaciones" optional>
              <Input id="observaciones" name="observaciones" placeholder={esLote ? "Ej. separadas para servicio" : "Ej. por anegamiento del bajo"} />
            </Field>
          </div>
          <footer className="flex justify-end gap-2 border-t border-border bg-base px-5 py-3">
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || (esLote && (mezcla || !destinos.length))} icon={pending ? <Spinner /> : undefined}>
              {state.advertencias ? "Guardar igual" : esLote ? "Registrar cambio de lote" : "Registrar traslado"}
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
