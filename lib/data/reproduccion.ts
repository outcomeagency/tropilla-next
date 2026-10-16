import "server-only";
import { api, query } from "@/lib/api";
import type { Many, S } from "@/lib/schemas";

export type TableroVientres = S<"TableroVientres">;
export type PartoCalendario = S<"PartoCalendario">;

const base = (est: string) => `/establecimientos/${est}/reproduccion`;

/** Vientres por estado y especie, con preñadas por mes de parto (TPA-30). */
export function getTablero(est: string, especie?: string) {
  return api<Many<TableroVientres>>(`${base(est)}/tablero${query({ especie })}`).then((r) => r.data);
}

/** Partos probables (FPP) en un rango; `vencidos` = FPP + tolerancia < hoy sin parto registrado. */
export function listPartos(est: string, f: { desde?: string; hasta?: string; especie?: string; vencidos?: boolean } = {}) {
  return api<Many<PartoCalendario>>(
    `${base(est)}/partos${query({ desde: f.desde, hasta: f.hasta, especie: f.especie, vencidos: f.vencidos == null ? undefined : f.vencidos ? "true" : "false" })}`,
  ).then((r) => r.data);
}

/** «2026-10» → «octubre 2026» / «oct 26». */
export function mesNombre(ym: string, corto = false): string {
  const d = new Date(`${ym}-15T12:00:00Z`);
  if (corto) return new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(d).replace(".", "");
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(d).replace(" de ", " ");
}

/** Suma `n` meses a «YYYY-MM». */
export function sumarMes(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Último día de un mes «YYYY-MM» → «YYYY-MM-DD». */
export function finDeMes(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
