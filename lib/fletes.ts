import type { S } from "./schemas";
import type { Tone } from "./status";

/** Matching de camiones jaula (TPA-73): etiquetas compartidas entre la vista del productor y la mesa del concierge. */

export type Pedido = S<"FletePedido">;
export type PedidoConcierge = S<"FletePedidoConcierge">;
export type Propuesta = S<"FletePropuesta">;
export type Compatibilidad = S<"FleteCompatibilidad">;
export type Transportista = S<"FleteTransportista">;
export type Disponibilidad = S<"FleteDisponibilidad">;
export type EstadoPedido = Pedido["estado"];

export const ESTADO_PEDIDO: Record<EstadoPedido, { label: string; tone: Tone; ayuda: string }> = {
  pendiente: { label: "Recibido", tone: "neutral", ayuda: "Una persona del equipo lo va a tomar y te va a escribir." },
  en_gestion: { label: "En gestión", tone: "info", ayuda: "El equipo está buscando camiones compatibles con tu ruta y fecha." },
  propuesto: { label: "Para decidir", tone: "warning", ayuda: "Tenés propuestas para revisar. Elegí una o rechazalas." },
  contactado: { label: "En contacto", tone: "info", ayuda: "Ya tenés el contacto del transportista. Cuando cierren, registrá el resultado." },
  acordado: { label: "Acordado", tone: "success", ayuda: "Flete acordado con un transportista del piloto." },
  sin_acuerdo: { label: "Sin acuerdo", tone: "neutral", ayuda: "El pedido se cerró sin acuerdo." },
  cancelado: { label: "Cancelado", tone: "neutral", ayuda: "El pedido se canceló." },
};

export const ESTADO_PROPUESTA: Record<Propuesta["estado"], { label: string; tone: Tone }> = {
  propuesta: { label: "Pendiente", tone: "warning" },
  aceptada: { label: "Aceptada", tone: "success" },
  rechazada: { label: "Rechazada", tone: "neutral" },
  retirada: { label: "Retirada", tone: "neutral" },
};

export const ESTADO_DOCUMENTO: Record<S<"FleteDocumento">["estado"], { label: string; tone: Tone }> = {
  pendiente: { label: "Sin verificar", tone: "warning" },
  verificado: { label: "Verificado", tone: "success" },
  observado: { label: "Observado", tone: "danger" },
  no_aplica: { label: "No aplica", tone: "neutral" },
  vencido: { label: "Vencido", tone: "danger" },
};

export const CRITERIO: Record<string, string> = {
  fechas: "Fechas",
  salida: "Salida",
  destino: "Destino",
  capacidad: "Capacidad",
  retorno: "Retorno",
  documentacion: "Documentación",
  manual: "Coordinación",
};

export const ACCION_HISTORIAL: Record<string, string> = {
  pedido_creado: "Pidió el flete",
  pedido_en_gestion: "Tomó el pedido",
  propuesta_enviada: "Propuso un camión",
  propuesta_retirada: "Retiró una propuesta",
  propuesta_aceptada: "Aceptó una propuesta",
  propuesta_rechazada: "Rechazó una propuesta",
  contacto_compartido: "Se compartieron los datos de contacto",
  pedido_cancelado: "Canceló el pedido",
  resultado_registrado: "Registró el resultado",
  transportista_alta: "Dio de alta al transportista",
  transportista_editado: "Editó los datos",
  documento_verificado: "Verificó un documento",
  documento_observado: "Observó un documento",
  documento_pendiente: "Volvió un documento a pendiente",
  documento_no_aplica: "Marcó un documento como no aplica",
  disponibilidad_alta: "Cargó una disponibilidad",
  disponibilidad_cerrada: "Cerró una disponibilidad",
};

export const ESPECIE: Record<string, string> = { BOV: "Bovinos", BUB: "Búfalos" };

export const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function dinero(v?: string | number | null): string {
  if (v == null || v === "") return "—";
  return pesos.format(Number(v));
}

/** «12 al 18 nov» / «12 nov» para ventanas de fecha cortas. */
export function ventana(desde: string, hasta: string): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const [, m1, d1] = desde.split("-").map(Number);
  const [, m2, d2] = hasta.split("-").map(Number);
  if (desde === hasta) return `${d1} ${meses[m1 - 1]}`;
  if (m1 === m2) return `${d1} al ${d2} ${meses[m2 - 1]}`;
  return `${d1} ${meses[m1 - 1]} al ${d2} ${meses[m2 - 1]}`;
}
