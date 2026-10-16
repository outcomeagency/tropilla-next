import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/lib/api";
import { CATEGORIAS, RAZAS } from "@/lib/catalogo";
import type { One, S } from "@/lib/schemas";

type Item = { codigo: string; especie?: string; nombre?: string; nombres?: Record<string, string> };

/**
 * Catálogos globales (GET /catalogos, ETag + cache pública). Si la API no
 * responde, cae a la tabla estática de lib/catalogo.ts (mismos códigos).
 */
export async function getCatalogos() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogos");
  try {
    const res = await api<One<S<"Catalogos">>>("/catalogos", { auth: false, timeoutMs: 6000 });
    const d = res.data;
    return {
      categorias: (d.categorias ?? []) as Item[],
      razas: (d.razas ?? []) as Item[],
      tiposEvento: (d.tipos_evento ?? []).map((t) => ({ codigo: t.codigo ?? "", nombre: t.nombres?.es ?? t.codigo ?? "", modulo: t.modulo ?? "" })),
      source: "api" as const,
    };
  } catch {
    return {
      categorias: CATEGORIAS.map((c) => ({ codigo: c.codigo, especie: c.especie, nombre: c.nombres.es.replace(/s$/, ""), nombres: c.nombres })),
      razas: RAZAS.map((r) => ({ codigo: r.codigo, especie: r.especie, nombre: r.nombre })),
      tiposEvento: [] as Array<{ codigo: string; nombre: string; modulo: string }>,
      source: "mock" as const,
    };
  }
}
