/** Vocabulario de Sanidad (TPA-31..35). Los códigos son los del contrato; los nombres, de la UI. */

export const TIPOS_PRODUCTO = [
  ["vacuna", "Vacuna"],
  ["antiparasitario_interno", "Antiparasitario interno"],
  ["antiparasitario_externo", "Antiparasitario externo"],
  ["antibiotico", "Antibiótico"],
  ["hormona", "Hormona"],
  ["otro", "Otro"],
] as const;

export const VIAS = [
  ["subcutanea", "Subcutánea"],
  ["intramuscular", "Intramuscular"],
  ["oral", "Oral"],
  ["pour_on", "Pour-on (dorsal)"],
  ["intranasal", "Intranasal"],
  ["otra", "Otra"],
] as const;

export const NUMERO_DOSIS = [
  ["primera", "Primera dosis"],
  ["refuerzo", "Refuerzo"],
  ["anual", "Anual"],
  ["unica", "Única"],
] as const;

export const TIPOS_DESPARASITACION = [
  ["interno", "Interna"],
  ["externo", "Externa"],
  ["ambos", "Interna y externa"],
] as const;

export const METODOS_DOSIFICACION = [
  ["individual", "Por el peso de cada animal"],
  ["por_el_mas_pesado", "Por el más pesado del grupo"],
] as const;

export const TIPOS_ANALISIS = [
  ["coprologico", "Coprológico"],
  ["frotis", "Frotis"],
  ["ifd", "IFD"],
  ["mat", "MAT (leptospirosis)"],
  ["serologia", "Serología"],
  ["otro", "Otro"],
] as const;

export const RESULTADOS_PRUEBA = [
  ["negativo", "Negativo"],
  ["sospechoso", "Sospechoso"],
  ["positivo", "Positivo"],
  ["no_concluyente", "No concluyente"],
] as const;

const mapa = (l: readonly (readonly [string, string])[]) => new Map(l.map(([c, n]) => [c, n]));
const TP = mapa(TIPOS_PRODUCTO);
const VI = mapa(VIAS);

export const tipoProductoNombre = (c?: string | null) => (c ? (TP.get(c) ?? c) : "");
export const viaNombre = (c?: string | null) => (c ? (VI.get(c) ?? c) : "");

/** «35 días» / «Sin retiro» (0) / null si no se cargó. */
export function retiroTexto(dias?: number | null): string | null {
  if (dias == null) return null;
  if (dias === 0) return "Sin retiro";
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}
