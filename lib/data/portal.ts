import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api, query } from "@/lib/api";
import { withMock } from "@/lib/mock/fallback";
import { mockDirectorio, type DirectorioQuery } from "@/lib/mock/portal";
import { departamentoNombre, provinciaNombre } from "@/lib/geo";
import { razaNombre } from "@/lib/catalogo";
import type { Locale } from "@/lib/i18n";
import type { Many, S } from "@/lib/schemas";

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
