import "server-only";
import { api, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export const FILTROS_HACIENDA = ["q", "especie", "categoria", "lote_id", "potrero_id", "estado_reproductivo", "sanidad", "sugerencia_categoria", "sexo", "orden"] as const;
export type FiltrosHacienda = Partial<Record<(typeof FILTROS_HACIENDA)[number], string>>;

const base = (est: string) => `/establecimientos/${est}`;

/** Listado paginado server-side por cursor (TPA-18). */
export async function listAnimales(est: string, f: FiltrosHacienda, cursor?: string, limit = 50) {
  return api<Many<S<"AnimalResumen">>>(`${base(est)}/animales${query({ ...f, cursor, limit })}`);
}

export function listPotreros(est: string) {
  return api<Many<S<"Potrero">>>(`${base(est)}/potreros`).then((r) => r.data);
}

export type Identificacion = {
  tipo: string;
  valor: string;
  entidad?: string | null;
  tipo_registro?: string | null;
  vigente?: boolean;
  en_conflicto?: boolean;
  colocada_en?: string | null;
  retirada_en?: string | null;
};

/** Ficha del animal (TPA-17): AnimalResumen + datos de la proyección. */
export type AnimalDetalle = S<"AnimalResumen"> & {
  origen?: string | null;
  fecha_nacimiento?: string | null;
  nacimiento_estimado?: boolean;
  castrado?: boolean | null;
  denticion?: string | null;
  senas?: string | null;
  identificaciones?: Identificacion[];
  gdp_kg_dia?: string | null;
  condicion_corporal?: { valor?: string; escala?: string; fecha?: string } | null;
  partos?: number | null;
  ultimo_parto_fecha?: string | null;
  servicio_fecha?: string | null;
  retiro_carne_hasta?: string | null;
  retiro_leche_hasta?: string | null;
  madre?: { id?: string; identificacion_principal?: string | null } | null;
  padre?: { id?: string; identificacion_principal?: string | null } | null;
  [k: string]: unknown;
};

export function getAnimal(est: string, id: string) {
  return api<One<AnimalDetalle>>(`${base(est)}/animales/${id}`).then((r) => r.data);
}

export function getTimeline(est: string, id: string, f: { modulo?: string; cursor?: string; incluir_anulados?: string }) {
  return api<Many<S<"EventoResumen">>>(`${base(est)}/animales/${id}/eventos${query({ ...f, limit: 30 })}`);
}

export function getGenealogia(est: string, id: string) {
  return api<One<S<"Genealogia">>>(`${base(est)}/animales/${id}/genealogia`).then((r) => r.data);
}

export function getDocumentosAnimal(est: string, id: string) {
  return api<Many<Record<string, unknown>>>(`${base(est)}/animales/${id}/documentos`).then((r) => r.data);
}

/** Evento de identificación con su payload y observaciones (motivo), para el historial (TPA-19). */
export type MovimientoIdentificacion = {
  id: string;
  ocurrido_en: string;
  accion: string;
  identificacion: { tipo: string; valor: string };
  reemplaza?: { tipo: string; valor: string } | null;
  observaciones?: string | null;
  autor?: string | null;
  anulado: boolean;
};

/**
 * Eventos `hacienda.identificacion` del animal con su detalle. El resumen del
 * timeline no trae payload ni observaciones; son pocos por animal, así que se
 * pide el detalle de cada uno en paralelo.
 */
export async function getMovimientosIdentificacion(est: string, id: string): Promise<MovimientoIdentificacion[]> {
  const tl = await api<Many<S<"EventoResumen">>>(`${base(est)}/animales/${id}/eventos${query({ tipo: "hacienda.identificacion", limit: 50 })}`);
  const detalles = await Promise.all(
    tl.data
      .filter((e) => e.id && !e.corregido)
      .map((e) =>
        api<One<{ evento: S<"Evento"> }>>(`${base(est)}/eventos/${e.id}`)
          .then((r) => ({ r: r.data.evento, e }))
          .catch(() => null),
      ),
  );
  return detalles.flatMap((d) => {
    if (!d) return [];
    const p = (d.r.payload ?? {}) as { accion?: string; identificacion?: { tipo: string; valor: string }; reemplaza?: { tipo: string; valor: string } };
    if (!p.identificacion) return [];
    return [
      {
        id: d.r.id ?? d.e.id!,
        ocurrido_en: d.r.ocurrido_en ?? d.e.ocurrido_en ?? "",
        accion: p.accion ?? "colocacion",
        identificacion: p.identificacion,
        reemplaza: p.reemplaza ?? null,
        observaciones: d.r.observaciones ?? null,
        autor: d.e.autor?.nombre ?? null,
        anulado: !!d.e.anulado,
      },
    ];
  });
}
