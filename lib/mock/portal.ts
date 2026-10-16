/**
 * ⚠ DATOS DE EJEMPLO DEL PORTAL PÚBLICO ⚠
 * Productores ficticios del NEA (nombres inventados, zonas reales) para el
 * directorio, perfiles y ofertas mientras /public/* no exista en la API.
 * Sólo se usan a través de withMock()/withMockIf() y la UI lo avisa.
 */
import type { S } from "@/lib/schemas";

export interface MockProductor extends S<"DirectorioItem"> {
  /** Categorías con oferta activa (para el filtro). */
  categorias: string[];
  localidad?: string;
}

const d = (dias: number) => new Date(Date.UTC(2026, 9, 16, 12) - dias * 86_400_000).toISOString();

export const MOCK_PRODUCTORES: MockProductor[] = [
  {
    slug: "la-esperanza",
    nombre: "La Esperanza",
    provincia: "18",
    departamento: "18063",
    localidad: "Caá Catí",
    especies: ["BUB", "BOV"],
    razas: ["BUB_MEDITERRANEA", "BOV_BRAFORD"],
    ofertas_activas: 2,
    contratos_abiertos: 1,
    insignias: ["historial_12m", "identificacion_individual", "documentos_publicos"],
    categorias: ["BUB_BUBILLO", "BOV_TERNERO"],
    actualizado_en: d(0),
  },
  {
    slug: "estancia-nandubay",
    nombre: "Estancia Ñandubay",
    provincia: "18",
    departamento: "18105",
    especies: ["BOV"],
    razas: ["BOV_BRANGUS"],
    ofertas_activas: 1,
    contratos_abiertos: 0,
    insignias: ["historial_12m", "responde_rapido"],
    categorias: ["BOV_VAQUILLONA"],
    actualizado_en: d(1),
  },
  {
    slug: "el-banado",
    nombre: "El Bañado",
    provincia: "18",
    departamento: "18154",
    especies: ["BUB"],
    razas: ["BUB_MURRAH", "BUB_MEDITERRANEA"],
    ofertas_activas: 1,
    contratos_abiertos: 1,
    insignias: ["identificacion_individual"],
    categorias: ["BUB_BUBILLA"],
    actualizado_en: d(2),
  },
  {
    slug: "cabana-santa-clara",
    nombre: "Cabaña Santa Clara",
    provincia: "18",
    departamento: "18035",
    especies: ["BOV"],
    razas: ["BOV_BRAFORD"],
    ofertas_activas: 1,
    contratos_abiertos: 0,
    insignias: ["historial_12m", "documentos_publicos"],
    categorias: ["BOV_TORITO"],
    actualizado_en: d(3),
  },
  {
    slug: "los-lapachos",
    nombre: "Los Lapachos",
    provincia: "22",
    departamento: "22119",
    especies: ["BOV"],
    razas: ["BOV_BRAHMAN", "BOV_CRUZA_CEBUINA"],
    ofertas_activas: 0,
    contratos_abiertos: 1,
    insignias: ["identificacion_individual"],
    categorias: [],
    actualizado_en: d(4),
  },
  {
    slug: "puerto-ita",
    nombre: "Puerto Itá",
    provincia: "18",
    departamento: "18084",
    localidad: "Villa Olivari",
    especies: ["BUB"],
    razas: ["BUB_MEDITERRANEA"],
    ofertas_activas: 1,
    contratos_abiertos: 0,
    insignias: ["historial_12m"],
    categorias: ["BUB_BUFALA"],
    actualizado_en: d(6),
  },
  {
    slug: "don-aurelio",
    nombre: "Don Aurelio",
    provincia: "34",
    departamento: "34056",
    especies: ["BOV"],
    razas: ["BOV_CRIOLLO", "BOV_CRUZA_CEBUINA"],
    ofertas_activas: 0,
    contratos_abiertos: 0,
    insignias: [],
    categorias: [],
    actualizado_en: d(9),
  },
  {
    slug: "campo-las-tunas",
    nombre: "Campo Las Tunas",
    provincia: "22",
    departamento: "22014",
    especies: ["BUB", "BOV"],
    razas: ["BUB_JAFARABADI", "BOV_BRAFORD"],
    ofertas_activas: 1,
    contratos_abiertos: 0,
    insignias: ["responde_rapido"],
    categorias: ["BUB_BUBILLO"],
    actualizado_en: d(12),
  },
  {
    slug: "nu-pora",
    nombre: "Ñu Porá",
    provincia: "54",
    departamento: "54007",
    especies: ["BOV"],
    razas: ["BOV_BRAFORD", "BOV_HEREFORD"],
    ofertas_activas: 1,
    contratos_abiertos: 0,
    insignias: ["documentos_publicos"],
    categorias: ["BOV_NOVILLO"],
    actualizado_en: d(15),
  },
];

export interface DirectorioQuery {
  q?: string;
  provincia?: string;
  especie?: string;
  raza?: string;
  categoria?: string;
  con_oferta?: string;
  con_contrato?: string;
}

/** Mismo filtrado que el endpoint, sobre los datos de ejemplo. */
export function mockDirectorio(query: DirectorioQuery, nombres: (p: MockProductor) => string): S<"DirectorioItem">[] {
  const q = (query.q ?? "").trim().toLowerCase();
  return MOCK_PRODUCTORES.filter((p) => {
    if (query.provincia && p.provincia !== query.provincia) return false;
    if (query.especie && !p.especies?.includes(query.especie as "BOV" | "BUB")) return false;
    if (query.raza && !p.razas?.includes(query.raza)) return false;
    if (query.categoria && !p.categorias.includes(query.categoria)) return false;
    if (query.con_oferta && !p.ofertas_activas) return false;
    if (query.con_contrato && !p.contratos_abiertos) return false;
    if (q && !nombres(p).toLowerCase().includes(q)) return false;
    return true;
  });
}
