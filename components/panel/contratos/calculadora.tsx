"use client";

import { useActionState, useMemo, useState } from "react";
import { crearContratoAction, type ContratoFormState } from "@/lib/contrato-actions";
import { ars, ars2, calcularTerminos } from "@/lib/contratos-calc";
import { IconArrowRight, IconInfo } from "@/components/icons";
import { Button, Card, CardBody, CardHeader, Field, Input, Notice, Spinner, fieldAria } from "@/components/ui";

const nf = new Intl.NumberFormat("es-AR");

export interface LoteOpcion {
  id: string;
  nombre: string;
  especie: "BOV" | "BUB";
  cabezas: number;
  peso?: string | null;
}

function NumInput({ id, name, value, onChange, suffix, error, step = "any" }: { id: string; name: string; value: string; onChange: (v: string) => void; suffix?: string; error?: string; step?: string }) {
  return (
    <div className="relative">
      <Input id={id} name={name} inputMode="decimal" type="number" step={step} min={0} value={value} onChange={(e) => onChange(e.target.value)} className="pr-14 tabular-nums" {...fieldAria(id, error)} />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13.5px] text-muted">{suffix}</span>}
    </div>
  );
}

/**
 * Calculadora de términos (flujo 20, productor): cálculo en vivo con la fórmula
 * a la vista (Claude Design, duda 4). La API recalcula al guardar.
 */
export function CalculadoraContrato({ lote }: { lote: LoteOpcion }) {
  const [state, action, pending] = useActionState(crearContratoAction, {} as ContratoFormState);
  const f = state.fields ?? {};
  const [v, setV] = useState({
    cabezas: String(lote.cabezas),
    peso: String(Math.round(Number(lote.peso ?? (lote.especie === "BUB" ? 480 : 420)) * 1.1)),
    rend: lote.especie === "BUB" ? "53" : "58",
    kgToken: "100",
    precio: "",
    desc: "10",
    anticipo: "30",
    entrega: "",
    tolerancia: "5",
    venc: "48",
  });
  const set = (k: keyof typeof v) => (x: string) => setV((s) => ({ ...s, [k]: x }));
  const t = useMemo(
    () =>
      calcularTerminos({
        cabezas: Number(v.cabezas) || 0,
        pesoVivo: Number(v.peso) || 0,
        rendimientoPct: Number(v.rend) || 0,
        kgPorToken: Number(v.kgToken) || 100,
        precioRef: Number(v.precio) || 0,
        descuentoPct: Number(v.desc) || 0,
        anticipoPct: Number(v.anticipo) || 0,
      }),
    [v],
  );

  return (
    <form action={action} noValidate className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="lote_id" value={lote.id} />
      <div className="space-y-4">
        {state.error && <Notice tone="danger" title={state.error} />}
        <Card>
          <CardHeader title="Lote y kilos" description={`${lote.nombre} · ${lote.cabezas} cabezas hoy`} />
          <CardBody className="grid gap-5 sm:grid-cols-3">
            <Field label="Cabezas" htmlFor="cabezas" error={f.cabezas}>
              <NumInput id="cabezas" name="cabezas" value={v.cabezas} onChange={set("cabezas")} step="1" error={f.cabezas} />
            </Field>
            <Field label="Peso vivo a la entrega" htmlFor="peso_vivo" error={f.peso_vivo} hint="Estimado, por cabeza">
              <NumInput id="peso_vivo" name="peso_vivo" value={v.peso} onChange={set("peso")} suffix="kg" error={f.peso_vivo} />
            </Field>
            <Field label="Rendimiento al gancho" htmlFor="rendimiento" hint={lote.especie === "BUB" ? "53 % típico bubalino NEA" : "58 % típico bovino"}>
              <NumInput id="rendimiento" name="rendimiento" value={v.rend} onChange={set("rend")} suffix="%" />
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Precio y anticipo" description="El precio especial lo ven sólo compradores con cuenta. Las tomas y anticipos, sólo las partes." />
          <CardBody className="grid gap-5 sm:grid-cols-3">
            <Field label="Precio de referencia" htmlFor="precio_ref" error={f.precio_ref} hint="Por kg al gancho">
              <NumInput id="precio_ref" name="precio_ref" value={v.precio} onChange={set("precio")} suffix="$/kg" error={f.precio_ref} />
            </Field>
            <Field label="Descuento" htmlFor="descuento" error={f.descuento} hint="Por pagar anticipado">
              <NumInput id="descuento" name="descuento" value={v.desc} onChange={set("desc")} suffix="%" error={f.descuento} />
            </Field>
            <Field label="Anticipo" htmlFor="anticipo" error={f.anticipo} hint="Se paga al tomar tokens">
              <NumInput id="anticipo" name="anticipo" value={v.anticipo} onChange={set("anticipo")} suffix="%" error={f.anticipo} />
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Entrega y reglas" />
          <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Fecha de entrega" htmlFor="fecha_entrega" error={f.fecha_entrega}>
              <Input id="fecha_entrega" name="fecha_entrega" type="date" value={v.entrega} onChange={(e) => set("entrega")(e.target.value)} {...fieldAria("fecha_entrega", f.fecha_entrega)} />
            </Field>
            <Field label="Kg por token" htmlFor="kg_por_token">
              <NumInput id="kg_por_token" name="kg_por_token" value={v.kgToken} onChange={set("kgToken")} suffix="kg" step="1" />
            </Field>
            <Field label="Tolerancia" htmlFor="tolerancia" hint="Liquidación por kg reales">
              <NumInput id="tolerancia" name="tolerancia" value={v.tolerancia} onChange={set("tolerancia")} suffix="± %" />
            </Field>
            <Field label="Liberar tomas sin pago" htmlFor="vencimiento" hint="Si no confirmás «recibí»">
              <NumInput id="vencimiento" name="vencimiento" value={v.venc} onChange={set("venc")} suffix="h" step="1" />
            </Field>
          </CardBody>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-8 xl:self-start">
        <Card>
          <CardHeader title="Términos calculados" />
          <CardBody className="space-y-4">
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-[10px] bg-base p-3">
                <dt className="text-[12px] text-muted">Kg al gancho</dt>
                <dd className="text-[22px] font-bold tabular-nums text-ink">{nf.format(t.kgGancho)}</dd>
              </div>
              <div className="rounded-[10px] bg-base p-3">
                <dt className="text-[12px] text-muted">Tokens</dt>
                <dd className="text-[22px] font-bold tabular-nums text-ink">{nf.format(t.tokens)}</dd>
              </div>
              <div className="rounded-[10px] bg-base p-3">
                <dt className="text-[12px] text-muted">Precio especial</dt>
                <dd className="text-[17px] font-bold tabular-nums text-ink">{t.precioEspecial ? ars2.format(t.precioEspecial) : "—"}</dd>
              </div>
              <div className="rounded-[10px] bg-base p-3">
                <dt className="text-[12px] text-muted">Anticipo por token</dt>
                <dd className="text-[17px] font-bold tabular-nums text-ink">{t.anticipoPorToken ? ars.format(t.anticipoPorToken) : "—"}</dd>
              </div>
            </dl>
            <div className="space-y-1.5 border-t border-border pt-3 text-[13px] text-muted">
              <p className="flex gap-1.5 font-medium text-ink">
                <IconInfo size={15} className="mt-0.5 shrink-0" /> Cómo se calcula
              </p>
              <p className="tabular-nums">
                {nf.format(Number(v.cabezas) || 0)} cab × {nf.format(Number(v.peso) || 0)} kg × {v.rend || 0} % = <span className="font-semibold text-ink">{nf.format(t.kgGancho)} kg</span> al gancho
              </p>
              <p className="tabular-nums">
                ÷ {v.kgToken} kg = <span className="font-semibold text-ink">{nf.format(t.tokens)} tokens</span>
                {t.kgResto > 0 && <> · {nf.format(t.kgResto)} kg quedan tuyos</>}
              </p>
              <p className="tabular-nums">
                Precio especial = referencia × (1 − {v.desc || 0} %) · anticipo {v.anticipo || 0} %
              </p>
            </div>
            <div className="rounded-[10px] border border-border p-3 text-[13.5px]">
              <p className="flex justify-between">
                <span className="text-muted">Si se toman todos</span>
                <span className="font-semibold tabular-nums">{t.valorTotalEspecial ? ars.format(t.valorTotalEspecial) : "—"}</span>
              </p>
              <p className="mt-1 flex justify-between">
                <span className="text-muted">Anticipos a cobrar</span>
                <span className="font-semibold tabular-nums text-success">{t.anticipoTotal ? ars.format(t.anticipoTotal) : "—"}</span>
              </p>
            </div>
            <p className="text-[12px] text-muted">El token es un registro interno, no transferible. Los pagos se hacen fuera de TROPILLA.</p>
            <Button type="submit" className="w-full" disabled={pending || !t.tokens} icon={pending ? <Spinner /> : undefined}>
              Guardar borrador {!pending && <IconArrowRight size={18} />}
            </Button>
          </CardBody>
        </Card>
      </aside>
    </form>
  );
}
