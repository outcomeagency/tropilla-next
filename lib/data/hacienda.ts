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
