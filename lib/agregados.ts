import type { Tone } from "@/lib/status";

/** Textos del tablero agregado (TPA-75), compartidos entre server y client components. */
export const METRICAS = {
  existencias: { label: "Existencias", unidad: "cabezas", campo: "cabezas", detalle: "Cabezas declaradas en el trimestre, redondeadas según la política." },
  cobertura_sanitaria: { label: "Cobertura sanitaria", unidad: "% aftosa vigente", campo: "cobertura_pct", detalle: "Porcentaje de cabezas con vacuna antiaftosa vigente." },
  precios: { label: "Precios de venta", unidad: "$/kg vivo", campo: "precio_kg", detalle: "Precio promedio ponderado por kilo vendido, redondeado a $10." },
} as const;

export type MetricaCodigo = keyof typeof METRICAS;

export const ESPECIES_AGREGADOS = { BOV: "Bovinos", BUB: "Búfalos" } as const;

export const ESCALAS = { todas: "Todas las escalas", chico: "Chicos (< 300 cab.)", mediano: "Medianos (300–1500)", grande: "Grandes (> 1500)" } as const;

export const MOTIVOS: Record<string, { label: string; detalle: (k: number, p: number) => string }> = {
  celda_chica: { label: "Celda chica", detalle: (k) => `Menos de ${k} establecimientos: publicarla permitiría identificarlos.` },
  dominancia: { label: "Aportante dominante", detalle: (_k, p) => `Un establecimiento concentra más del ${p} % del total.` },
  complementaria: { label: "Reserva complementaria", detalle: () => "Se reserva para que no se pueda despejar otra celda restando del total." },
};

export const ASPECTOS = {
  reidentificacion: { label: "Amenaza de reidentificación", detalle: "Prueba automática aprobada y revisada: celdas chicas, dominancia, resta entre totales, vinculación y cambios de un solo aportante." },
  permisos: { label: "Permisos", detalle: "Licencias por finalidad, métricas habilitadas, vigencia, cupo y quién administra." },
  cohortes: { label: "Cohortes", detalle: "Zonas, especies, escalas y trimestres publicables; riesgo entre versiones de la política." },
  auditoria: { label: "Auditoría", detalle: "Registro inmutable de consultas, exportaciones, cambios de licencia y de política." },
} as const;

export const ESTADO_ASPECTO: Record<string, { label: string; tone: Tone }> = {
  aprobado: { label: "Aprobado", tone: "success" },
  observado: { label: "Con observaciones", tone: "warning" },
  pendiente: { label: "Pendiente", tone: "neutral" },
};

export const TIPOS_CLIENTE = {
  frigorifico: "Frigorífico",
  consignataria: "Consignataria",
  banco: "Banco",
  aseguradora: "Aseguradora",
  gobierno: "Organismo público",
  proveedor: "Proveedor de insumos",
  asociacion: "Asociación",
  otro: "Otro",
} as const;

export const ACCIONES_BITACORA: Record<string, string> = {
  politica_nueva: "Nueva versión de la política",
  prueba_reidentificacion: "Prueba de reidentificación",
  revision_gate: "Revisión del gate",
  licencia_alta: "Alta de licencia",
  licencia_cambio: "Cambio de licencia",
  licencia_suspendido: "Licencia suspendida",
  licencia_activo: "Licencia reactivada",
  integrante_alta: "Alta de integrante",
  integrante_baja: "Baja de integrante",
};

/** «2026T2» → «2.º trim. 2026». */
export function trimestre(t: string, corto = false): string {
  const [anio, q] = t.split("T");
  return corto ? `T${q} ${anio.slice(2)}` : `${q}.º trim. ${anio}`;
}
