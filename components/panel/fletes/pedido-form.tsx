"use client";

import { useState } from "react";
import { pedirFleteAction } from "@/lib/fletes-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { ChoiceChip } from "@/components/choice";
import { Button, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { IconSend } from "@/components/icons";
import type { S } from "@/lib/schemas";

type Opciones = S<"FleteOpciones">;

/**
 * Pedido de flete (TPA-73). La zona de carga es el departamento y el destino es provincia + localidad:
 * no se piden direcciones ni coordenadas. El consentimiento explica qué se comparte y con quién.
 */
export function PedidoForm({ op, hoy }: { op: Opciones; hoy: string }) {
  const { state, formAction, pending, f } = useActionForm(pedirFleteAction);
  const [desde, setDesde] = useState("");
  const deptos = op.departamentos ?? [];
  const sugerido = op.origen_sugerido?.departamento_codigo ?? "";
  const sugeridoEnLista = deptos.some((d) => d.codigo === sugerido);

  return (
    <form action={formAction} className="space-y-6 px-5 py-5">
      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">La hacienda</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Especie" htmlFor="especie_BUB" error={f.especie_codigo}>
            <fieldset className="flex flex-wrap gap-2" aria-label="Especie">
              <ChoiceChip id="especie_BOV" type="radio" name="especie_codigo" value="BOV" label="Bovinos" required defaultChecked />
              <ChoiceChip id="especie_BUB" type="radio" name="especie_codigo" value="BUB" label="Búfalos" />
            </fieldset>
          </Field>
          <Field label="Motivo del traslado" htmlFor="motivo" error={f.motivo}>
            <Select id="motivo" name="motivo" required defaultValue="">
              <option value="" disabled>
                Elegí el motivo
              </option>
              {op.motivos?.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cabezas" htmlFor="cabezas" error={f.cabezas}>
            <Input id="cabezas" name="cabezas" inputMode="numeric" required placeholder="30" className="tabular-nums" />
          </Field>
          <Field label="Categoría" htmlFor="categoria" optional error={f.categoria}>
            <Input id="categoria" name="categoria" maxLength={80} placeholder="Novillos, vacas de invernada, terneros…" />
          </Field>
          <Field label="Peso promedio (kg)" htmlFor="kg_promedio" optional error={f.kg_promedio} hint="Ayuda a calcular cuántos entran por jaula.">
            <Input id="kg_promedio" name="kg_promedio" inputMode="numeric" placeholder="420" className="tabular-nums" />
          </Field>
          <Field label="Tipo de jaula" htmlFor="jaula_preferida" optional error={f.jaula_preferida}>
            <Select id="jaula_preferida" name="jaula_preferida" defaultValue="">
              <option value="">Me da igual</option>
              {op.jaulas?.map((j) => (
                <option key={j.codigo} value={j.codigo}>
                  {j.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Ruta y fecha</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Zona de carga" htmlFor="origen_departamento_codigo" error={f.origen_departamento_codigo} hint="Departamento donde se carga. Solo se comparte el departamento, no la ubicación del campo.">
            <Select id="origen_departamento_codigo" name="origen_departamento_codigo" defaultValue={sugerido}>
              {!sugeridoEnLista && sugerido && <option value={sugerido}>{op.origen_sugerido?.departamento_nombre ?? sugerido} (el del establecimiento)</option>}
              {deptos.map((d) => (
                <option key={d.codigo} value={d.codigo}>
                  {d.nombre} · {d.provincia_nombre}
                  {d.codigo === sugerido ? " (el del establecimiento)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Field label="Provincia de destino" htmlFor="destino_provincia_codigo" error={f.destino_provincia_codigo}>
              <Select id="destino_provincia_codigo" name="destino_provincia_codigo" required defaultValue="">
                <option value="" disabled>
                  Elegí
                </option>
                {op.provincias?.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Localidad de destino" htmlFor="destino_localidad" error={f.destino_localidad}>
              <Input id="destino_localidad" name="destino_localidad" required maxLength={120} placeholder="Frigorífico, feria o localidad" />
            </Field>
          </div>
          <Field label="Desde" htmlFor="fecha_desde" error={f.fecha_desde} hint="Primer día en que podés cargar.">
            <Input id="fecha_desde" name="fecha_desde" type="date" required min={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </Field>
          <Field label="Hasta" htmlFor="fecha_hasta" error={f.fecha_hasta} hint="Último día posible. Una ventana más amplia da más opciones.">
            <Input id="fecha_hasta" name="fecha_hasta" type="date" required min={desde || hoy} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Contacto</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Teléfono o WhatsApp" htmlFor="telefono_contacto" error={f.telefono_contacto} hint="El equipo te escribe por acá.">
            <Input id="telefono_contacto" name="telefono_contacto" type="tel" required placeholder="+54 3773 456789" autoComplete="tel" />
          </Field>
          <Field label="Algo más que tengamos que saber" htmlFor="observaciones" optional error={f.observaciones}>
            <Textarea id="observaciones" name="observaciones" maxLength={1000} className="min-h-[44px]" rows={2} placeholder="Horario de carga, acceso al campo, manga…" />
          </Field>
        </div>
      </section>

      <label className="flex items-start gap-3 rounded-[10px] border border-border bg-surface-2 p-4 text-[14px]">
        <input type="checkbox" name="consentimiento" value="1" required className="mt-1 h-4 w-4 accent-monte" />
        <span className="text-ink">
          {op.consentimiento?.texto}
          {f.consentimiento && <span className="mt-1 block text-[12.5px] font-medium text-danger">{f.consentimiento}</span>}
        </span>
      </label>

      <FormAlerts state={state} pending={pending} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconSend size={16} />}>
          {pending ? "Enviando…" : "Pedir flete"}
        </Button>
        <span className="text-[12.5px] text-muted">Una persona del equipo lo revisa. No hay respuesta automática.</span>
      </div>
    </form>
  );
}
