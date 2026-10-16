/**
 * Mapa central de estados → tono semántico. Un estado significa siempre lo
 * mismo en todo el producto (visual-identity §6 «Estados inequívocos»).
 * Los componentes nunca eligen el color de un estado por su cuenta.
 */

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

/** Clases completas (Tailwind sólo genera lo que encuentra literal). */
export const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-neutral-bg text-neutral border-neutral-border",
  primary: "bg-campo-50 text-monte border-campo-50",
  success: "bg-success-bg text-success border-success-border",
  warning: "bg-warning-bg text-warning border-warning-border",
  danger: "bg-danger-bg text-danger border-danger-border",
  info: "bg-info-bg text-info border-info-border",
};

export type Estado =
  | "urgente"
  | "pendiente"
  | "informativo"
  | "por_revisar"
  | "sugerencia"
  | "vencido"
  | "retiro_vigente"
  | "al_dia";

export const ESTADOS: Record<Estado, { label: string; tone: Tone }> = {
  urgente: { label: "Urgente", tone: "warning" },
  pendiente: { label: "Pendiente", tone: "warning" },
  informativo: { label: "Informativo", tone: "info" },
  por_revisar: { label: "Por revisar", tone: "neutral" },
  sugerencia: { label: "Sugerencia", tone: "success" },
  vencido: { label: "Vencido", tone: "danger" },
  retiro_vigente: { label: "Retiro vigente", tone: "warning" },
  al_dia: { label: "Al día", tone: "success" },
};
