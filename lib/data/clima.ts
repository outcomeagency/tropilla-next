import "server-only";
import { cache } from "react";
import { api, ApiError } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type Clima = S<"Clima">;
export type ClimaAlerta = S<"ClimaAlerta">;
export type ClimaRegla = S<"ClimaRegla">;

export type ClimaResultado = { estado: "ok"; clima: Clima } | { estado: "sin_endpoint" } | { estado: "error"; mensaje: string };

/**
 * Alertas climáticas del establecimiento (TPA-70). La API recalcula si el último cálculo tiene más de 6 h,
 * así que se le da más margen que al resto de las lecturas. Deduplicado por request (tarjeta de inicio + página).
 */
export const getClima = cache(async (est: string): Promise<ClimaResultado> => {
  try {
    const r = await api<One<Clima>>(`/establecimientos/${est}/clima`, { timeoutMs: 25_000 });
    return { estado: "ok", clima: r.data };
  } catch (e) {
    if (e instanceof ApiError && e.routeMissing) return { estado: "sin_endpoint" };
    if (e instanceof ApiError) return { estado: "error", mensaje: e.unreachable ? "No pudimos conectar con TROPILLA." : e.message };
    throw e;
  }
});

export async function getReglasClima(est: string): Promise<ClimaRegla[]> {
  try {
    return (await api<Many<ClimaRegla>>(`/establecimientos/${est}/clima/reglas`)).data;
  } catch (e) {
    if (e instanceof ApiError) return [];
    throw e;
  }
}
