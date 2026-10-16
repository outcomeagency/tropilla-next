"use client";

import { useActionState } from "react";
import { guardarOfertaAction, type OfertaFormState } from "@/lib/oferta-actions";
import { SwitchRow } from "@/components/choice";
import { IconArrowRight, IconLock } from "@/components/icons";
import { Button, Card, CardBody, CardHeader, Field, Input, Notice, Select, Spinner, Textarea, fieldAria } from "@/components/ui";

const MOSTRAR: Array<{ k: string; label: string; desc: string }> = [
  { k: "peso", label: "Peso promedio con fecha de pesaje", desc: "El comprador ve si fue balanza o estimado y cuándo." },
  { k: "edad", label: "Edad y dentición", desc: "Rango de edad del lote." },
  { k: "sanidad", label: "Resumen sanitario", desc: "Vacunas y desparasitaciones con fecha; «sin retiro vigente» si corresponde." },
  { k: "origen", label: "Origen", desc: "Porcentaje nacido en el establecimiento." },
  { k: "documentos", label: "Documentos publicados", desc: "Sólo los que marcaste como públicos. Nunca fiscales." },
  { k: "condiciones", label: "Condiciones de venta", desc: "Modalidad, lugar de carga y disponibilidad." },
];

export interface EditorProps {
  id: string;
  rowVersion: number;
  titulo: string;
  cantidad: number;
  maxCantidad?: number;
  sistema: string;
  descripcion: string;
  mostrar: Record<string, boolean>;
  condiciones: { modalidad?: string; lugar_carga?: string; disponible_desde?: string; precio_monto?: string; precio_unidad?: string };
  puedePrecio: boolean;
}

/** Flujo 11, paso 2: datos editables y «qué se muestra». Lo registrado (peso, sanidad) no se edita acá. */
export function OfertaEditor(p: EditorProps) {
  const [state, action, pending] = useActionState(guardarOfertaAction, {} as OfertaFormState);
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="row_version" value={p.rowVersion} />
      {state.error && <Notice tone="danger" title={state.error} />}

      <Card>
        <CardHeader title="Cómo se presenta" description="Textos libres: se muestran tal cual en los tres idiomas del portal." />
        <CardBody className="grid gap-5 sm:grid-cols-[1fr_160px]">
          <Field label="Título de la oferta" htmlFor="titulo" error={f.titulo}>
            <Input id="titulo" name="titulo" defaultValue={p.titulo} maxLength={90} {...fieldAria("titulo", f.titulo)} />
          </Field>
          <Field label="Cabezas" htmlFor="cantidad" error={f.cantidad} hint={p.maxCantidad ? `El lote tiene ${p.maxCantidad}.` : undefined}>
            <Input id="cantidad" name="cantidad" type="number" min={1} max={p.maxCantidad} defaultValue={p.cantidad} className="tabular-nums" {...fieldAria("cantidad", f.cantidad, !!p.maxCantidad)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Sistema productivo" htmlFor="sistema" optional>
              <Input id="sistema" name="sistema" defaultValue={p.sistema} placeholder="Sistema pastoril en humedal" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Descripción" htmlFor="descripcion" optional hint="Lo que un comprador quiere saber: manejo, aptitud, por qué vendés.">
              <Textarea id="descripcion" name="descripcion" defaultValue={p.descripcion} rows={4} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Condiciones" />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field label="Modalidad" htmlFor="modalidad">
            <Select id="modalidad" name="modalidad" defaultValue={p.condiciones.modalidad ?? "en_pie"}>
              <option value="en_pie">Venta en pie</option>
              <option value="al_gancho">Venta al gancho</option>
            </Select>
          </Field>
          <Field label="Disponible desde" htmlFor="disponible_desde" optional>
            <Input id="disponible_desde" name="disponible_desde" type="date" defaultValue={p.condiciones.disponible_desde} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Lugar de carga" htmlFor="lugar_carga" optional hint="Zona general. La ubicación exacta del campo nunca se publica.">
              <Input id="lugar_carga" name="lugar_carga" defaultValue={p.condiciones.lugar_carga} placeholder="En el establecimiento, General Paz (Corrientes)" />
            </Field>
          </div>
          {p.puedePrecio ? (
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_160px]">
              <Field label="Precio" htmlFor="precio_monto" optional hint="Vacío = «Precio a consultar». Sólo se muestra si lo marcás abajo.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">$</span>
                  <Input id="precio_monto" name="precio_monto" inputMode="decimal" defaultValue={p.condiciones.precio_monto} className="pl-7 tabular-nums" />
                </div>
              </Field>
              <Field label="Por" htmlFor="precio_unidad">
                <Select id="precio_unidad" name="precio_unidad" defaultValue={p.condiciones.precio_unidad ?? "kg"}>
                  <option value="kg">kg vivo</option>
                  <option value="cabeza">cabeza</option>
                </Select>
              </Field>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-muted sm:col-span-2">
              <IconLock size={14} /> Los precios los maneja el dueño o un administrador.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Qué se muestra" description="Privado por defecto: CUIT, RENSPA, ubicación exacta, reactores y precios de tus operaciones nunca se publican." />
        <div className="divide-y divide-border px-5">
          {MOSTRAR.map((m) => (
            <SwitchRow key={m.k} name={`mostrar_${m.k}`} label={m.label} description={m.desc} defaultChecked={p.mostrar[m.k] ?? true} />
          ))}
          {p.puedePrecio && (
            <SwitchRow name="mostrar_precio" label="Mostrar el precio" description="Si no, el comprador ve «Precio a consultar»." defaultChecked={!!p.mostrar.precio} />
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
          {pending ? "Guardando…" : "Guardar y revisar"} {!pending && <IconArrowRight size={18} />}
        </Button>
      </div>
    </form>
  );
}
