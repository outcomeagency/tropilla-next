/** Lotes de manejo (TPA-20): textos compartidos entre listado, ficha y diálogos. */

export const PROPOSITOS: Array<{ codigo: string; nombre: string }> = [
  { codigo: "cria", nombre: "Cría" },
  { codigo: "recria", nombre: "Recría" },
  { codigo: "engorde", nombre: "Engorde" },
  { codigo: "reproductores", nombre: "Reproductores" },
  { codigo: "venta", nombre: "Venta" },
  { codigo: "descarte", nombre: "Descarte" },
];

export function propositoNombre(codigo?: string | null): string {
  if (!codigo) return "";
  return PROPOSITOS.find((p) => p.codigo === codigo)?.nombre ?? codigo;
}

export interface CategoriaOpcion {
  codigo: string;
  nombre: string;
  sexo: "M" | "H" | null;
}

/** Mensajes de éxito tras redirigir a la ficha (`?ok=`). */
export const OK_LOTE: Record<string, { titulo: string; detalle?: string; tone?: "success" | "warning" }> = {
  creado: { titulo: "Lote creado", detalle: "El conteo y el potrero quedaron como eventos en la historia del lote." },
  creado_sin_conteo: { titulo: "El lote se creó, pero el conteo inicial no se guardó", detalle: "Cargalo con «Sumar cabezas».", tone: "warning" },
  creado_sin_potrero: { titulo: "El lote se creó, pero no pudimos ubicarlo en el potrero", detalle: "Usá «Mover a otro potrero».", tone: "warning" },
  editado: { titulo: "Cambios guardados" },
  traslado: { titulo: "Traslado registrado", detalle: "El lote figura ahora en el potrero nuevo." },
  alta: { titulo: "Cabezas sumadas al lote", detalle: "Quedó como alta en la historia del lote." },
  pesaje: { titulo: "Pesaje promedio registrado", detalle: "Actualiza el peso promedio y la ganancia diaria del lote." },
  muerte: { titulo: "Muerte registrada", detalle: "Se descontó del conteo del lote." },
  egreso: { titulo: "Salida registrada", detalle: "Se descontó del conteo del lote." },
  individualizado: { titulo: "Animales individualizados", detalle: "Ya tienen ficha propia y heredan la historia grupal del lote." },
};
