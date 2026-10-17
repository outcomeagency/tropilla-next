"use client";

import { useActionState } from "react";
import { Button, Field, Input, Notice, Select, Spinner, Textarea, fieldAria } from "@/components/ui";
import {
  agregarIntegranteAction,
  cambiarLicenciaAction,
  crearLicenciaAction,
  nuevaPoliticaAction,
  revisarAspectoAction,
  type AgregadosState,
} from "@/lib/agregados-actions";
import { ASPECTOS, METRICAS, TIPOS_CLIENTE } from "@/lib/agregados";

type Action = (prev: AgregadosState, fd: FormData) => Promise<AgregadosState>;

function useForm(action: Action) {
  const [state, formAction, pending] = useActionState<AgregadosState, FormData>(action, {});
  return { state, formAction, pending, f: state.fields ?? {} };
}

function Estado({ state }: { state: AgregadosState }) {
  if (state.ok) return <Notice tone="success" title={state.ok} />;
  if (state.error) return <Notice tone="danger" title={state.error} />;
  return null;
}

function Enviar({ pending, children, variant = "primary" }: { pending: boolean; children: React.ReactNode; variant?: "primary" | "outline" }) {
  return (
    <Button type="submit" variant={variant} disabled={pending} icon={pending ? <Spinner /> : undefined}>
      {children}
    </Button>
  );
}

export function RevisionForm({ pruebaAprobada }: { pruebaAprobada: boolean }) {
  const { state, formAction, pending, f } = useForm(revisarAspectoAction);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Aspecto" htmlFor="rev-aspecto" hint={pruebaAprobada ? undefined : "Para aprobar la reidentificación, primero corré la prueba con la política vigente."}>
          <Select id="rev-aspecto" name="aspecto" defaultValue="permisos">
            {Object.entries(ASPECTOS).map(([k, a]) => (
              <option key={k} value={k}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink">Resultado</legend>
          <div className="flex h-11 items-center gap-5 text-sm">
            <label className="inline-flex items-center gap-2"><input type="radio" name="resultado" value="aprobado" defaultChecked className="accent-monte" /> Aprobado</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="resultado" value="observado" className="accent-monte" /> Con observaciones</label>
          </div>
        </fieldset>
      </div>
      <Field label="Qué se revisó" htmlFor="rev-nota" error={f.nota} hint="Queda en el registro con tu nombre y la versión de la política.">
        <Textarea id="rev-nota" name="nota" required minLength={10} maxLength={2000} placeholder="Ej.: revisamos con el asesor legal la matriz de licencias y el contrato de finalidad v0." {...fieldAria("rev-nota", f.nota, true)} />
      </Field>
      <Estado state={state} />
      <Enviar pending={pending}>Registrar revisión</Enviar>
    </form>
  );
}

export function PoliticaForm({ actual }: { actual: { k_minimo: number; dominancia_max_pct: number; redondeo_cabezas: number; consultas_por_dia: number; desglose_escala: boolean } }) {
  const { state, formAction, pending, f } = useForm(nuevaPoliticaAction);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mínimo de establecimientos por celda (k)" htmlFor="pol-k" error={f.k_minimo} hint="Entre 5 y 100.">
          <Input id="pol-k" name="k_minimo" type="number" min={5} max={100} required defaultValue={actual.k_minimo} {...fieldAria("pol-k", f.k_minimo, true)} />
        </Field>
        <Field label="Dominancia máxima (%)" htmlFor="pol-dom" error={f.dominancia_max_pct} hint="Lo máximo que puede aportar un establecimiento: 30 a 90.">
          <Input id="pol-dom" name="dominancia_max_pct" type="number" min={30} max={90} required defaultValue={actual.dominancia_max_pct} {...fieldAria("pol-dom", f.dominancia_max_pct, true)} />
        </Field>
        <Field label="Redondeo de cabezas" htmlFor="pol-red" error={f.redondeo_cabezas}>
          <Select id="pol-red" name="redondeo_cabezas" defaultValue={String(actual.redondeo_cabezas)}>
            {[10, 50, 100, 500].map((r) => (
              <option key={r} value={r}>
                A {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tope de consultas por día y licencia" htmlFor="pol-cupo" error={f.consultas_por_dia}>
          <Input id="pol-cupo" name="consultas_por_dia" type="number" min={1} max={500} required defaultValue={actual.consultas_por_dia} />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" name="desglose_escala" defaultChecked={actual.desglose_escala} className="accent-monte" /> Permitir desglose por escala del establecimiento
      </label>
      <Field label="Motivo del cambio" htmlFor="pol-nota" error={f.nota}>
        <Textarea id="pol-nota" name="nota" required minLength={10} maxLength={1000} placeholder="Ej.: subimos k a 12 antes del piloto con el primer cliente." />
      </Field>
      <Notice tone="warning" title="Una política nueva reabre el gate">Las revisiones quedan atadas a la versión anterior: hay que volver a correr la prueba y revisar los cuatro aspectos.</Notice>
      <Estado state={state} />
      <Enviar pending={pending}>Publicar nueva versión</Enviar>
    </form>
  );
}

function MetricasCheck({ defaults, error }: { defaults: string[]; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold text-ink">Métricas licenciadas</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {Object.entries(METRICAS).map(([k, m]) => (
          <label key={k} className="inline-flex items-center gap-2">
            <input type="checkbox" name="metricas" value={k} defaultChecked={defaults.includes(k)} className="accent-monte" /> {m.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

export function LicenciaForm() {
  const { state, formAction, pending, f } = useForm(crearLicenciaAction);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organización" htmlFor="lic-nombre" error={f.nombre}>
          <Input id="lic-nombre" name="nombre" required minLength={3} maxLength={200} placeholder="Frigorífico del Litoral S.A." />
        </Field>
        <Field label="Tipo" htmlFor="lic-tipo" error={f.tipo}>
          <Select id="lic-tipo" name="tipo" defaultValue="frigorifico">
            {Object.entries(TIPOS_CLIENTE).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Finalidad contractual" htmlFor="lic-fin" error={f.finalidad} hint="Para qué puede usar los datos y qué tiene prohibido (mínimo 20 caracteres).">
        <Textarea id="lic-fin" name="finalidad" required minLength={20} maxLength={2000} placeholder="Planeamiento de abastecimiento por zona y trimestre. Prohibido reidentificar establecimientos o cruzar con otras fuentes." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Versión del contrato" htmlFor="lic-contrato" error={f.contrato_version}>
          <Input id="lic-contrato" name="contrato_version" required maxLength={60} placeholder="piloto-agregados-v0" />
        </Field>
        <Field label="Vigente hasta" htmlFor="lic-vig" error={f.vigente_hasta} optional>
          <Input id="lic-vig" name="vigente_hasta" type="date" />
        </Field>
        <Field label="Consultas por día" htmlFor="lic-cupo" error={f.consultas_por_dia} optional hint="Nunca supera el tope de la política.">
          <Input id="lic-cupo" name="consultas_por_dia" type="number" min={1} max={500} />
        </Field>
      </div>
      <MetricasCheck defaults={["existencias"]} error={f.metricas} />
      <Estado state={state} />
      <Enviar pending={pending}>Crear licencia</Enviar>
    </form>
  );
}

export function LicenciaCambioForm({ cliente, rowVersion, metricas, vigenteHasta, cupo }: { cliente: string; rowVersion: number; metricas: string[]; vigenteHasta: string | null; cupo: number | null }) {
  const { state, formAction, pending, f } = useForm(cambiarLicenciaAction);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="cliente" value={cliente} />
      <input type="hidden" name="row_version" value={rowVersion} />
      <input type="hidden" name="metricas_editadas" value="1" />
      <MetricasCheck defaults={metricas} error={f.metricas} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vigente hasta" htmlFor={`vig-${cliente}`} error={f.vigente_hasta} optional>
          <Input id={`vig-${cliente}`} name="vigente_hasta" type="date" defaultValue={vigenteHasta ?? ""} />
        </Field>
        <Field label="Consultas por día" htmlFor={`cupo-${cliente}`} error={f.consultas_por_dia} optional>
          <Input id={`cupo-${cliente}`} name="consultas_por_dia" type="number" min={1} max={500} defaultValue={cupo ?? ""} />
        </Field>
      </div>
      <Estado state={state} />
      <Enviar pending={pending} variant="outline">Guardar cambios</Enviar>
    </form>
  );
}

export function EstadoLicenciaForm({ cliente, rowVersion, estado }: { cliente: string; rowVersion: number; estado: "activo" | "suspendido" }) {
  const { state, formAction, pending } = useForm(cambiarLicenciaAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="cliente" value={cliente} />
      <input type="hidden" name="row_version" value={rowVersion} />
      <input type="hidden" name="estado" value={estado === "activo" ? "suspendido" : "activo"} />
      <Button type="submit" size="sm" variant={estado === "activo" ? "danger" : "outline"} disabled={pending} icon={pending ? <Spinner /> : undefined}>
        {estado === "activo" ? "Suspender licencia" : "Reactivar licencia"}
      </Button>
      {state.error && <p className="text-[12.5px] text-danger">{state.error}</p>}
    </form>
  );
}

export function IntegranteForm({ cliente }: { cliente: string }) {
  const { state, formAction, pending, f } = useForm(agregarIntegranteAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="cliente" value={cliente} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Field label="Sumar integrante por email" htmlFor={`int-${cliente}`} error={f.email} hint="La persona tiene que tener cuenta en TROPILLA.">
            <Input id={`int-${cliente}`} name="email" type="email" required placeholder="analista@empresa.com" />
          </Field>
        </div>
        <Enviar pending={pending} variant="outline">Sumar</Enviar>
      </div>
      {state.ok && <p className="text-[13px] text-success">{state.ok}</p>}
      {state.error && !f.email && <p className="text-[13px] text-danger">{state.error}</p>}
    </form>
  );
}
