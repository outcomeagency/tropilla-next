import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { getSitemapEntradas } from "@/lib/data/portal";

/**
 * Mapa del sitio del portal público (TPA-54): portada y directorio en los tres
 * idiomas + perfiles y ofertas publicados (GET /public/sitemap). Cada URL
 * declara sus alternativas por idioma (hreflang).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fijas = ["", "/directorio"].map((path) => ({
    url: `${SITE_URL}/es${path}`,
    changeFrequency: "daily" as const,
    priority: path ? 0.9 : 1,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  }));

  const data = await getSitemapEntradas();
  const dinamicas = data
          .filter((e) => e.path)
          .map((e) => {
            const locales = e.locales?.length ? e.locales : ["es"];
            return {
              url: `${SITE_URL}/${locales[0]}${e.path}`,
              lastModified: e.actualizado_en ? new Date(e.actualizado_en) : undefined,
              changeFrequency: "weekly" as const,
              priority: e.tipo === "oferta" ? 0.8 : 0.7,
              alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${e.path}`])) },
            };
          });

  return [...fijas, ...dinamicas];
}
