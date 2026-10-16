import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api, query } from "@/lib/api";
import { withMock, withMockIf } from "@/lib/mock/fallback";
import { mockDirectorio, type DirectorioQuery } from "@/lib/mock/portal";
import { departamentoNombre, provinciaNombre } from "@/lib/geo";
import { razaNombre } from "@/lib/catalogo";
import type { Locale } from "@/lib/i18n";
import type { Many, One, S } from "@/lib/schemas";

export type { DirectorioQuery };

/**
 * Directorio público (TPA-54). Cacheado por combinación de filtros e idioma;
 * la API manda `Cache-Control` 60 s y revalida por tag al publicar/despublicar.
 */
export async function getDirectorio(filtros: DirectorioQuery, locale: Locale) {
  "use cache";
  cacheLife("minutes");
  cacheTag("directorio");

  return withMock(
    async () => {
      const res = await api<Many<S<"DirectorioItem">>>(`/public/directorio${query({ ...filtros, locale, limit: 48 })}`, {
        auth: false,
        locale,
      });
      return res.data;
    },
    () =>
      mockDirectorio(filtros, (p) =>
        [p.nombre, p.localidad, provinciaNombre(p.provincia), departamentoNombre(p.departamento), ...(p.razas ?? []).map(razaNombre)].join(" "),
      ),
  );
}

/** Entradas indexables (perfiles en directorio, ofertas y contratos publicados). */
export async function getSitemapEntradas() {
  "use cache";
  cacheLife("hours");
  cacheTag("sitemap");
  const { MOCK_PRODUCTORES } = await import("@/lib/mock/portal");
  return withMock(
    async () => (await api<Many<S<"SitemapEntrada">>>("/public/sitemap", { auth: false })).data,
    (): S<"SitemapEntrada">[] =>
      MOCK_PRODUCTORES.map((p) => ({ tipo: "perfil", path: `/p/${p.slug}`, locales: ["es", "en", "pt"], actualizado_en: p.actualizado_en })),
  );
}

/** Ficha pública de oferta (TPA-48). 404 si no existe o no está publicada. */
export async function getOfertaPublica(codigo: string, locale: Locale) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`oferta:${codigo}`);
  const { mockOfertaPublica } = await import("@/lib/mock/ofertas");
  return withMockIf(
    async () => (await api<One<S<"OfertaPublica">>>(`/public/ofertas/${encodeURIComponent(codigo)}${query({ locale })}`, { auth: false, locale })).data,
    () => mockOfertaPublica(codigo, locale),
  );
}

/** Perfil público del establecimiento (TPA-50). */
export async function getPerfilPublico(slug: string, locale: Locale) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`perfil:${slug}`);
  const { mockPerfilPublico } = await import("@/lib/mock/perfiles");
  return withMockIf(
    async () => (await api<One<S<"PerfilPublico">>>(`/public/establecimientos/${encodeURIComponent(slug)}${query({ locale })}`, { auth: false, locale })).data,
    () => mockPerfilPublico(slug, locale),
  );
}

/** Verificación pública de un registro por huella (TPA-41). */
export async function getVerificacion(huella: string, locale: Locale) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`verificacion:${huella}`);
  const { mockVerificacion } = await import("@/lib/mock/verificaciones");
  return withMockIf(
    async () => (await api<One<S<"Verificacion">>>(`/public/verificaciones/${encodeURIComponent(huella)}${query({ locale })}`, { auth: false, locale })).data,
    () => mockVerificacion(huella, locale),
  );
}
