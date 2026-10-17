"use client";

import { useState } from "react";
import { crearDisponibilidadAction, crearTransportistaAction, documentoTransportistaAction, proponerAction } from "@/lib/fletes-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { ChoiceChip } from "@/components/choice";
import { Badge, Button, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { IconPlus, IconSend } from "@/components/icons";
import { ESTADO_DOCUMENTO } from "@/lib/fletes";
import type { S } from "@/lib/schemas";

type Opcion = { codigo: string; nombre: string };
type Depto = { codigo?: string; nombre?: string; provincia_nombre?: string };

/** Propuesta del concierge al productor: desde una sugerencia (con disponibilidad) o manual (transportista coordinado por teléfono). */
export function ProponerForm({
  pedido,
  transportistaId,
  disponibilidadId,
  min,
  max,
  sugerida,
  transportistas,
  tarifaSugerida,
}: {
  pedido: string;
  transportistaId?: string;
  disponibilidadId?: string;
  min: string;
  max: string;
  sugerida: string;
  transportistas?: { id: string; nombre: string }[];
  tarifaSugerida?: string;
}) {
  const { state, formAction, pending, f } = useActionForm(proponerAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="pedido" value={pedido} />
      {transportistaId && <input type="hidden" name="transportista_id" value={transportistaId} />}
      {disponibilidadId && <input type="hidden" name="disponibilidad_id" value={disponibilidadId} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        {transportistas && (
          <Field label="Transportista" htmlFor={`t-${pedido}`} error={f.transportista_id}>
            <Select id={`t-${pedido}`} name="transportista_id" required defaultValue="" className="h-9 text-[13px]">
              <option value="" disabled>
                Elegí transportista
              </option>
              {transportistas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Fecha propuesta" htmlFor={`f-${pedido}-${disponibilidadId ?? "m"}`} error={f.fecha_propuesta}>
          <Input id={`f-${pedido}-${disponibilidadId ?? "m"}`} name="fecha_propuesta" type="date" required min={min} max={max} defaultValue={sugerida} className="h-9 text-[13px]" />
        </Field>
        <Field label="Tarifa estimada ($)" htmlFor={`ta-${pedido}-${disponibilidadId ?? "m"}`} optional error={f.tarifa_estimada}>
          <Input id={`ta-${pedido}-${disponibilidadId ?? "m"}`} name="tarifa_estimada" inputMode="decimal" defaultValue={tarifaSugerida} placeholder="950000" className="h-9 text-[13px] tabular-nums" />
        </Field>
      </div>
      <Input name="nota" maxLength={500} placeholder="Nota para el productor (qué confirmaste con el transportista)" aria-label="Nota" className="h-9 text-[13px]" />
      <FormAlerts state={state} pending={pending} />
      <Button type="submit" size="sm" disabled={pending} icon={pending ? <Spinner /> : <IconSend size={15} />}>
        Proponer al productor
      </Button>
    </form>
  );
}

/** Verificación manual de un documento del transportista: estado, cómo se verificó y vencimiento. Queda quién y cuándo. */
export function DocumentoForm({ transportista, doc, metodos }: { transportista: string; doc: S<"FleteDocumento">; metodos: Opcion[] }) {
  const { state, formAction, pending } = useActionForm(documentoTransportistaAction);
  const [estado, setEstado] = useState<string>(doc.estado === "vencido" ? "pendiente" : doc.estado);
  const st = ESTADO_DOCUMENTO[doc.estado];
  const opciones = [
    { value: "verificado", label: "Verificado" },
    { value: "observado", label: "Observado" },
    { value: "pendiente", label: "Pendiente" },
    ...(doc.item === "identidad_cuit" ? [] : [{ value: "no_aplica", label: "No aplica" }]),
  ];
  return (
    <li className="px-5 py-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="transportista" value={transportista} />
        <input type="hidden" name="item" value={doc.item} />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[14px] font-medium text-ink">{doc.texto}</p>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        {doc.verificado_por && (
          <p className="text-[12px] text-muted">
            Último cambio: {doc.verificado_por}
            {doc.metodo ? ` · ${metodos.find((m) => m.codigo === doc.metodo)?.nombre ?? doc.metodo}` : ""}
            {doc.vence_el ? ` · vence ${doc.vence_el}` : ""}
            {doc.nota ? ` · ${doc.nota}` : ""}
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <fieldset className="flex flex-wrap gap-2" aria-label="Estado">
            {opciones.map((o) => (
              <ChoiceChip key={o.value} type="radio" name="estado" value={o.value} label={o.label} checked={estado === o.value} onChange={() => setEstado(o.value)} className="h-8 px-3 text-[13px]" />
            ))}
          </fieldset>
          {estado === "verificado" && (
            <>
              <div className="w-[210px]">
                <Select name="metodo" required defaultValue={doc.metodo ?? ""} aria-label="Cómo se verificó" className="h-8 text-[13px]">
                  <option value="" disabled>
                    ¿Cómo lo verificaste?
                  </option>
                  {metodos.map((m) => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <Input name="vence_el" type="date" defaultValue={doc.vence_el ?? ""} aria-label="Vence el" title="Vencimiento" className="h-8 w-[160px] text-[13px]" />
            </>
          )}
          <Input name="nota" defaultValue={doc.nota ?? ""} required={estado === "observado"} maxLength={500} placeholder={estado === "observado" ? "¿Qué se observó?" : "Nota (opcional)"} aria-label="Nota" className="h-8 min-w-[180px] flex-1 text-[13px]" />
          <Button type="submit" size="sm" variant="outline" disabled={pending} icon={pending ? <Spinner /> : undefined}>
            Guardar
          </Button>
        </div>
        {state.error && <p className="text-[12.5px] text-danger">{state.error}</p>}
      </form>
    </li>
  );
}

function DeptoSelect({ id, name, deptos, defaultValue, error, label, hint }: { id: string; name: string; deptos: Depto[]; defaultValue?: string; error?: string; label: string; hint?: string }) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <Select id={id} name={name} required defaultValue={defaultValue ?? ""}>
        <option value="" disabled>
          Elegí el departamento
        </option>
        {deptos.map((d) => (
          <option key={d.codigo} value={d.codigo}>
            {d.nombre} · {d.provincia_nombre}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Alta de transportista (la carga el equipo). El consentimiento declara que aceptó figurar y compartir su contacto. */
export function TransportistaForm({ deptos }: { deptos: Depto[] }) {
  const { state, formAction, pending, f } = useActionForm(crearTransportistaAction);
  return (
    <form action={formAction} className="space-y-4 px-5 py-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre o razón social" htmlFor="nombre" error={f.nombre}>
          <Input id="nombre" name="nombre" required maxLength={160} placeholder="Transportes Ñandubay" />
        </Field>
        <Field label="CUIT" htmlFor="cuit" optional error={f.cuit}>
          <Input id="cuit" name="cuit" inputMode="numeric" placeholder="30-12345678-9" className="tabular-nums" />
        </Field>
        <Field label="Persona de contacto" htmlFor="contacto_nombre" error={f.contacto_nombre}>
          <Input id="contacto_nombre" name="contacto_nombre" required maxLength={120} />
        </Field>
        <Field label="Teléfono o WhatsApp" htmlFor="telefono" error={f.telefono}>
          <Input id="telefono" name="telefono" type="tel" required />
        </Field>
        <Field label="Email" htmlFor="email" optional error={f.email}>
          <Input id="email" name="email" type="email" />
        </Field>
        <DeptoSelect id="base_departamento_codigo" name="base_departamento_codigo" deptos={deptos} error={f.base_departamento_codigo} label="Base" />
      </div>
      <Field label="Notas internas" htmlFor="notas" optional error={f.notas}>
        <Textarea id="notas" name="notas" maxLength={1000} rows={2} className="min-h-[64px]" placeholder="Cómo llegó, referencias, flota…" />
      </Field>
      <label className="flex items-start gap-3 rounded-[10px] border border-border bg-surface-2 p-4 text-[14px]">
        <input type="checkbox" name="consentimiento" value="1" required className="mt-1 h-4 w-4 accent-monte" />
        <span className="text-ink">
          El transportista aceptó figurar en el piloto y que su contacto se comparta con productores que acepten su propuesta.
          {f.consentimiento && <span className="mt-1 block text-[12.5px] font-medium text-danger">{f.consentimiento}</span>}
        </span>
      </label>
      <FormAlerts state={state} pending={pending} />
      <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconPlus size={16} />}>
        Dar de alta
      </Button>
    </form>
  );
}

/** Disponibilidad de jaula: zona de salida, destino (o cualquiera), fechas, capacidad y si es retorno. */
export function DisponibilidadForm({ transportista, deptos, provincias, jaulas, base, hoy }: { transportista: string; deptos: Depto[]; provincias: Opcion[]; jaulas: Opcion[]; base?: string; hoy: string }) {
  const { state, formAction, pending, f } = useActionForm(crearDisponibilidadAction);
  const [desde, setDesde] = useState(hoy);
  return (
    <form action={formAction} className="space-y-4 px-5 py-5">
      <input type="hidden" name="transportista" value={transportista} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DeptoSelect id="origen_departamento_codigo" name="origen_departamento_codigo" deptos={deptos} defaultValue={base} error={f.origen_departamento_codigo} label="Sale de" />
        <Field label="Va hacia" htmlFor="destino_provincia_codigo" error={f.destino_provincia_codigo} hint="Si vuelve vacío hacia una provincia, marcá «retorno».">
          <Select id="destino_provincia_codigo" name="destino_provincia_codigo" defaultValue="">
            <option value="">Cualquier destino</option>
            {provincias.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Desde" htmlFor="desde" error={f.desde}>
          <Input id="desde" name="desde" type="date" required min={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
        <Field label="Hasta" htmlFor="hasta" error={f.hasta}>
          <Input id="hasta" name="hasta" type="date" required min={desde} />
        </Field>
        <Field label="Jaula" htmlFor="jaula" error={f.jaula}>
          <Select id="jaula" name="jaula" required defaultValue="">
            <option value="" disabled>
              Elegí
            </option>
            {jaulas.map((j) => (
              <option key={j.codigo} value={j.codigo}>
                {j.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacidad (cabezas adultas)" htmlFor="capacidad_cabezas" error={f.capacidad_cabezas}>
          <Input id="capacidad_cabezas" name="capacidad_cabezas" inputMode="numeric" required className="tabular-nums" />
        </Field>
        <Field label="Tarifa de referencia ($/km)" htmlFor="tarifa_km" optional error={f.tarifa_km}>
          <Input id="tarifa_km" name="tarifa_km" inputMode="decimal" className="tabular-nums" />
        </Field>
        <Field label="Especies" htmlFor="esp_BOV" error={f.especies}>
          <fieldset className="flex flex-wrap gap-2" aria-label="Especies">
            <ChoiceChip id="esp_BOV" type="checkbox" name="especies" value="BOV" label="Bovinos" defaultChecked />
            <ChoiceChip id="esp_BUB" type="checkbox" name="especies" value="BUB" label="Búfalos" defaultChecked />
            <ChoiceChip id="es_retorno" type="checkbox" name="es_retorno" value="1" label="Viaje de retorno" />
          </fieldset>
        </Field>
      </div>
      <Input name="notas" maxLength={500} placeholder="Notas (opcional)" aria-label="Notas" />
      <FormAlerts state={state} pending={pending} />
      <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconPlus size={16} />}>
        Cargar disponibilidad
      </Button>
    </form>
  );
}
