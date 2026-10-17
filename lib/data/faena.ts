import "server-only";
import { api, ApiError } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type ResultadoFaena = S<"ResultadoFaena">;
export type ResultadoFaenaDetalle = S<"ResultadoFaenaDetalle">;
export type Operacion = S<"Operacion">;

export type Lectura<T> = { estado: "ok"; data: T } | { estado: "sin_endpoint" } | { estado: "no_encontrado" } | { estado: "error"; mensaje: string };

function fallo(e: unknown): Exclude<Lectura<never>, { estado: "ok" }> {
  if (e instanceof ApiError) {
    if (e.status === 405) return { estado: "sin_endpoint" };
    if (e.status === 404) return { estado: "no_encontrado" };
    return { estado: "error", mensaje: e.unreachable ? "No pudimos conectar con TROPILLA." : e.message };
  }
  throw e;
}

/** Resultados de faena del establecimiento (TPA-67). 404 en el listado propio = la API todavía no publica el endpoint. */
export async function listResultadosFaena(est: string, estado: "vigente" | "anulado" | "todos" = "vigente"): Promise<Lectura<ResultadoFaena[]>> {
  try {
    return { estado: "ok", data: (await api<Many<ResultadoFaena>>(`/establecimientos/${est}/faena/resultados?estado=${estado}&limit=100`)).data };
  } catch (e) {
    const r = fallo(e);
    return r.estado === "no_encontrado" ? { estado: "sin_endpoint" } : r;
  }
}

export async function getResultadoFaena(est: string, id: string): Promise<Lectura<ResultadoFaenaDetalle>> {
  try {
    return { estado: "ok", data: (await api<One<ResultadoFaenaDetalle>>(`/establecimientos/${est}/faena/resultados/${id}`)).data };
  } catch (e) {
    return fallo(e);
  }
}

/** Ventas registradas (no anuladas) para vincular el romaneo. */
export async function ventasParaFaena(est: string): Promise<Operacion[]> {
  try {
    const r = await api<Many<Operacion>>(`/establecimientos/${est}/operaciones?tipo=venta&limit=100`);
    return r.data.filter((o) => o.estado !== "anulada");
  } catch (e) {
    if (e instanceof ApiError) return [];
    throw e;
  }
}
