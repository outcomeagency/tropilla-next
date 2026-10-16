/**
 * Planilla de stock (TPA-21): columnas y armado de la fila «como en la planilla»
 * a partir de los datos normalizados y de `ImportacionFila.original`.
 */

/** Columnas de la plantilla (ValidadorFila::COLUMNAS de la API), en orden. */
export const COLUMNAS = [
  "especie", "sexo", "categoria", "raza", "caravana", "caravana_oficial", "rfid", "tatuaje", "marca",
  "fecha_nacimiento", "nacimiento_estimado", "castrado", "denticion", "lote", "potrero", "senas",
] as const;
export type Columna = (typeof COLUMNAS)[number];
export type FilaPlanilla = Partial<Record<Columna, string>>;

export const COLUMNA_LABEL: Record<Columna | "fila", string> = {
  especie: "Especie",
  sexo: "Sexo",
  categoria: "Categoría",
  raza: "Raza",
  caravana: "Caravana",
  caravana_oficial: "Caravana oficial",
  rfid: "RFID",
  tatuaje: "Tatuaje",
  marca: "Marca / señal",
  fecha_nacimiento: "Nacimiento",
  nacimiento_estimado: "Nac. estimado",
  castrado: "Castrado",
  denticion: "Dentición",
  lote: "Lote",
  potrero: "Potrero",
  senas: "Señas",
  fila: "Fila",
};

const TIPO_COLUMNA: Record<string, Columna> = {
  caravana_visual: "caravana",
  caravana_oficial: "caravana_oficial",
  rfid: "rfid",
  tatuaje: "tatuaje",
  marca_senal: "marca",
};

export interface Nombres {
  categoria: Map<string, string>;
  raza: Map<string, string>;
  lote: Map<string, string>;
  potrero: Map<string, string>;
}

/**
 * La API guarda cada fila normalizada y también `original`, con las claves de
 * la plantilla. Para columnas con error se conserva ese texto exacto; en filas
 * antiguas sin `original` el editor muestra el fallback «Falta».
 */
export function filaPlanilla(
  datos: Record<string, unknown>,
  errores: string[],
  n: Nombres,
  original?: Partial<Record<Columna, string>> | null,
): FilaPlanilla {
  const s = (v: unknown) => (v == null ? "" : String(v));
  const bool = (v: unknown) => (v === true ? "si" : v === false ? "no" : "");
  const f: FilaPlanilla = {
    especie: s(datos.especie),
    sexo: s(datos.sexo),
    categoria: datos.categoria ? (n.categoria.get(s(datos.categoria)) ?? s(datos.categoria)) : "",
    raza: datos.raza ? (n.raza.get(s(datos.raza)) ?? s(datos.raza)) : "",
    fecha_nacimiento: s(datos.fecha_nacimiento),
    nacimiento_estimado: bool(datos.nacimiento_estimado),
    castrado: bool(datos.castrado),
    denticion: datos.denticion === "6_mas" ? "6+" : s(datos.denticion),
    lote: datos.lote_id ? (n.lote.get(s(datos.lote_id)) ?? "") : "",
    potrero: datos.potrero_id ? (n.potrero.get(s(datos.potrero_id)) ?? "") : "",
    senas: s(datos.senas),
  };
  for (const i of (datos.identificaciones as Array<{ tipo?: string; valor?: string }> | undefined) ?? []) {
    const col = TIPO_COLUMNA[i.tipo ?? ""];
    if (col && !f[col]) f[col] = s(i.valor);
  }
  for (const c of errores) {
    const col = c as Columna;
    if ((COLUMNAS as readonly string[]).includes(col)) f[col] = original?.[col] ?? "";
  }
  return f;
}
