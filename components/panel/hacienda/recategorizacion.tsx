"use client";

import Link from "next/link";
import { startTransition, useState, type FormEvent } from "react";
import { confirmarRecategorizacionAction, descartarSugerenciasAction } from "@/lib/hacienda-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { Badge, Button, Card, SpeciesChip, Spinner, cx, inputClass } from "@/components/ui";
import { IconArrowRight, IconCheck } from "@/components/icons";
import type { Especie } from "@/lib/types";

export interface GrupoRecat {
  key: string;
  de: string;
  a: string;
  aCodigo: string;
  motivo: string;
  especie: Especie;
  animales: Array<{ id: string; ident: string; edad: string; lote?: string | null; peso?: string | null; detalle?: string | null }>;
}

/**
 * Sugerencias de recategorización agrupadas por cambio (TPA-25): todo
 * marcado por defecto, se destilda lo que no corresponde y se confirma en
 * bloque. Cada confirmación es un evento con autor y fecha.
 */
export function Recategorizacion({ grupos, hoy }: { grupos: GrupoRecat[]; hoy: string }) {
  const { state, formAction, pending } = useActionForm(confirmarRecategorizacionAction);
  const descarte = useActionForm(descartarSugerenciasAction);
  const [sel, setSel] = useState(() => new Set(grupos.flatMap((g) => g.animales.map((a) => a.id))));
  const [fecha, setFecha] = useState(hoy);
  const [descartar, setDescartar] = useState<Array<{ animal_id: string; categoria: string }> | null>(null);
  const toggle = (id: string) => setSel((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))));
  const grupoTodo = (g: GrupoRecat) => g.animales.every((a) => sel.has(a.id));
  const toggleGrupo = (g: GrupoRecat) =>
    setSel((s) => {
      const n = new Set(s);
      const todo = g.animales.every((a) => n.has(a.id));
      for (const a of g.animales) {
        if (todo) n.delete(a.id);
        else n.add(a.id);
      }
      return n;
    });

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <>
    <form onSubmit={enviar} className="space-y-4">
      {grupos.map((g) => (
        <Card key={g.key} className="overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <SpeciesChip especie={g.especie} />
              <span className="text-[16px] font-semibold text-ink">{g.de}</span>
              <IconArrowRight size={16} className="text-muted" />
              <span className="text-[16px] font-semibold text-campo">{g.a}</span>
              <Badge tone="neutral">Motivo: {g.motivo}</Badge>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium text-ink">
              <input type="checkbox" checked={grupoTodo(g)} onChange={() => toggleGrupo(g)} className="h-4 w-4 accent-monte" />
              {g.animales.length} {g.animales.length === 1 ? "animal" : "animales"}
            </label>
          </header>
          <ul className="-mb-px grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {g.animales.map((a) => (
              <li key={a.id} className="flex items-center gap-2 border-b border-border px-5 py-2.5">
                <label className={cx("flex min-w-0 flex-1 cursor-pointer items-center gap-3 hover:bg-surface-2", !sel.has(a.id) && "opacity-55")}>
                  <input type="checkbox" name="item" value={`${a.id}|${g.aCodigo}`} checked={sel.has(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 shrink-0 accent-monte" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <Link href={`/hacienda/${a.id}`} className="font-semibold tabular-nums text-ink hover:underline">
                        {a.ident}
                      </Link>
                      <span className="text-[12.5px] tabular-nums text-muted">{a.edad}</span>
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">{[a.detalle, a.lote, a.peso].filter(Boolean).join(" · ") || "—"}</span>
                  </span>
                </label>
                <button type="button" onClick={() => setDescartar([{ animal_id: a.id, categoria: g.aCodigo }])} className="shrink-0 rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-medium text-muted hover:bg-surface-2 hover:text-ink">
                  Descartar
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 shadow-[0_6px_20px_rgb(22_63_46/0.12)]">
        <p className="text-[14px] text-ink">
          <span className="font-semibold tabular-nums">{sel.size}</span> {sel.size === 1 ? "recategorización marcada" : "recategorizaciones marcadas"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={!sel.size || descarte.pending} onClick={() => setDescartar(grupos.flatMap((g) => g.animales.filter((a) => sel.has(a.id)).map((a) => ({ animal_id: a.id, categoria: g.aCodigo }))))}>
            Descartar marcados
          </Button>
          <label className="flex items-center gap-2 text-[13px] font-medium text-muted">
            Fecha
            <input type="date" name="ocurrido_en" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} className={cx(inputClass, "h-10 w-[160px] text-[14px]")} />
          </label>
          <Button type="submit" disabled={!sel.size || pending} icon={pending ? <Spinner /> : <IconCheck size={18} />}>
            Confirmar {sel.size > 1 ? sel.size : ""}
          </Button>
        </div>
        {(state.error || state.advertencias) && (
          <div className="w-full">
            <FormAlerts state={state} pending={pending} />
          </div>
        )}
      </div>
    </form>
    <Dialog open={!!descartar} onClose={() => setDescartar(null)} title={descartar?.length === 1 ? "Descartar esta sugerencia" : `Descartar ${descartar?.length ?? 0} sugerencias`} description="La categoría sugerida deja de aparecer para estos animales. Si más adelante cambia la sugerencia, va a volver a mostrarse.">
      <form action={descarte.formAction}>
        <input type="hidden" name="items" value={JSON.stringify(descartar ?? [])} />
        <DialogBody>
          <p className="text-[14px] text-ink">El descarte queda registrado y podés seguir recategorizando otros animales.</p>
          <FormAlerts state={descarte.state} pending={descarte.pending} />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setDescartar(null)}>Volver</Button>
          <Button type="submit" variant="danger" disabled={descarte.pending} icon={descarte.pending ? <Spinner /> : undefined}>Confirmar descarte</Button>
        </DialogFooter>
      </form>
    </Dialog>
    </>
  );
}
