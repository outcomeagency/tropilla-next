import type { Tone } from "./status";

/** Textos y tonos del resultado de faena (TPA-67), compartidos por listado, detalle y formularios. */
export const ESTADO_ANIMAL: Record<string, { label: string; tone: Tone }> = {
  conciliado: { label: "Conciliado", tone: "success" },
  faltante: { label: "Faltante", tone: "danger" },
  no_estaba_en_la_venta: { label: "No estaba en la venta", tone: "warning" },
};

export const ORIGEN: Record<string, string> = {
  declarado: "Cargado a mano",
  importado: "Planilla del frigorífico",
  transcripcion_revisada: "Transcripción revisada",
};

const kgF = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const pctF = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const kg = (v?: string | number | null) => (v == null || v === "" ? "—" : `${kgF.format(Number(v))} kg`);
export const pct = (v?: string | number | null) => (v == null || v === "" ? "—" : `${pctF.format(Number(v))} %`);
export function dinero(v?: string | number | null, moneda = "ARS") {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda === "USD" ? "USD" : "ARS", maximumFractionDigits: 0 }).format(Number(v));
}
