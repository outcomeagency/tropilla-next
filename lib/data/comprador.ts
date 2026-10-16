import "server-only";
import { api, query } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import { withMock, withMockIf } from "@/lib/mock/fallback";
import { MOCK_LEYENDA, mockHuella } from "@/lib/mock/ofertas";
import { mockComprador, mockContratoPorCodigo, mockMisTomas } from "@/lib/mock/contratos";
import { ubicacionCorta } from "@/lib/geo";
import type { Locale } from "@/lib/i18n";
import type { Many, One, S } from "@/lib/schemas";

/** Perfil de comprador de la sesión (cuenta liviana, TPA-57). */
export async function getComprador(me: S<"Me">) {
  if (me.comprador) return { data: me.comprador, source: "api" as const };
  return withMock(
    async () => (await api<One<S<"Comprador">>>("/me/comprador")).data,
    () => mockComprador(me.usuario.id),
  ).catch(() => ({ data: null, source: "api" as const }));
}

/**
 * Contrato publicado. El precio especial sólo viene con sesión de comprador
 * (excepción explícita a la privacidad de precios, functional/01 §10 quater).
 */
export async function getContratoPublico(codigo: string, locale: Locale) {
  const me = await getSesionOpcional();
  const comprador = me ? (await getComprador(me)).data : null;
  return withMockIf(
    async () => (await api<One<S<"ContratoPublico">>>(`/public/contratos/${encodeURIComponent(codigo)}${query({ locale })}`, { auth: !!me, locale })).data,
    (): S<"ContratoPublico"> | null => {
      const c = mockContratoPorCodigo(codigo);
      if (!c || c.estado === "borrador") return null;
      const t = c.terminos ?? {};
      const kgToken = t.kg_por_token ?? 100;
      return {
        codigo: c.codigo_publico,
        establecimiento: { slug: "la-esperanza", nombre: "La Esperanza", zona: ubicacionCorta("18", "18063") },
        especie: t.especie,
        categoria: t.categoria,
        cabezas: t.cabezas,
        kg_ofrecidos: (t.tokens_totales ?? 0) * kgToken,
        kg_libres: (c.tokens_libres ?? 0) * kgToken,
        tokens_totales: t.tokens_totales,
        tokens_libres: c.tokens_libres,
        kg_por_token: kgToken,
        fecha_entrega: t.fecha_entrega,
        estado: c.estado,
        precio_especial_kg: comprador ? (t.precio_especial_kg ?? null) : null,
        descuento_pct: comprador ? (t.descuento_pct ?? null) : null,
        anticipo_pct: comprador ? (t.anticipo_pct ?? null) : null,
        anticipo_por_token: comprador ? (t.anticipo_por_token ?? null) : null,
        moneda: comprador ? "ARS" : null,
        huella: c.huella ?? mockHuella(`contrato:${codigo}`),
        verificacion_url: `/v/${c.huella ?? mockHuella(`contrato:${codigo}`)}`,
        leyenda: MOCK_LEYENDA[locale],
      };
    },
  ).then((r) => (r ? { ...r, me, comprador } : null));
}

export async function getMisTomas(me: S<"Me">) {
  return withMock(
    async () => (await api<Many<S<"Toma"> & { contrato?: S<"ContratoPublico"> }>>("/comprador/tomas")).data.map((toma) => ({ toma, contrato: null as S<"Contrato"> | null, publico: toma.contrato ?? null })),
    () => mockMisTomas(me.usuario.id).map((x) => ({ ...x, publico: null })),
  );
}
