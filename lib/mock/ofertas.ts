/**
 * ⚠ DATOS DE EJEMPLO ⚠ — ofertas publicadas y perfiles públicos ficticios
 * (ver lib/mock/portal.ts). Reemplazados por GET /public/ofertas/{codigo} y
 * GET /public/establecimientos/{slug}. Los textos libres del productor van
 * en español en los tres idiomas (así los devuelve la API).
 */
import "server-only";
import type { Locale } from "@/lib/i18n";
import type { S } from "@/lib/schemas";
import { ubicacionCorta } from "@/lib/geo";
import { MOCK_PRODUCTORES } from "./portal";

const LEYENDA: Record<Locale, string> = {
  es: "La información fue declarada por el productor. TROPILLA registra evidencia de integridad de los datos; no certifica su contenido ni reemplaza habilitaciones oficiales.",
  en: "The information was declared by the producer. TROPILLA records integrity evidence of the data; it does not certify its content or replace official approvals.",
  pt: "As informações foram declaradas pelo produtor. A TROPILLA registra evidências de integridade dos dados; não certifica seu conteúdo nem substitui habilitações oficiais.",
};

/** Huella de ejemplo determinística (64 hex) a partir de un texto. */
export function mockHuella(seed: string): string {
  let h = 0x811c9dc5;
  let out = "";
  for (let i = 0; out.length < 64; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 0x01000193) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

interface Semilla {
  codigo: string;
  slug: string;
  titulo: Record<Locale, string>;
  especie: "BOV" | "BUB";
  categoria: string;
  raza: string;
  cantidad: number;
  peso?: { promedio: string; min: string; max: string; fecha: string; metodo: "balanza" | "estimado" };
  edad?: { min: number; max: number };
  clase?: string;
  sanidad: Array<{ evento: string; detalle: string; fecha: string; confianza: "declarado" | "integridad_registrada" }>;
  sinRetiro: boolean;
  nacidosPct?: number;
  sistema: string;
  condiciones: { modalidad: string; precio: string; lugar_carga: string; disponible_desde: string };
  fotos: S<"Foto">[];
  actualizado: string;
  estado?: "publicada" | "reservada";
}

const SEMILLAS: Semilla[] = [
  {
    codigo: "LE0142",
    slug: "la-esperanza",
    titulo: { es: "30 bubillos Mediterráneos", en: "30 Mediterranean buffalo steers", pt: "30 bois bubalinos Mediterrâneos" },
    especie: "BUB",
    categoria: "BUB_BUBILLO",
    raza: "BUB_MEDITERRANEA",
    cantidad: 30,
    peso: { promedio: "468", min: "441", max: "502", fecha: "2026-10-10", metodo: "balanza" },
    edad: { min: 24, max: 28 },
    clase: "Bubillo joven pesado",
    sanidad: [
      { evento: "Aftosa", detalle: "2ª campaña 2026", fecha: "2026-05-14", confianza: "integridad_registrada" },
      { evento: "Rabia paresiante", detalle: "Refuerzo anual", fecha: "2026-06-02", confianza: "integridad_registrada" },
      { evento: "Desparasitación", detalle: "Interna, con análisis coproparasitológico", fecha: "2026-08-20", confianza: "declarado" },
    ],
    sinRetiro: true,
    nacidosPct: 100,
    sistema: "Sistema pastoril en humedal",
    condiciones: { modalidad: "en_pie", precio: "a_consultar", lugar_carga: "En el establecimiento, General Paz (Corrientes)", disponible_desde: "2026-11-02" },
    fotos: [],
    actualizado: "2026-10-16T10:24:00.000Z",
  },
  {
    codigo: "LE0157",
    slug: "la-esperanza",
    titulo: { es: "45 terneros Braford", en: "45 Braford bull calves", pt: "45 bezerros Braford" },
    especie: "BOV",
    categoria: "BOV_TERNERO",
    raza: "BOV_BRAFORD",
    cantidad: 45,
    peso: { promedio: "186", min: "165", max: "212", fecha: "2026-10-03", metodo: "balanza" },
    edad: { min: 6, max: 8 },
    sanidad: [
      { evento: "Aftosa", detalle: "2ª campaña 2026", fecha: "2026-05-14", confianza: "integridad_registrada" },
      { evento: "Clostridiales", detalle: "Dos dosis", fecha: "2026-09-01", confianza: "integridad_registrada" },
    ],
    sinRetiro: true,
    nacidosPct: 100,
    sistema: "Cría a campo natural con suplementación invernal",
    condiciones: { modalidad: "en_pie", precio: "a_consultar", lugar_carga: "En el establecimiento, General Paz (Corrientes)", disponible_desde: "2026-10-25" },
    fotos: [],
    actualizado: "2026-10-12T15:10:00.000Z",
  },
  {
    codigo: "EN0031",
    slug: "estancia-nandubay",
    titulo: { es: "60 vaquillonas Brangus", en: "60 Brangus heifers", pt: "60 novilhas Brangus" },
    especie: "BOV",
    categoria: "BOV_VAQUILLONA",
    raza: "BOV_BRANGUS",
    cantidad: 60,
    peso: { promedio: "312", min: "290", max: "338", fecha: "2026-07-28", metodo: "estimado" },
    edad: { min: 18, max: 20 },
    sanidad: [{ evento: "Brucelosis", detalle: "Vacunadas con cepa 19", fecha: "2025-09-10", confianza: "declarado" }],
    sinRetiro: true,
    nacidosPct: 80,
    sistema: "Recría sobre pastura implantada",
    condiciones: { modalidad: "en_pie", precio: "a_consultar", lugar_carga: "Mercedes (Corrientes)", disponible_desde: "2026-11-15" },
    fotos: [],
    actualizado: "2026-10-15T09:00:00.000Z",
  },
  {
    codigo: "EB0012",
    slug: "el-banado",
    titulo: { es: "25 bubillas Murrah", en: "25 Murrah buffalo heifers", pt: "25 novilhas bubalinas Murrah" },
    especie: "BUB",
    categoria: "BUB_BUBILLA",
    raza: "BUB_MURRAH",
    cantidad: 25,
    peso: { promedio: "355", min: "330", max: "380", fecha: "2026-09-30", metodo: "balanza" },
    edad: { min: 20, max: 24 },
    sanidad: [{ evento: "Aftosa", detalle: "2ª campaña 2026", fecha: "2026-05-20", confianza: "integridad_registrada" }],
    sinRetiro: true,
    nacidosPct: 100,
    sistema: "Pastoril en bañado y monte",
    condiciones: { modalidad: "en_pie", precio: "a_consultar", lugar_carga: "San Miguel (Corrientes)", disponible_desde: "2026-11-01" },
    fotos: [],
    actualizado: "2026-10-14T11:00:00.000Z",
  },
];

function aOferta(s: Semilla, locale: Locale): S<"OfertaPublica"> {
  const prod = MOCK_PRODUCTORES.find((p) => p.slug === s.slug);
  const huella = mockHuella(`oferta:${s.codigo}`);
  return {
    codigo: s.codigo,
    establecimiento: { slug: s.slug, nombre: prod?.nombre, zona: ubicacionCorta(prod?.provincia, prod?.departamento) },
    locale,
    version: 2,
    contenido: {
      tipo: "lote",
      especie: s.especie,
      categorias: [{ codigo: s.categoria }],
      cantidad: s.cantidad,
      razas: [{ codigo: s.raza }],
      peso: s.peso
        ? { promedio_kg: s.peso.promedio, min_kg: s.peso.min, max_kg: s.peso.max, fecha: s.peso.fecha, metodo: s.peso.metodo, declarado: s.peso.metodo !== "balanza" }
        : null,
      edad: s.edad ? { min_meses: s.edad.min, max_meses: s.edad.max } : null,
      clase_faena: s.clase ? { nombre: s.clase } : null,
      sanidad: s.sanidad,
      sin_retiro_vigente: s.sinRetiro,
      origen: s.nacidosPct != null ? { nacidos_pct: s.nacidosPct } : null,
      sistema: s.sistema,
      fotos: s.fotos,
      condiciones: s.condiciones,
      documentos: [
        {
          titulo: "Acta de vacunación antiaftosa 2ª campaña 2026",
          tipo: "sanitario",
          emisor_declarado: "Ente sanitario local",
          emitido_en: "2026-05-14",
          vence_en: null,
          estado: "vigente",
          confianza: "integridad_registrada",
          verificacion_url: `/v/${mockHuella(`doc:${s.codigo}`)}`,
        },
      ],
    },
    estado: s.estado ?? "publicada",
    actualizado_en: s.actualizado,
    huella,
    confianza: "integridad_registrada",
    verificacion_url: `/v/${huella}`,
    pdf_url: null,
    leyenda: LEYENDA[locale],
    seo: { titulo: s.titulo[locale], indexable: true },
  };
}

export async function mockOfertaPublica(codigo: string, locale: Locale): Promise<S<"OfertaPublica"> | null> {
  const s = SEMILLAS.find((x) => x.codigo.toLowerCase() === codigo.toLowerCase());
  if (s) return aOferta(s, locale);
  // Publicada desde el panel demo (memoria del servidor).
  const { mockPublicadaPorCodigo } = await import("./ofertas-panel");
  const hit = mockPublicadaPorCodigo(codigo);
  if (!hit) return null;
  const { oferta: o, lote } = hit;
  const m = (o.mostrar ?? {}) as Record<string, boolean>;
  const c = (o.condiciones ?? {}) as Semilla["condiciones"];
  return aOferta(
    {
      codigo: o.codigo_publico ?? codigo,
      slug: "la-esperanza",
      titulo: { es: String(o.textos?.titulo ?? ""), en: String(o.textos?.titulo ?? ""), pt: String(o.textos?.titulo ?? "") },
      especie: o.especie ?? "BOV",
      categoria: o.categorias?.[0] ?? "",
      raza: o.razas?.[0] ?? "",
      cantidad: o.cantidad ?? 0,
      peso:
        m.peso && lote?.peso_promedio_kg
          ? { promedio: lote.peso_promedio_kg, min: lote.peso_promedio_kg, max: lote.peso_promedio_kg, fecha: lote.peso_promedio_fecha ?? "", metodo: "balanza" }
          : undefined,
      edad: m.edad ? lote?.extra.edad : undefined,
      sanidad: m.sanidad ? (lote?.extra.sanidad ?? []) : [],
      sinRetiro: !lote?.extra.retiroHasta,
      sistema: String(o.textos?.sistema ?? ""),
      condiciones: m.condiciones ? c : { modalidad: "", precio: "", lugar_carga: "", disponible_desde: "" },
      fotos: [],
      actualizado: o.publicada_en ?? new Date().toISOString(),
      estado: o.estado === "reservada" ? "reservada" : "publicada",
    },
    locale,
  );
}

export function mockOfertasDe(slug: string, locale: Locale): S<"OfertaPublicaResumen">[] {
  return SEMILLAS.filter((s) => s.slug === slug).map((s) => ({
    codigo: s.codigo,
    titulo: s.titulo[locale],
    especie: s.especie,
    categorias: [s.categoria],
    cantidad: s.cantidad,
    peso_promedio_kg: s.peso?.promedio ?? null,
    estado: s.estado ?? "publicada",
    foto_url: null,
    url: `/${locale}/ofertas/${s.codigo}`,
  }));
}

export function mockCodigosOferta(): string[] {
  return SEMILLAS.map((s) => s.codigo);
}

export { LEYENDA as MOCK_LEYENDA };
