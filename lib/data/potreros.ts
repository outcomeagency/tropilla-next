import "server-only";
import { api, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type Potrero = S<"Potrero">;
export type Lote = S<"Lote"> & {
  potrero?: { id?: string; nombre?: string } | null;
  cabezas_individuales?: number;
  cabezas_anonimas?: number;
  conteo?: Record<string, number>;
  peso_promedio_kg?: string | null;
  peso_promedio_fecha?: string | null;
  gdp_promedio_kg_dia?: string | null;
};

const base = (est: string) => `/establecimientos/${est}`;

/** Potreros con ocupación derivada de lotes y animales (TPA-14). */
export function listPotrerosConArchivados(est: string, archivados = false) {
  return api<Many<Potrero>>(`${base(est)}/potreros${query({ archivados: archivados ? 1 : undefined })}`).then((r) => r.data);
}

export function getPotrero(est: string, id: string) {
  return api<One<Potrero>>(`${base(est)}/potreros/${id}`).then((r) => r.data);
}

/** Lotes de manejo con composición y potrero (TPA-20). */
export function listLotes(est: string, f: { especie?: string; archivados?: boolean } = {}) {
  return api<Many<Lote>>(`${base(est)}/lotes${query({ especie: f.especie, archivados: f.archivados ? 1 : undefined })}`).then((r) => r.data);
}

export function getLote(est: string, id: string) {
  return api<One<Lote>>(`${base(est)}/lotes/${id}`).then((r) => r.data);
}

export function getLoteEventos(est: string, id: string, cursor?: string) {
  return api<Many<S<"EventoResumen">>>(`${base(est)}/lotes/${id}/eventos${query({ cursor, limit: 30 })}`);
}

/** Anillo [lon, lat] de un GeoJSON Polygon (sin el punto de cierre). */
export function ringDe(p: { poligono?: unknown }): Array<[number, number]> {
  const g = p.poligono as { type?: string; coordinates?: number[][][] } | null | undefined;
  const ring = g?.type === "Polygon" ? g.coordinates?.[0] : undefined;
  if (!ring?.length) return [];
  const pts = ring.map((c) => [Number(c[0]), Number(c[1])] as [number, number]);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  return a[0] === b[0] && a[1] === b[1] ? pts.slice(0, -1) : pts;
}
