import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api, query } from "@/lib/api";
import { withMock, withMockIf } from "@/lib/mock/fallback";
import type { Locale } from "@/lib/i18n";
import type { Many, One, S } from "@/lib/schemas";

export interface DirectorioQuery {
  q?: string;
  provincia?: string;
  especie?: string;
  raza?: string;
  categoria?: string;
  con_oferta?: string;
  con_contrato?: string;
  cursor?: string;
}

export type DirectorioFacetas = S<"DirectorioFacetas">;

/**
 * Directorio público (TPA-54), API real. Cacheado por combinación de filtros e
 * idioma; se revalida por tag al publicar/despublicar un perfil.
 */
export async function getDirectorio(filtros: DirectorioQuery, locale: Locale, limit = 24) {
  "use cache";
  cacheLife("minutes");
  cacheTag("directorio");
  const res = await api<Many<S<"DirectorioItem">>>(`/public/directorio${query({ ...filtros, locale, limit })}`, { auth: false, locale });
  return { data: res.data, next: res.meta?.next_cursor ?? null };
}

/** Conteos por provincia, especie, raza y categoría para los filtros del directorio. */
export async function getDirectorioFacetas(filtros: Pick<DirectorioQuery, "q" | "provincia" | "especie">, locale: Locale): Promise<DirectorioFacetas | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("directorio");
  try {
    return (await api<One<DirectorioFacetas>>(`/public/directorio/facetas${query({ ...filtros, locale })}`, { auth: false, locale })).data;
  } catch {
    return null;
  }
}

/** La API publica las ofertas como `/o/{codigo}`; en la web viven en `/ofertas/{codigo}`. */
export function rutaPublica(path: string): string {
  return path.replace(/^\/o\//, "/ofertas/").replace(/^\/c\//, "/contratos/");
}

/** Entradas indexables (perfiles en directorio, ofertas y contratos publicados). Sin API → sólo las fijas. */
export async function getSitemapEntradas(): Promise<S<"SitemapEntrada">[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("sitemap");
  try {
    return (await api<Many<S<"SitemapEntrada">>>("/public/sitemap", { auth: false })).data.map((e) => ({ ...e, path: e.path ? rutaPublica(e.path) : e.path }));
  } catch {
    return [];
  }
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
