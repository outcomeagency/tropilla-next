"use client";

import { Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { guardarReferenciaAction } from "@/lib/precios-actions";

export function PreciosReferenciaForm() {
  const form = useActionForm(guardarReferenciaAction);
  return <Card><CardHeader title="Agregar referencia" description="Cargá una referencia declarada para comparar con tus ventas." /><form action={form.formAction} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
    <Field label="Descripción" htmlFor="ref-desc"><Input id="ref-desc" name="descripcion" required placeholder="Ej. Novillo overo" /></Field>
    <Field label="Especie" htmlFor="ref-esp"><Select id="ref-esp" name="especie"><option value="BUB">Búfalo</option><option value="BOV">Bovino</option></Select></Field>
    <Field label="Categoría" htmlFor="ref-cat"><Input id="ref-cat" name="categoria" /></Field>
    <Field label="Modalidad" htmlFor="ref-mod"><Select id="ref-mod" name="modalidad"><option value="en_pie">En pie</option><option value="al_gancho">Al gancho</option></Select></Field>
    <Field label="Precio por kg ($)" htmlFor="ref-precio"><Input id="ref-precio" name="precio_kg" type="number" min="0.01" step="0.01" required /></Field>
    <Field label="Fecha" htmlFor="ref-fecha"><Input id="ref-fecha" name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /></Field>
    <Field label="Fuente" htmlFor="ref-fuente" optional><Input id="ref-fuente" name="fuente" /></Field>
    <div className="flex items-end"><Button disabled={form.pending}>{form.pending ? "Guardando…" : "Guardar referencia"}</Button></div>
    <div className="sm:col-span-2 lg:col-span-4"><FormAlerts state={form.state} pending={form.pending} />{form.state.ok && <p role="status" className="text-sm text-success">{form.state.ok.mensaje}</p>}</div>
  </form></Card>;
}
