"use client";

import { useActionState } from "react";
import { guardarPerfilAction, type PerfilFormState } from "@/lib/perfil-actions";
import { ChoiceCard, ChoiceChip, SwitchRow } from "@/components/choice";
import { Button, Card, CardBody, CardHeader, Field, Input, Notice, Spinner, Textarea, fieldAria } from "@/components/ui";
import { IDIOMAS_PERFIL, SECCIONES, type TextosPerfil } from "@/lib/perfil";

export function PerfilEditor({
  perfil,
  slugBase,
  reproductoresDisponibles = [],
}: {
  reproductoresDisponibles?: Array<{ value: string; label: string }>;
  perfil: {
    slug: string;
    rowVersion: number;
    enDirectorio: boolean;
    textos: TextosPerfil;
    idiomas: string[];
    contacto: Record<string, boolean>;
    ubicacion: string;
    secciones: Record<string, { activa?: boolean; ids?: Array<{ tipo: string; id: string }>; modo?: string }>;
  };
  slugBase: string;
}) {
  const [state, action, pending] = useActionState(guardarPerfilAction, {} as PerfilFormState);
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="row_version" value={perfil.rowVersion} />
      {state.error && <Notice tone="danger" title={state.error} />}
      {state.ok && <Notice tone="success" title="Cambios guardados">Si el perfil ya está publicado, se actualiza en unos minutos.</Notice>}

      <Card>
        <CardHeader title="Dirección y directorio" />
        <CardBody className="space-y-4">
          <Field label="Dirección del perfil" htmlFor="slug" error={f.slug} hint="Cambiarla no rompe los enlaces viejos: redirigen a la nueva.">
            <div className="flex items-stretch overflow-hidden rounded-[var(--radius-control)] border border-border-strong focus-within:border-campo">
              <span className="flex items-center border-r border-border bg-surface-2 px-3 text-[14px] text-muted">{slugBase}</span>
              <input id="slug" name="slug" defaultValue={perfil.slug} className="h-11 min-w-0 flex-1 bg-surface px-3 text-[15px] text-ink focus:outline-none" {...fieldAria("slug", f.slug, true)} />
            </div>
          </Field>
          <div className="border-t border-border">
            <SwitchRow
              name="en_directorio"
              label="Aparecer en el directorio"
              description="Si lo apagás, el perfil existe con su enlace pero no se lista ni se indexa en buscadores."
              defaultChecked={perfil.enDirectorio}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Secciones" description="Cada una se muestra u oculta. CUIT, RENSPA, ubicación exacta, precios y reactores nunca se publican." />
        <div className="divide-y divide-border px-5">
          {SECCIONES.map((s) => (
            <SwitchRow key={s.k} name={`sec_${s.k}`} label={s.label} description={s.desc} defaultChecked={perfil.secciones[s.k]?.activa !== false} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Reproductores destacados" description="Seleccioná animales del rodeo o reproductores externos. La ficha y el pedigrí aparecen solo si activás el bloque en Secciones." />
        <CardBody className="space-y-4">
          <Field label="Composición del rodeo" htmlFor="composicion_modo" hint="El modo por rangos oculta cantidades exactas.">
            <select id="composicion_modo" name="composicion_modo" defaultValue={perfil.secciones.composicion?.modo === "exacto" ? "exacto" : "rango"} className="h-11 w-full rounded-[var(--radius-control)] border border-border-strong bg-surface px-3 text-sm text-ink">
              <option value="rango">Mostrar rangos</option><option value="exacto">Mostrar cantidades exactas</option>
            </select>
          </Field>
          <fieldset className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            <legend className="sr-only">Reproductores que se publican</legend>
            {reproductoresDisponibles.length ? reproductoresDisponibles.map((a) => <label key={a.value} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface-2">
              <input type="checkbox" name="reproductores" value={a.value} defaultChecked={perfil.secciones.reproductores?.ids?.some((x) => `${x.tipo}:${x.id}` === a.value)} className="size-4 accent-campo" />
              <span className="min-w-0 flex-1 truncate text-ink">{a.label}</span>
            </label>) : <p className="p-4 text-sm text-muted">No hay animales adultos ni reproductores externos cargados.</p>}
          </fieldset>
          <p className="text-xs text-muted">La publicación excluye caravanas oficiales, RENSPA y datos del establecimiento de origen.</p>
        </CardBody>
      </Card>

      <Card>
        <div id="textos" className="scroll-mt-6" />
        <CardHeader
          title="Textos e idiomas"
          description="Los textos libres se muestran tal cual en cada idioma (TROPILLA no los traduce solo); los datos (especie, categoría, sanidad) sí se traducen."
        />
        <CardBody className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-ink">Idiomas del perfil</legend>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip name="idiomas" value="es" label="Español" defaultChecked disabled />
              <ChoiceChip name="idiomas" value="en" label="Inglés" defaultChecked={perfil.idiomas.includes("en")} />
              <ChoiceChip name="idiomas" value="pt" label="Portugués" defaultChecked={perfil.idiomas.includes("pt")} />
            </div>
          </fieldset>
          {IDIOMAS_PERFIL.map(({ k, label }) => {
            const tx = perfil.textos[k] ?? {};
            const body = (
              <div className="grid gap-4">
                <Field label="Título" htmlFor={`titulo_${k}`} optional={k !== "es"} error={f[`titulo_${k}`]} hint="Ej.: Cría de búfalos Mediterráneos en el Iberá">
                  <Input id={`titulo_${k}`} name={`titulo_${k}`} defaultValue={tx.titulo ?? ""} maxLength={80} {...fieldAria(`titulo_${k}`, f[`titulo_${k}`], true)} />
                </Field>
                <Field label="Descripción corta" htmlFor={`descripcion_${k}`} optional={k !== "es"} error={f[`descripcion_${k}`]} hint="Hasta 160 caracteres: es lo que muestran Google y el directorio.">
                  <Textarea id={`descripcion_${k}`} name={`descripcion_${k}`} rows={2} defaultValue={tx.descripcion ?? ""} maxLength={160} className="min-h-[72px]" {...fieldAria(`descripcion_${k}`, f[`descripcion_${k}`], true)} />
                </Field>
                <Field label="Historia del establecimiento" htmlFor={`historia_${k}`} optional hint="Quiénes son, desde cuándo, cómo trabajan. 3 a 6 líneas.">
                  <Textarea id={`historia_${k}`} name={`historia_${k}`} rows={5} defaultValue={tx.historia ?? ""} maxLength={1500} {...fieldAria(`historia_${k}`, undefined, true)} />
                </Field>
              </div>
            );
            return k === "es" ? (
              <div key={k} className="border-t border-border pt-4">
                <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</p>
                {body}
              </div>
            ) : (
              <details key={k} className="group border-t border-border pt-4" open={!!(tx.titulo || tx.descripcion || tx.historia) || !!f[`descripcion_${k}`] || !!f[`titulo_${k}`]}>
                <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                  {label}
                  <span className="text-[12.5px] font-medium normal-case tracking-normal text-campo group-open:hidden">Escribir en {label.toLowerCase()}</span>
                </summary>
                <div className="mt-3">{body}</div>
              </details>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Ubicación y contacto" />
        <CardBody className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-ink">Ubicación que se muestra</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <ChoiceCard name="ubicacion_publica" value="provincia" title="Provincia" description="Corrientes" defaultChecked={perfil.ubicacion === "provincia"} />
              <ChoiceCard name="ubicacion_publica" value="departamento" title="Departamento" description="General Paz, Corrientes" defaultChecked={perfil.ubicacion === "departamento"} />
              <ChoiceCard name="ubicacion_publica" value="localidad" title="Localidad" description="Caá Catí, Corrientes" defaultChecked={perfil.ubicacion === "localidad"} />
            </div>
            <p className="mt-2 text-[12.5px] text-muted">La ubicación exacta del campo nunca se publica.</p>
          </fieldset>
          <fieldset className="border-t border-border pt-2">
            <legend className="sr-only">Contacto directo visible</legend>
            <SwitchRow name="cv_whatsapp" label="Mostrar botón de WhatsApp" description="Usa el WhatsApp comercial del productor." defaultChecked={!!perfil.contacto.whatsapp} />
            <SwitchRow name="cv_email" label="Mostrar email" defaultChecked={!!perfil.contacto.email} />
            <SwitchRow name="cv_telefono" label="Mostrar teléfono" defaultChecked={!!perfil.contacto.telefono} />
          </fieldset>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
