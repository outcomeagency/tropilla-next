/**
 * Planilla de stock (TPA-21): columnas, lectura de CSV y armado de la fila
 * «como en la planilla» a partir de lo que la API normalizó. Corre en server y cliente.
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

/** CSV → filas (comillas dobles, CRLF/LF). */
export function parseCsv(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Str::slug($h, '_') de Laravel, suficiente para encabezados. */
function slug(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Lee el CSV igual que la API (LectorPlanilla): separador por mayoría en la
 * primera línea, sin BOM, salteando filas vacías. Fila 1 = primera fila de datos.
 */
export function leerCsv(text: string): FilaPlanilla[] {
  const limpio = text.replace(/^﻿/, "");
  const primera = limpio.split("\n", 1)[0] ?? "";
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const [enc, ...resto] = parseCsv(limpio, sep);
  if (!enc) return [];
  const claves = enc.map((h) => slug(h.trim()));
  const filas: FilaPlanilla[] = [];
  for (const r of resto) {
    if (!r.some((v) => v.trim() !== "")) continue;
    const f: FilaPlanilla = {};
    claves.forEach((k, i) => {
      if ((COLUMNAS as readonly string[]).includes(k)) f[k as Columna] = (r[i] ?? "").trim();
    });
    filas.push(f);
  }
  return filas;
}

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
 * La API guarda cada fila ya normalizada (códigos e ids) y descarta los
 * valores que no pudo interpretar. Para corregir hace falta la fila «como en
 * la planilla»: se rearma desde `datos` y, para las columnas con error, se toma
 * lo que el productor escribió (`cruda`, leída del archivo en el navegador).
 */
export function filaPlanilla(datos: Record<string, unknown>, errores: string[], n: Nombres, cruda?: FilaPlanilla): FilaPlanilla {
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
    if ((COLUMNAS as readonly string[]).includes(col) && !f[col] && cruda?.[col]) f[col] = cruda[col];
  }
  return f;
}
