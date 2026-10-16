"use client";

import { useActionState } from "react";
import { cancelarContratoAction, nuevaVersionAction, registrarEntregaAction, type ContratoFormState } from "@/lib/contrato-actions";
import { IconChevronDown } from "@/components/icons";
import { Button, Field, Input, Notice, Spinner, Textarea, fieldAria } from "@/components/ui";

function Panel({ title, desc, children, tone }: { title: string; desc: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <details className="group rounded-[12px] border border-border bg-surface open:bg-base">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className={tone === "danger" ? "block text-[14.5px] font-semibold text-danger" : "block text-[14.5px] font-semibold text-ink"}>{title}</span>
          <span className="block text-[12.5px] text-muted">{desc}</span>
        </span>
        <IconChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}

export function AccionesContrato({ id, cabezas, puedeEntrega, puedeCancelar }: { id: string; cabezas: number; puedeEntrega: boolean; puedeCancelar: boolean }) {
  const [v, accionVersion, pv] = useActionState(nuevaVersionAction, {} as ContratoFormState);
  const [e, accionEntrega, pe] = useActionState(registrarEntregaAction, {} as ContratoFormState);
  const [c, accionCancelar, pc] = useActionState(cancelarContratoAction, {} as ContratoFormState);
  return (
    <div className="space-y-2">
      <Panel title="Registrar mortalidad o faltante" desc="Recalcula los tokens; si ya están tomados, recorta prorrata y calcula el anticipo a devolver.">
        <form action={accionVersion} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={id} />
          {v.error && <Notice tone="danger" title={v.error} />}
          <Field label="Cabezas que quedan" htmlFor="v-cabezas" error={v.fields?.cabezas}>
            <Input id="v-cabezas" name="cabezas" type="number" min={1} max={cabezas} defaultValue={cabezas} className="max-w-[160px] tabular-nums" {...fieldAria("v-cabezas", v.fields?.cabezas)} />
          </Field>
          <Field label="Qué pasó" htmlFor="v-motivo" error={v.fields?.motivo}>
            <Textarea id="v-motivo" name="motivo" rows={2} placeholder="Ej. murieron 2 bubillos por carbunclo el 12/11 (eventos de muerte cargados)" {...fieldAria("v-motivo", v.fields?.motivo)} />
          </Field>
          <Button type="submit" variant="outline" disabled={pv} icon={pv ? <Spinner /> : undefined}>
            Guardar versión nueva
          </Button>
        </form>
      </Panel>
      {puedeEntrega && (
        <Panel title="Cargar la entrega" desc="Con el romaneo: liquida por kg reales dentro de la tolerancia; fuera, queda «a resolver».">
          <form action={accionEntrega} className="space-y-4" noValidate>
            <input type="hidden" name="id" value={id} />
            {e.error && <Notice tone="danger" title={e.error} />}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Cabezas entregadas" htmlFor="e-cab" error={e.fields?.cabezas_entregadas}>
                <Input id="e-cab" name="cabezas_entregadas" type="number" defaultValue={cabezas} className="tabular-nums" {...fieldAria("e-cab", e.fields?.cabezas_entregadas)} />
              </Field>
              <Field label="Peso vivo promedio" htmlFor="e-peso" error={e.fields?.peso_real}>
                <Input id="e-peso" name="peso_real" inputMode="decimal" placeholder="kg" className="tabular-nums" {...fieldAria("e-peso", e.fields?.peso_real)} />
              </Field>
              <Field label="Rendimiento real" htmlFor="e-rend" error={e.fields?.rendimiento_real}>
                <Input id="e-rend" name="rendimiento_real" inputMode="decimal" placeholder="%" className="tabular-nums" {...fieldAria("e-rend", e.fields?.rendimiento_real)} />
              </Field>
            </div>
            <p className="text-[12.5px] text-muted">El romaneo que adjuntes queda como «Declarado». Si hay diferencias con el comprador, usá «Tengo una diferencia» en la liquidación.</p>
            <Button type="submit" disabled={pe} icon={pe ? <Spinner /> : undefined}>
              Calcular liquidación
            </Button>
          </form>
        </Panel>
      )}
      {puedeCancelar && (
        <Panel title="Cancelar el contrato" desc="Queda en estado cancelado con el motivo. Los anticipos se devuelven fuera de la app." tone="danger">
          <form action={accionCancelar} className="space-y-4" noValidate>
            <input type="hidden" name="id" value={id} />
            {c.error && <Notice tone="danger" title={c.error} />}
            <Field label="Motivo" htmlFor="c-motivo" error={c.fields?.motivo}>
              <Textarea id="c-motivo" name="motivo" rows={2} {...fieldAria("c-motivo", c.fields?.motivo)} />
            </Field>
            <Button type="submit" variant="danger" disabled={pc} icon={pc ? <Spinner /> : undefined}>
              Cancelar contrato
            </Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
