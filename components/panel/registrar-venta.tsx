"use client";

import { Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { registrarVentaAction } from "@/lib/operacion-actions";
import { IconLock } from "@/components/icons";

function Campo({ name, label, type = "text", required = false, defaultValue, step }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string; step?: string }) {
  return <Field label={label} htmlFor={name} error={undefined} optional={!required}><Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} step={step} /></Field>;
}

export function RegistrarVenta({ categorias }: { categorias: string[] }) {
  const form = useActionForm(registrarVentaAction);
  return <Card className="overflow-hidden">
    <CardHeader title="Condiciones del trato" description="El resumen se guarda en Documentos con su huella. Los datos comerciales quedan privados para el establecimiento." />
    <form action={form.formAction} className="space-y-6 p-5">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo name="comprador" label="Comprador" required />
        <Campo name="destino" label="Destino declarado" />
        <Field label="Categoría" htmlFor="categoria"><Select id="categoria" name="categoria" required defaultValue=""><option value="" disabled>Elegí una categoría</option>{categorias.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Campo name="cantidad" label="Cabezas" type="number" required step="1" />
        <Field label="Especie" htmlFor="especie"><Select id="especie" name="especie" defaultValue="BUB"><option value="BUB">Búfalo</option><option value="BOV">Bovino</option></Select></Field>
        <Campo name="fecha" label="Fecha del trato" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">Pesada y modalidad</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo name="lugar_pesada" label="Lugar de pesada" required />
          <Campo name="hora_pesada" label="Hora" type="time" />
          <Field label="Modalidad" htmlFor="modalidad"><Select id="modalidad" name="modalidad" defaultValue="en_pie"><option value="en_pie">En pie</option><option value="al_gancho">Al gancho</option></Select></Field>
          <Campo name="peso_bruto_kg" label="Peso bruto total" type="number" required step="0.01" />
          <Campo name="desbaste_pct" label="Desbaste" type="number" defaultValue="0" step="0.01" />
          <Campo name="rendimiento_pct" label="Rendimiento al gancho" type="number" defaultValue="53" step="0.01" />
          <Campo name="precio_kg" label="Precio por kg" type="number" required step="0.01" />
          <Campo name="plazo_pago_dias" label="Plazo de pago (días)" type="number" defaultValue="0" />
          <Campo name="tolerancias" label="Tolerancias acordadas" />
          <Field label="Flete a cargo de" htmlFor="flete_a_cargo"><Select id="flete_a_cargo" name="flete_a_cargo"><option value="vendedor">Vendedor</option><option value="comprador">Comprador</option></Select></Field>
          <Campo name="comision_pct" label="Comisión %" type="number" defaultValue="0" step="0.01" />
          <Campo name="flete" label="Flete $" type="number" defaultValue="0" step="0.01" />
          <Campo name="arranque" label="Arranque $" type="number" defaultValue="0" step="0.01" />
          <Campo name="seguro" label="Seguro $" type="number" defaultValue="0" step="0.01" />
          <Field label="IVA informativo" htmlFor="iva_pct"><Select id="iva_pct" name="iva_pct" defaultValue="10.5"><option value="10.5">10,5 %</option><option value="21">21 %</option></Select></Field>
        </div>
      </section>
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><IconLock size={15} /> Trazabilidad declarada · privada</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Campo name="dt_e" label="DT-e" /><Campo name="tropa" label="N.º de tropa" /><Campo name="renspa" label="RENSPA" /><Campo name="intermediario" label="Intermediario" /></div>
        <p className="mt-2 text-xs text-muted">Estos datos del trato no se muestran en el portal público.</p>
      </section>
      <FormAlerts state={form.state} pending={form.pending} confirmLabel="Confirmar venta igual" />
      {form.state.ok && <p role="status" className="text-sm font-medium text-success">{form.state.ok.mensaje}</p>}
      <Button type="submit" disabled={form.pending}>{form.pending ? "Guardando…" : "Registrar venta y generar resumen"}</Button>
    </form>
  </Card>;
}
