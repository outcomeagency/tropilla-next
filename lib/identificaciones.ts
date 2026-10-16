/**
 * Identificaciones del animal (TPA-19, functional/01-entidades §5): tipos,
 * etiquetas y reglas compartidas entre la ficha, los diálogos y el timeline.
 * Los tipos son el enum `Identificacion.tipo` del contrato (no están en /catalogos).
 */

export type TipoIdentificacion = "caravana_visual" | "caravana_oficial" | "rfid" | "tatuaje" | "marca_senal" | "registro_genealogico";

export const TIPOS_IDENTIFICACION: { k: TipoIdentificacion; l: string; d: string; multiple?: boolean }[] = [
  { k: "caravana_visual", l: "Caravana visual", d: "Número de manejo, el de todos los días." },
  { k: "caravana_oficial", l: "Caravana oficial", d: "CUIG / caravana SENASA." },
  { k: "rfid", l: "RFID", d: "Electrónica de 15 dígitos (bastón o lector)." },
  { k: "tatuaje", l: "Tatuaje", d: "En búfalos, con el prefijo de la raza." },
  { k: "marca_senal", l: "Marca o señal", d: "Marca a fuego o señal del productor.", multiple: true },
  { k: "registro_genealogico", l: "Registro genealógico", d: "Entidad (AACB, SRA), tipo y número.", multiple: true },
];

const LABEL: Record<string, string> = Object.fromEntries(TIPOS_IDENTIFICACION.map((t) => [t.k, t.l]));
// Claves viejas que pudieran venir de datos anteriores al enum.
LABEL.marca = "Marca o señal";
LABEL.registro = "Registro genealógico";

export function tipoIdentLabel(tipo?: string | null): string {
  return (tipo && LABEL[tipo]) || tipo || "Identificación";
}

/** Tipos con una sola vigente por animal: colocar otra reemplaza la anterior (la API lo proyecta así). */
export function esUnicaPorAnimal(tipo: string): boolean {
  return !TIPOS_IDENTIFICACION.find((t) => t.k === tipo)?.multiple;
}

/** Igual que la API: mayúsculas, sin espacios ni guiones. */
export function normalizarIdent(v: string): string {
  return v.toUpperCase().replace(/[\s-]/g, "");
}

export const TIPOS_REGISTRO = ["P1", "P2", "D", "C", "B1", "B2", "otro"] as const;
export const ENTIDADES_REGISTRO = ["AACB", "SRA"] as const;

/** Motivos de retiro/reposición: viajan en `observaciones` del evento (el payload no tiene motivo). */
export const MOTIVOS_RETIRO: { k: string; l: string }[] = [
  { k: "perdida", l: "Se perdió" },
  { k: "rota", l: "Se rompió o no se lee" },
  { k: "renumeracion", l: "Cambio de numeración" },
  { k: "error_carga", l: "Error de carga" },
  { k: "otro", l: "Otro motivo" },
];

export const ACCION_LABEL: Record<string, string> = { colocacion: "Colocación", reposicion: "Reposición", retiro: "Retiro" };

/** «Reposicion: caravana_visual 0142B» (resumen crudo de la API) → «Reposición: Caravana visual 0142B». */
export function resumenIdentificacion(resumen?: string | null): string | undefined {
  if (!resumen) return undefined;
  const m = /^(Colocacion|Reposicion|Retiro): (\S+) (.+)$/.exec(resumen);
  if (!m) return resumen;
  return `${ACCION_LABEL[m[1].toLowerCase()]}: ${tipoIdentLabel(m[2])} ${m[3]}`;
}
