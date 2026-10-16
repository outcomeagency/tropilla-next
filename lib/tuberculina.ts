/** Pruebas diagnósticas (TPA-34): el resultado de la tuberculina se calcula con los umbrales del catálogo (datos, no código). */

export type TipoPrueba = {
  codigo: string;
  nombre: string;
  metodo: "diferencia_mm" | "declarado" | string;
  umbrales: { negativo_lt?: string; positivo_gte?: string } | null;
  version: number;
  validadoPorVet: boolean;
};

export type ResultadoPrueba = "negativo" | "sospechoso" | "positivo" | "no_concluyente";

const num = (s: string) => {
  const t = s.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

/** Diferencia 72 h − 0 h en mm → resultado según umbrales; null si falta un dato o la lectura no tiene sentido. */
export function calcularTuberculina(t: TipoPrueba | undefined, mm0: string, mm72: string): { diferencia: number; resultado: ResultadoPrueba } | null {
  if (!t || t.metodo !== "diferencia_mm" || !t.umbrales) return null;
  const a = num(mm0);
  const b = num(mm72);
  if (a == null || b == null) return null;
  const diferencia = Math.round((b - a) * 10) / 10;
  const neg = Number(t.umbrales.negativo_lt ?? 0);
  const pos = Number(t.umbrales.positivo_gte ?? Infinity);
  const resultado: ResultadoPrueba = diferencia >= pos ? "positivo" : diferencia < neg ? "negativo" : "sospechoso";
  return { diferencia, resultado };
}

export function umbralesTexto(t: TipoPrueba | undefined): string {
  if (!t?.umbrales) return "";
  const n = t.umbrales.negativo_lt;
  const p = t.umbrales.positivo_gte;
  if (n === p) return `negativo < ${n} mm · positivo ≥ ${p} mm`;
  return `negativo < ${n} mm · sospechoso ${n}–${p} mm · positivo ≥ ${p} mm`;
}

export const RESULTADO_TONO: Record<ResultadoPrueba, "success" | "warning" | "danger" | "neutral"> = {
  negativo: "success",
  sospechoso: "warning",
  positivo: "danger",
  no_concluyente: "neutral",
};
