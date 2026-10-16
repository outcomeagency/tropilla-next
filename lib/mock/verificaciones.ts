import "server-only";
/**
 * ⚠ DATOS DE EJEMPLO ⚠ — verificaciones públicas (GET /public/verificaciones/{huella}, TPA-41)
 * para las huellas de las ofertas y documentos de ejemplo.
 */
import type { Locale } from "@/lib/i18n";
import type { S } from "@/lib/schemas";
import { MOCK_LEYENDA, mockCodigosOferta, mockHuella, mockOfertaPublica } from "./ofertas";

export async function mockVerificacion(huella: string, locale: Locale): Promise<S<"Verificacion"> | null> {
  const h = huella.toLowerCase();
  for (const codigo of mockCodigosOferta()) {
    const esOferta = mockHuella(`oferta:${codigo}`) === h;
    const esDoc = mockHuella(`doc:${codigo}`) === h;
    if (!esOferta && !esDoc) continue;
    const o = await mockOfertaPublica(codigo, locale);
    if (!o) return null;
    const anterior = mockHuella(`${h}:prev`);
    return {
      huella: h,
      tipo: esOferta ? "oferta_publicacion" : "documento_version",
      descripcion: esOferta ? `${o.seo?.titulo} · código ${codigo}` : (o.contenido?.documentos?.[0]?.titulo ?? "Documento"),
      registrado_en: esOferta ? o.actualizado_en : "2026-05-14T18:20:00.000Z",
      autor: { rol: esOferta ? "Dueño" : "Asesor / veterinario", nombre: null },
      establecimiento: { slug: o.establecimiento?.slug ?? null, nombre: o.establecimiento?.nombre },
      versiones: esOferta ? 2 : 1,
      es_vigente: true,
      confianza: "integridad_registrada",
      integridad: {
        huella: h,
        seq: esOferta ? 4812 : 3120,
        eslabon_anterior: anterior,
        eslabon: mockHuella(`${h}:link`),
        registrado_en: esOferta ? o.actualizado_en : "2026-05-14T18:20:00.000Z",
        confianza: "integridad_registrada",
        anclaje: {
          driver: "opentimestamps",
          red: "Bitcoin (OpenTimestamps)",
          raiz: mockHuella(`${h}:root`),
          estado: "confirmado",
          confirmado_en: esOferta ? "2026-10-16T03:00:00.000Z" : "2026-05-15T03:00:00.000Z",
          referencia: { bloque: esOferta ? 918244 : 897310 },
          recibo_url: null,
        },
        prueba: [
          { lado: "d", hash: mockHuella(`${h}:p1`) },
          { lado: "i", hash: mockHuella(`${h}:p2`) },
          { lado: "d", hash: mockHuella(`${h}:p3`) },
        ],
      },
      sobre: null,
      leyenda: MOCK_LEYENDA[locale],
    };
  }
  return null;
}
