/**
 * Pesajes y ganancia diaria (TPA-23, functional/02 §3): GDP = (peso actual −
 * peso anterior) / días entre pesajes. Sin dependencias de servidor: lo usan
 * la ficha, la sesión de pesada y el lote.
 */

export interface PuntoPeso {
  id?: string;
  fecha: string;
  kg: number;
  promedio?: boolean;
  heredado?: boolean;
}

/** «458 kg (balanza)» / «Promedio 468 kg (balanza), 30 cab.» → 458 / 468. */
export function pesoDeResumen(resumen?: string | null): number | null {
  const m = (resumen ?? "").match(/(\d+(?:[.,]\d+)?)\s*kg/);
  return m ? Number(m[1].replace(",", ".")) : null;
}

export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000);
}

/** GDP en kg/día entre dos pesajes (null si no hay días de diferencia). */
export function gdp(anterior: { fecha: string; kg: number }, actual: { fecha: string; kg: number }): number | null {
  const d = diasEntre(anterior.fecha, actual.fecha);
  return d > 0 ? (actual.kg - anterior.kg) / d : null;
}

/** Criterio del ticket: difiere más de 30 % en menos de 30 días. */
export function atipico(anterior: { fecha: string; kg: number }, actual: { fecha: string; kg: number }): boolean {
  const d = diasEntre(anterior.fecha, actual.fecha);
  return d >= 0 && d < 30 && anterior.kg > 0 && Math.abs(actual.kg - anterior.kg) / anterior.kg > 0.3;
}

const kgFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const gdpFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
export const fmtKg = (n: number) => `${kgFmt.format(n)} kg`;
export const fmtGdp = (n: number) => `${gdpFmt.format(n)} kg/día`;
