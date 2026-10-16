"use client";

import { Field, Input } from "@/components/ui";
import { SwitchRow } from "@/components/choice";

type Bloque = { id: string; titulo: string; privado?: boolean; campos: readonly (readonly [string, string, string])[] };

const bloques: Bloque[] = [
  { id: "sanidad_renspa", titulo: "Sanidad, RENSPA y vencimientos", privado: true, campos: [["renspa_vencimiento", "Vencimiento del RENSPA", "date"], ["senasa_vencimiento", "Próximo vencimiento SENASA", "date"], ["plan_sanitario", "Plan sanitario vigente", "text"], ["observaciones", "Observaciones sanitarias", "text"]] },
  { id: "sanidad", titulo: "Resumen sanitario publicable", campos: [["manejo", "Manejo sanitario declarado", "text"], ["vacunaciones_actualizadas", "Campañas registradas al día", "text"], ["fecha", "Fecha de actualización", "date"]] },
  { id: "potreros_aguadas", titulo: "Potreros y aguadas", campos: [["potreros", "Cantidad de potreros", "number"], ["aguadas", "Cantidad de aguadas", "number"], ["rotacion", "Esquema de rotación", "text"], ["fuentes_agua", "Fuentes de agua", "text"]] },
  { id: "suelo_pasturas", titulo: "Suelos y pasturas", campos: [["suelos", "Tipos de suelo", "text"], ["pasturas", "Pasturas y recursos forrajeros", "text"], ["ambientes", "Ambientes", "text"], ["manejo", "Manejo del suelo", "text"]] },
  { id: "capacidad_carga", titulo: "Capacidad de carga", campos: [["carga_ug_ha", "Carga (UG/ha)", "number"], ["periodo", "Período de referencia", "text"], ["criterio", "Criterio de cálculo", "text"]] },
  { id: "infraestructura", titulo: "Infraestructura", campos: [["manga", "Manga y corrales", "text"], ["balanza", "Balanza", "text"], ["alambrados", "Alambrados", "text"], ["energia", "Energía y conectividad", "text"]] },
  { id: "personal", titulo: "Personal", campos: [["equipo", "Tamaño del equipo", "number"]] },
  { id: "marcas_senales", titulo: "Marcas y señales", campos: [["marca", "Marca", "text"], ["senal", "Señal", "text"], ["registro", "Registro / libro", "text"]] },
  { id: "clima", titulo: "Clima", campos: [["precipitacion_media_mm", "Precipitación media anual (mm)", "number"], ["temperatura_media_c", "Temperatura media (°C)", "number"], ["fuente", "Fuente del dato", "text"], ["fecha", "Fecha de referencia", "date"]] },
  { id: "logistica", titulo: "Logística", campos: [["distancia_ruta_km", "Distancia a ruta (km)", "number"], ["distancia_puerto_km", "Distancia a puerto / frigorífico (km)", "number"], ["accesos", "Accesos y transitabilidad", "text"], ["carga", "Punto de carga", "text"]] },
  { id: "certificaciones", titulo: "Certificaciones", campos: [["nombre", "Programa o certificación declarada", "text"], ["emisor", "Entidad emisora", "text"], ["vence", "Vencimiento", "date"], ["alcance", "Alcance", "text"]] },
];

type Ficha = Record<string, unknown>;

export function FichaCompleta({ ficha, visibilidad }: { ficha: Ficha; visibilidad: Record<string, boolean> }) {
  return <div className="space-y-4">
    <p className="text-sm text-muted">Completá cada bloque. Los datos personales, sanitarios identificatorios y registrales quedan siempre privados.</p>
    {bloques.map((b) => <section key={b.id} className="rounded-[var(--radius-card)] border border-border p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold text-ink">{b.titulo}</h3><p className="text-xs text-muted">{b.privado ? "Privado siempre" : "La publicación se controla por separado"}</p></div>
        {b.privado !== true && <SwitchRow name={`publico_${b.id}`} label="Mostrar en perfil público" defaultChecked={visibilidad[b.id] === true} />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{b.campos.map(([key, label, type]) => <Field key={key} label={label} htmlFor={`${b.id}_${key}`}>
        <Input id={`${b.id}_${key}`} name={`ficha_${b.id}_${key}`} type={type} defaultValue={String((ficha[b.id] as Record<string, unknown> | undefined)?.[key] ?? "")} />
      </Field>)}</div>
    </section>)}
  </div>;
}
