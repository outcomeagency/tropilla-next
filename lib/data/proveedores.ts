import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api, query } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { Many, One, S } from "@/lib/schemas";

export type ProveedorItem = S<"ProveedorDirectorioItem">;
export type ProveedorPublico = S<"ProveedorPublico">;
export type RubroProveedor = S<"RubroProveedor">;

export async function getRubrosProveedor(locale: Locale) {
  "use cache";
  cacheLife("hours");
  cacheTag("proveedores-rubros");
  const res = await api<Many<RubroProveedor>>("/public/directorio/proveedores/rubros", { auth: false, locale });
  return res.data;
}

export async function getDirectorioProveedores(filtros: { rubro?: string; provincia?: string; cursor?: string }, locale: Locale) {
  "use cache";
  cacheLife("minutes");
  cacheTag("proveedores");
  const res = await api<Many<ProveedorItem>>(`/public/directorio/proveedores${query({ ...filtros, locale })}`, { auth: false, locale });
  return { data: res.data, next: res.meta?.next_cursor ?? null };
}

export async function getProveedor(slug: string, locale: Locale): Promise<ProveedorPublico> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`proveedor:${slug}`);
  return (await api<One<ProveedorPublico>>(`/public/proveedores/${encodeURIComponent(slug)}${query({ locale })}`, { auth: false, locale })).data;
}
