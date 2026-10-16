/**
 * Provincias y departamentos (códigos INDEC, como valida la API: provincia
 * `18`, departamento `18063`). Corrientes coincide con el seeder de la API
 * (GeoDepartamentosSeeder); Chaco, Formosa y Misiones usan la codificación
 * INDEC y la API hoy sólo valida su formato. Cuando `/catalogos` publique
 * `geo`, reemplazar esta lista por la del catálogo.
 */
type Dep = [codigo: string, nombre: string];

const RAW: Array<{ codigo: string; nombre: string; departamentos: Dep[] }> = [
  {
    codigo: "18",
    nombre: "Corrientes",
    departamentos: [
      ["18007", "Bella Vista"], ["18014", "Berón de Astrada"], ["18021", "Capital"], ["18028", "Concepción"],
      ["18035", "Curuzú Cuatiá"], ["18042", "Empedrado"], ["18049", "Esquina"], ["18056", "General Alvear"],
      ["18063", "General Paz"], ["18070", "Goya"], ["18077", "Itatí"], ["18084", "Ituzaingó"], ["18091", "Lavalle"],
      ["18098", "Mburucuyá"], ["18105", "Mercedes"], ["18112", "Monte Caseros"], ["18119", "Paso de los Libres"],
      ["18126", "Saladas"], ["18133", "San Cosme"], ["18140", "San Luis del Palmar"], ["18147", "San Martín"],
      ["18154", "San Miguel"], ["18161", "San Roque"], ["18168", "Santo Tomé"], ["18175", "Sauce"],
    ],
  },
  {
    codigo: "22",
    nombre: "Chaco",
    departamentos: [
      ["22007", "Almirante Brown"], ["22014", "Bermejo"], ["22021", "Comandante Fernández"], ["22028", "Chacabuco"],
      ["22036", "Doce de Octubre"], ["22039", "Dos de Abril"], ["22043", "Fray Justo Santa María de Oro"],
      ["22049", "General Belgrano"], ["22056", "General Donovan"], ["22063", "General Güemes"], ["22070", "Independencia"],
      ["22077", "Libertad"], ["22084", "Libertador General San Martín"], ["22091", "Maipú"], ["22098", "Mayor Luis J. Fontana"],
      ["22105", "Nueve de Julio"], ["22112", "O'Higgins"], ["22119", "Presidencia de la Plaza"], ["22126", "Primero de Mayo"],
      ["22133", "Quitilipi"], ["22140", "San Fernando"], ["22147", "San Lorenzo"], ["22154", "Sargento Cabral"],
      ["22161", "Tapenagá"], ["22168", "Veinticinco de Mayo"],
    ],
  },
  {
    codigo: "34",
    nombre: "Formosa",
    departamentos: [
      ["34007", "Bermejo"], ["34014", "Formosa"], ["34021", "Laishí"], ["34028", "Matacos"], ["34035", "Patiño"],
      ["34042", "Pilagás"], ["34049", "Pilcomayo"], ["34056", "Pirané"], ["34063", "Ramón Lista"],
    ],
  },
  {
    codigo: "54",
    nombre: "Misiones",
    departamentos: [
      ["54007", "Apóstoles"], ["54014", "Cainguás"], ["54021", "Candelaria"], ["54028", "Capital"], ["54035", "Concepción"],
      ["54042", "Eldorado"], ["54049", "General Manuel Belgrano"], ["54056", "Guaraní"], ["54063", "Iguazú"],
      ["54070", "Leandro N. Alem"], ["54077", "Libertador General San Martín"], ["54084", "Montecarlo"], ["54091", "Oberá"],
      ["54098", "San Ignacio"], ["54105", "San Javier"], ["54112", "San Pedro"], ["54119", "Veinticinco de Mayo"],
    ],
  },
];

export interface Departamento {
  codigo: string;
  nombre: string;
}
export interface Provincia {
  codigo: string;
  nombre: string;
  departamentos: Departamento[];
}

export const PROVINCIAS: Provincia[] = RAW.map((p) => ({
  codigo: p.codigo,
  nombre: p.nombre,
  departamentos: p.departamentos.map(([codigo, nombre]) => ({ codigo, nombre })),
}));

const BY_CODE = new Map(PROVINCIAS.map((p) => [p.codigo, p]));

export function provinciaNombre(codigo?: string | null): string {
  return (codigo && BY_CODE.get(codigo)?.nombre) || codigo || "";
}

export function departamentoNombre(codigo?: string | null): string {
  if (!codigo) return "";
  const prov = BY_CODE.get(codigo.slice(0, 2));
  return prov?.departamentos.find((d) => d.codigo === codigo)?.nombre ?? codigo;
}

/** «General Paz, Corrientes» */
export function ubicacionCorta(provincia?: string | null, departamento?: string | null, localidad?: string | null): string {
  return [localidad || departamentoNombre(departamento), provinciaNombre(provincia)].filter(Boolean).join(", ");
}

export const ACTIVIDADES = [
  { codigo: "cria", nombre: "Cría", en: "Cow-calf", pt: "Cria" },
  { codigo: "recria", nombre: "Recría", en: "Backgrounding", pt: "Recria" },
  { codigo: "invernada", nombre: "Invernada / engorde", en: "Finishing", pt: "Engorda" },
  { codigo: "feedlot", nombre: "Feedlot", en: "Feedlot", pt: "Confinamento" },
  { codigo: "cabana", nombre: "Cabaña", en: "Seedstock", pt: "Cabanha" },
  { codigo: "tambo", nombre: "Tambo", en: "Dairy", pt: "Leite" },
] as const;

export function actividadNombre(codigo: string, locale: "es" | "en" | "pt" = "es"): string {
  const a = ACTIVIDADES.find((x) => x.codigo === codigo);
  if (!a) return codigo;
  return locale === "en" ? a.en : locale === "pt" ? a.pt : a.nombre;
}
