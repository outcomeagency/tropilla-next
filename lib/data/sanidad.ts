import "server-only";
import { api, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type ProductoSanitario = S<"ProductoSanitario">;
export type PlanSanitario = S<"PlanSanitario">;
export type PlanItem = S<"PlanItem">;
export type Tarea = S<"Tarea">;
export type AnimalResumen = S<"AnimalResumen">;
export type LoteConRetiro = { id?: string; nombre?: string; especie?: string; cabezas?: number; retiro_carne_hasta?: string | null; retiro_leche_hasta?: string | null };

const base = (est: string) => `/establecimientos/${est}`;

/** Catálogo de productos del establecimiento (TPA-31). */
export function listProductos(est: string, f: { archivados?: boolean; tipo?: string; especie?: string } = {}) {
  return api<Many<ProductoSanitario>>(`${base(est)}/productos-sanitarios${query({ archivados: f.archivados ? 1 : undefined, tipo: f.tipo, especie: f.especie })}`).then((r) => r.data);
}

/** Base sugerida: genéricos sin dosis ni retiro (los completa el productor con su veterinario). */
export function listProductosSugeridos() {
  return api<Many<ProductoSanitario>>(`/catalogos/productos-sugeridos`).then((r) => r.data);
}

/** Plan sanitario con su aviso veterinario (TPA-33). */
export function getPlan(est: string) {
  return api<One<PlanSanitario>>(`${base(est)}/plan-sanitario`).then((r) => r.data);
}

/** Tareas del calendario sanitario; `abiertas` = pendientes + vencidas. */
export function listTareas(est: string, f: { estado?: "pendiente" | "vencida" | "hecha" | "omitida" | "abiertas"; desde?: string; hasta?: string; cursor?: string; limit?: number } = {}) {
  return api<Many<Tarea>>(`${base(est)}/tareas${query({ estado: f.estado, desde: f.desde, hasta: f.hasta, cursor: f.cursor, limit: f.limit ?? 50 })}`);
}

/** Animales (y lotes anónimos) con retiro vigente (TPA-35). */
export function listRetiros(est: string, especie?: string) {
  return api<{ data: AnimalResumen[]; lotes?: LoteConRetiro[] }>(`${base(est)}/sanidad/retiros${query({ especie })}`);
}

/** Reactores: privados siempre, nunca públicos (TPA-35). */
export function listReactores(est: string) {
  return api<Many<AnimalResumen>>(`${base(est)}/sanidad/reactores`).then((r) => r.data);
}
