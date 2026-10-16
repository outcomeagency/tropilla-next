/**
 * Catálogo web de eventos de hacienda (TPA-22, functional/02 §2.1): qué se
 * puede registrar desde el panel, sobre qué sujetos y cómo se agrupa. Los
 * nombres y el JSON Schema vienen de GET /catalogos; esto sólo ordena la UI.
 */

export type SujetoTipo = "animales" | "lote";

export interface TipoHacienda {
  codigo: string;
  titulo: string;
  /** Una línea para el selector. */
  corto: string;
  ayuda: string;
  grupo: "movimientos" | "bajas" | "manejo" | "altas" | "servicio" | "diagnostico" | "partos";
  sujetos: SujetoTipo[];
  /** Pantalla propia en vez del formulario genérico. */
  redirige?: string;
}

export const GRUPOS: Record<TipoHacienda["grupo"], string> = {
  altas: "Altas",
  movimientos: "Movimientos",
  manejo: "Manejo",
  bajas: "Bajas",
  servicio: "Servicio",
  diagnostico: "Diagnóstico",
  partos: "Partos y destete",
};

/** Grupos de cada módulo en el selector de «Registrar». */
export const GRUPOS_MODULO: Record<"hacienda" | "reproduccion", TipoHacienda["grupo"][]> = {
  hacienda: ["altas", "movimientos", "manejo", "bajas"],
  reproduccion: ["servicio", "diagnostico", "partos"],
};

export const TIPOS_HACIENDA: TipoHacienda[] = [
  { codigo: "hacienda.ingreso", corto: "Compra o llegada de hacienda", titulo: "Ingreso o compra", ayuda: "Hacienda que entra al campo: suma a un lote o da de alta animales con caravana.", grupo: "altas", sujetos: ["lote", "animales"] },
  { codigo: "hacienda.nacimiento", corto: "Cría de madre sin caravana o de lote", titulo: "Nacimiento", ayuda: "Cría de una madre fuera del sistema o de un lote sin caravanas. El parto de una vaca identificada va en Reproducción.", grupo: "altas", sujetos: ["animales", "lote"] },
  { codigo: "hacienda.traslado", corto: "Cambio de potrero", titulo: "Traslado de potrero", ayuda: "Cambia dónde está la hacienda dentro del establecimiento.", grupo: "movimientos", sujetos: ["animales", "lote"] },
  { codigo: "hacienda.cambio_lote", corto: "Pasar animales a otro lote", titulo: "Cambio de lote", ayuda: "Pasa animales identificados a otro lote de manejo.", grupo: "movimientos", sujetos: ["animales"] },
  { codigo: "hacienda.egreso", corto: "Venta o salida del campo", titulo: "Egreso o venta", ayuda: "Hacienda que sale del campo: venta, traslado a otro campo o entrega de contrato.", grupo: "movimientos", sujetos: ["animales", "lote"] },
  { codigo: "hacienda.pesaje", corto: "Sesión de pesada con ganancia diaria", titulo: "Pesaje", ayuda: "Peso individual con ganancia diaria; el promedio de lote se carga en la ficha del lote.", grupo: "manejo", sujetos: ["animales"], redirige: "/hacienda/pesajes" },
  { codigo: "hacienda.castracion", corto: "Sólo machos", titulo: "Castración", ayuda: "Sólo machos. Puede recategorizar (ternero → novillito).", grupo: "manejo", sujetos: ["animales"] },
  { codigo: "hacienda.denticion", corto: "Dientes a la boca", titulo: "Dentición", ayuda: "Dientes a la boca. En búfalos sugiere la categoría.", grupo: "manejo", sujetos: ["animales"] },
  { codigo: "hacienda.condicion_corporal", corto: "Escala 1-5 o 1-9", titulo: "Condición corporal", ayuda: "Escala 1-5 o 1-9, individual o promedio de lote.", grupo: "manejo", sujetos: ["animales", "lote"] },
  { codigo: "hacienda.recategorizacion", corto: "Cambiar la categoría a mano", titulo: "Recategorización manual", ayuda: "Cambia la categoría a mano. Las sugeridas por reglas se aplican desde Hacienda.", grupo: "manejo", sujetos: ["animales"] },
  { codigo: "hacienda.muerte", corto: "Causa y hallazgos", titulo: "Muerte", ayuda: "Resta del stock. Causa de la lista y hallazgos.", grupo: "bajas", sujetos: ["animales", "lote"] },
  { codigo: "hacienda.perdida", corto: "Faltante, pérdida o robo", titulo: "Pérdida o robo", ayuda: "Faltante en el recuento, pérdida o robo con denuncia.", grupo: "bajas", sujetos: ["animales", "lote"] },
  { codigo: "hacienda.faena", corto: "Frigorífico, tropa y pesos", titulo: "Faena", ayuda: "Frigorífico, tropa, pesos y tipificación.", grupo: "bajas", sujetos: ["animales", "lote"] },
  { codigo: "reproduccion.servicio_natural", corto: "Toros con los vientres", titulo: "Servicio natural", ayuda: "Toros (con caravana, un lote de toros o de afuera) y el período del servicio. Las hembras quedan «servidas».", grupo: "servicio", sujetos: ["animales", "lote"] },
  { codigo: "reproduccion.inseminacion", corto: "IA o IATF con datos del semen", titulo: "Inseminación", ayuda: "IA o IATF: toro y raza del semen, centro, partida e inseminador. La hembra queda «servida».", grupo: "servicio", sujetos: ["animales"] },
  { codigo: "reproduccion.tacto", corto: "Vacía o preñada, con fecha de parto", titulo: "Tacto o ecografía", ayuda: "Resultado y días de gestación: la fecha probable de parto sale de la gestación de la especie y la raza. Para muchas hembras seguidas usá la sesión de tacto.", grupo: "diagnostico", sujetos: ["animales"] },
  { codigo: "reproduccion.parto", corto: "Crías vinculadas a la madre", titulo: "Parto", ayuda: "Una madre por parto. Cada cría viva nace en el sistema con su madre; las muertas quedan registradas en el parto.", grupo: "partos", sujetos: ["animales"] },
  { codigo: "reproduccion.aborto", corto: "La hembra vuelve a vacía", titulo: "Aborto", ayuda: "Días de gestación estimados y causa presunta. La hembra vuelve a «vacía».", grupo: "partos", sujetos: ["animales"] },
  { codigo: "reproduccion.destete", corto: "Peso al destete, recategoriza", titulo: "Destete", ayuda: "Peso y tipo de destete de las crías (o de un lote). Recategoriza: ternera → vaquillona, bucerro → bubillito según la regla.", grupo: "partos", sujetos: ["animales", "lote"] },
];

export const tipoHacienda = (codigo: string) => TIPOS_HACIENDA.find((t) => t.codigo === codigo);

export const MOTIVOS_INGRESO = [
  ["compra", "Compra"],
  ["traslado_externo", "Traslado desde otro campo propio"],
  ["capitalizacion", "Capitalización"],
  ["devolucion", "Devolución"],
  ["otro", "Otro"],
] as const;

export const MOTIVOS_EGRESO = [
  ["venta", "Venta"],
  ["traslado_externo", "Traslado a otro campo"],
  ["entrega_contrato", "Entrega de contrato"],
  ["otro", "Otro"],
] as const;

export const TIPOS_PERDIDA = [
  ["faltante", "Faltante en el recuento"],
  ["perdida", "Pérdida"],
  ["robo", "Robo"],
] as const;

export const METODOS_CASTRACION = [
  ["quirurgico", "Quirúrgico"],
  ["goma", "Goma (anillo)"],
  ["burdizzo", "Burdizzo"],
  ["otro", "Otro"],
] as const;

export const TIPOS_IA = [
  ["ia", "IA (celo detectado)"],
  ["iatf", "IATF (a tiempo fijo)"],
] as const;

export const METODOS_TACTO = [
  ["tacto", "Tacto"],
  ["ecografia", "Ecografía"],
] as const;

export const TAMANOS = [
  ["chica", "Chica"],
  ["mediana", "Mediana"],
  ["grande", "Grande"],
] as const;

export const TIPOS_PARTO = [
  ["normal", "Normal"],
  ["asistido", "Asistido"],
  ["distocico", "Distócico"],
  ["cesarea", "Cesárea"],
] as const;

export const TIPOS_DESTETE = [
  ["tradicional", "Tradicional"],
  ["precoz", "Precoz"],
  ["hiperprecoz", "Hiperprecoz"],
] as const;

export const DENTICION = [
  ["leche", "Diente de leche"],
  ["2", "2 dientes"],
  ["4", "4 dientes"],
  ["6_mas", "6 o más (boca llena)"],
] as const;

export const FACILIDAD_PARTO = [
  ["normal", "Normal"],
  ["asistido", "Asistido"],
  ["distocico", "Distócico"],
  ["cesarea", "Cesárea"],
] as const;

/** Etiquetas legibles para claves y valores del payload (detalle del evento). */
export const ETIQUETAS: Record<string, string> = {
  motivo: "Motivo",
  destino: "Destino",
  comprador: "Comprador",
  dte_numero: "DT-e",
  destino_establecimiento: "Establecimiento de destino",
  renspa_destino_declarado: "RENSPA de destino (declarado)",
  origen: "Origen",
  vendedor: "Vendedor",
  localidad: "Localidad",
  establecimiento: "Establecimiento",
  renspa_declarado: "RENSPA (declarado)",
  causa: "Causa",
  causa_otra: "Otra causa",
  hallazgos: "Hallazgos",
  tipo: "Tipo",
  circunstancias: "Circunstancias",
  denuncia_numero: "N.º de denuncia",
  frigorifico: "Frigorífico",
  tropa_numero: "Tropa",
  peso_vivo_kg: "Peso vivo",
  pcc_kg: "Peso carcasa caliente",
  pcf_kg: "Peso carcasa fría",
  tipificacion: "Tipificación",
  categoria_faena: "Categoría de faena",
  decomisos: "Decomisos",
  metodo: "Método",
  categoria_nueva: "Categoría nueva",
  denticion: "Dentición",
  valor: "Valor",
  escala: "Escala",
  potrero_destino_id: "Potrero de destino",
  potrero_origen_id: "Potrero de origen",
  lote_destino_id: "Lote de destino",
  facilidad: "Facilidad de parto",
  madre_externa: "Madre (fuera del sistema)",
  madre_id: "Madre",
  peso_kg: "Peso",
  desbaste: "Desbaste",
  sugerida: "Sugerida por reglas",
  inicio: "Inicio del servicio",
  resultado: "Resultado",
  causa_presunta: "Causa presunta",
  dias_gestacion: "Días de gestación",
  tamano: "Tamaño",
  veterinario: "Veterinario",
  fin: "Fin del servicio",
  lote_toros_id: "Lote de toros",
  toros_externos: "Toros de afuera",
  semen: "Semen",
  toro_nombre: "Toro",
  raza: "Raza",
  centro: "Centro",
  partida: "Partida",
  inseminador: "Inseminador",
  protocolo: "Protocolo",
  dia_protocolo: "Día del protocolo",
};

export const VALORES: Record<string, string> = Object.fromEntries([
  ...MOTIVOS_INGRESO,
  ...MOTIVOS_EGRESO,
  ...TIPOS_PERDIDA,
  ...METODOS_CASTRACION,
  ...DENTICION,
  ...FACILIDAD_PARTO,
  ["faena", "Faena"],
  ["invernada", "Invernada"],
  ["cria", "Cría"],
  ["exportacion", "Exportación"],
  ["edad", "Edad"],
  ["destete", "Destete"],
  ["castracion", "Castración"],
  ["servicio", "Servicio"],
  ["parto", "Parto"],
  ["manual", "Manual"],
  ["inventario_inicial", "Inventario inicial"],
  ["alta_rapida", "Alta rápida"],
  ["importacion", "Planilla"],
  ["tradicional", "Tradicional"],
  ["precoz", "Precoz"],
  ["hiperprecoz", "Hiperprecoz"],
  ["vacia", "Vacía"],
  ["prenada", "Preñada"],
  ["tacto", "Tacto"],
  ["ecografia", "Ecografía"],
  ["chica", "Chica"],
  ["mediana", "Mediana"],
  ["grande", "Grande"],
  ["ia", "IA"],
  ["iatf", "IATF"],
  ["1-5", "1 a 5"],
  ["1-9", "1 a 9"],
]);
