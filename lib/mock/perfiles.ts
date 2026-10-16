/**
 * ⚠ DATOS DE EJEMPLO ⚠ — perfiles públicos ficticios (GET /public/establecimientos/{slug}).
 * Sólo datos que el productor eligió publicar: zona general, nunca CUIT/RENSPA/ubicación exacta.
 */
import { PHOTOS } from "@/lib/photos";
import type { Locale } from "@/lib/i18n";
import type { S } from "@/lib/schemas";
import { MOCK_PRODUCTORES } from "./portal";
import { MOCK_LEYENDA, mockOfertasDe } from "./ofertas";

const HISTORIAS: Record<string, { productor: string; historia: string; superficie: string; ambiente: string; actividades: string[]; fotos: string[]; rodeo: Array<{ especie: "BOV" | "BUB"; rango: string }> }> = {
  "la-esperanza": {
    productor: "Agropecuaria Don Ramón S.A.",
    historia:
      "La Esperanza es un establecimiento de 2.400 ha en General Paz, Corrientes, con cría, recría e invernada de bovinos y bubalinos en un sistema pastoril sobre humedales. Trabajamos los búfalos Mediterráneos desde 2009, con registro individual y plan sanitario con nuestro veterinario.",
    superficie: "2400",
    ambiente: "Lomas arenosas, bañados y esteros",
    actividades: ["cria", "recria", "invernada"],
    fotos: [PHOTOS.estero.src, PHOTOS.bufalosPastizal.src, PHOTOS.bufaloCorral.src],
    rodeo: [
      { especie: "BOV", rango: "1.000 – 1.500" },
      { especie: "BUB", rango: "300 – 500" },
    ],
  },
};

export function mockPerfilPublico(slug: string, locale: Locale): S<"PerfilPublico"> | null {
  const p = MOCK_PRODUCTORES.find((x) => x.slug === slug);
  if (!p) return null;
  const h = HISTORIAS[slug] ?? {
    productor: `Productor de ${p.nombre}`,
    historia: `${p.nombre} es un establecimiento ganadero del NEA. El productor todavía está completando su perfil.`,
    superficie: "",
    ambiente: "",
    actividades: ["cria"],
    fotos: [PHOTOS[p.foto].src],
    rodeo: (p.especies ?? []).map((e) => ({ especie: e, rango: e === "BUB" ? "100 – 300" : "300 – 500" })),
  };
  const completo = slug === "la-esperanza";
  return {
    slug,
    nombre: p.nombre,
    productor: h.productor,
    locale,
    secciones: {
      portada: {
        fotos: h.fotos,
        historia: h.historia,
        zona: { provincia: p.provincia, departamento: p.departamento, localidad: p.localidad ?? null },
        asociaciones: completo ? [{ nombre: "Asociación Argentina de Criadores de Búfalos" }] : [],
      },
      actividad: {
        especies: (p.especies ?? []).map((codigo) => ({ codigo })),
        razas: (p.razas ?? []).map((codigo) => ({ codigo })),
        actividades: h.actividades.map((codigo) => ({ codigo })),
        superficie_ha: h.superficie || null,
        ambiente: h.ambiente || null,
      },
      rodeo: { modo: "rango", por_especie: h.rodeo, pct_identificacion_individual: completo ? "92" : null, pct_rfid: completo ? "64" : null },
      sanidad: completo
        ? {
            ultimos_12_meses: [
              { enfermedad: "Aftosa", texto: "Dos campañas de vacunación registradas", registros: 2 },
              { enfermedad: "Rabia paresiante", texto: "Vacunación anual registrada", registros: 1 },
              { enfermedad: "Brucelosis", texto: "Vacunación de terneras registrada", registros: 1 },
            ],
          }
        : null,
      trazabilidad: completo ? { eventos: 4812, historial_meses: 26, pct_integridad_registrada: "88" } : null,
      documentos: completo
        ? [
            {
              titulo: "Acta de vacunación antiaftosa 2ª campaña 2026",
              tipo: "sanitario",
              emisor_declarado: "Ente sanitario local",
              emitido_en: "2026-05-14",
              estado: "vigente",
              confianza: "integridad_registrada",
              verificacion_url: "/v/0d4f6c7e2b1a9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d",
            },
          ]
        : [],
      ofertas: mockOfertasDe(slug, locale),
      contratos: completo
        ? [{ codigo: "CF0007", especie: "BUB", categoria: "BUB_BUBILLO", cabezas: 30, kg_ofrecidos: 8200, kg_libres: 3700, tokens_totales: 82, tokens_libres: 37, kg_por_token: 100, fecha_entrega: "2027-03-15", estado: "parcialmente_tomado" }]
        : [],
      contacto: { formulario: true, telefono: null, email: null, whatsapp: completo ? "+5493794000000" : null },
    },
    insignias: p.insignias,
    leyenda: MOCK_LEYENDA[locale],
    actualizado_en: p.actualizado_en,
  };
}
