import "server-only";
import { api, ApiError } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type BriefInsumos = S<"BriefForrajeInsumos">;
export type BriefResultado = S<"BriefForrajeResultado">;
export type BriefForraje = S<"BriefForraje">;

export type Lectura<T> = { estado: "ok"; data: T } | { estado: "sin_endpoint" } | { estado: "no_encontrado" } | { estado: "error"; mensaje: string };

function fallo(e: unknown): Exclude<Lectura<never>, { estado: "ok" }> {
  if (e instanceof ApiError) {
    if (e.routeMissing) return { estado: "sin_endpoint" };
    if (e.status === 404) return { estado: "no_encontrado" };
    return { estado: "error", mensaje: e.unreachable ? "No pudimos conectar con TROPILLA." : e.message };
  }
  throw e;
}

/** Datos de partida del brief (TPA-71): inventario declarado, superficie, receptividad, supuestos y clima ya calculado. */
export async function getInsumosForraje(est: string): Promise<Lectura<BriefInsumos>> {
  try {
    return { estado: "ok", data: (await api<One<BriefInsumos>>(`/establecimientos/${est}/forraje/insumos`)).data };
  } catch (e) {
    return fallo(e);
  }
}

export async function getBriefsForraje(est: string): Promise<BriefForraje[]> {
  try {
    return (await api<Many<BriefForraje>>(`/establecimientos/${est}/forraje/briefs?limit=20`)).data;
  } catch (e) {
    if (e instanceof ApiError) return [];
    throw e;
  }
}

export async function getBriefForraje(est: string, id: string): Promise<Lectura<BriefForraje>> {
  try {
    return { estado: "ok", data: (await api<One<BriefForraje>>(`/establecimientos/${est}/forraje/briefs/${id}`)).data };
  } catch (e) {
    return fallo(e);
  }
}
