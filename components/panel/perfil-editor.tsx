"use client";

import { useActionState } from "react";
import { guardarPerfilAction, type PerfilFormState } from "@/lib/perfil-actions";
import { ChoiceCard, ChoiceChip, SwitchRow } from "@/components/choice";
import { Button, Card, CardBody, CardHeader, Field, Notice, Spinner, Textarea, fieldAria } from "@/components/ui";

const SECCIONES: Array<{ k: string; label: string; desc: string }> = [
  { k: "portada", label: "Portada", desc: "Nombre, fotos, historia, zona general y asociaciones." },
  { k: "actividad", label: "Actividad", desc: "Especies, razas, actividades, superficie y ambiente." },
  { k: "rodeo", label: "Rodeo en números", desc: "Existencias por especie en rangos y % con identificación. Se calcula solo." },
  { k: "sanidad", label: "Sanidad resumida", desc: "Planes de los últimos 12 meses, sin datos individuales. Se calcula solo." },
  { k: "trazabilidad", label: "Trazabilidad", desc: "Eventos registrados, antigüedad e integridad. Se calcula solo." },
  { k: "documentos", label: "Documentos publicados", desc: "Sólo los que marcaste como públicos en Documentos." },
  { k: "ofertas", label: "Ofertas", desc: "Tus ofertas publicadas." },
  { k: "contacto", label: "Formulario de contacto", desc: "Los compradores te escriben sin cuenta; llega a tu bandeja." },
];

export function PerfilEditor({
  perfil,
  slugBase,
}: {
  perfil: {
    slug: string;
    rowVersion: number;
    enDirectorio: boolean;
    secciones: Record<string, { activa?: boolean }>;
    historia: string;
    idiomas: string[];
    contacto: Record<string, boolean>;
    ubicacion: string;
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
        <CardHeader title="Historia e idiomas" description="Los textos libres se muestran tal cual; los datos (especie, categoría, sanidad) se traducen solos." />
        <CardBody className="space-y-5">
          <Field label="Historia del establecimiento" htmlFor="historia" hint="Quiénes son, desde cuándo, cómo trabajan. 3 a 6 líneas.">
            <Textarea id="historia" name="historia" rows={5} defaultValue={perfil.historia} maxLength={1500} {...fieldAria("historia", undefined, true)} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-ink">Idiomas del perfil</legend>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip name="idiomas" value="es" label="Español" defaultChecked disabled />
              <ChoiceChip name="idiomas" value="en" label="Inglés" defaultChecked={perfil.idiomas.includes("en")} />
              <ChoiceChip name="idiomas" value="pt" label="Portugués" defaultChecked={perfil.idiomas.includes("pt")} />
            </div>
          </fieldset>
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
