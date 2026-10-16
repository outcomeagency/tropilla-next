import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/lib/api";
import { CATEGORIAS, RAZAS } from "@/lib/catalogo";
import { ACTIVIDADES, PROVINCIAS } from "@/lib/geo";
import type { One, S } from "@/lib/schemas";

export type Item = { codigo: string; especie?: string; nombre?: string; nombres?: Record<string, string>; [k: string]: unknown };
export type CatItem = { codigo: string; nombre: string };
export type Departamento = { codigo: string; provincia_codigo: string; nombre: string; garrapata_sugerida?: string | null };
export type Parametro = { clave: string; especie?: string | null; raza?: string | null; valor: unknown; unidad?: string | null; validado_por_vet?: boolean };
export type ReglaCategoria = { id: number; categoria: string; prioridad: number; motivo: string };
export type TipoEvento = { codigo: string; nombre: string; modulo: string; requiere_sexo?: string | null };

type Raw = S<"Catalogos"> & Record<string, unknown>;

const ITEMS_VACIOS = {
  actividades: ACTIVIDADES.map((a) => ({ codigo: a.codigo, nombre: a.nombre })),
  ambientes: [
    ["loma", "Loma"], ["media_loma", "Media loma"], ["bajo", "Bajo"], ["malezal", "Malezal"], ["banado", "Bañado"], ["estero", "Estero"], ["isla", "Isla"],
  ].map(([codigo, nombre]) => ({ codigo, nombre })),
  instalaciones: [
    ["manga", "Manga"], ["balanza", "Balanza"], ["cepo", "Cepo"], ["embarcadero", "Embarcadero"], ["aguadas", "Aguadas"], ["revolcaderos", "Revolcaderos"],
  ].map(([codigo, nombre]) => ({ codigo, nombre })),
  recursos_forrajeros: [
    ["campo_natural", "Campo natural"], ["pastura_implantada", "Pastura implantada"], ["verdeo", "Verdeo"],
  ].map(([codigo, nombre]) => ({ codigo, nombre })),
} as Record<string, CatItem[]>;

/**
 * Catálogos globales (GET /catalogos, ETag + cache pública). Si la API no
 * responde, cae a las tablas estáticas de lib/catalogo.ts y lib/geo.ts (mismos códigos).
 */
export async function getCatalogos() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogos");
  try {
    const res = await api<One<Raw>>("/catalogos", { auth: false, timeoutMs: 6000 });
    const d = res.data;
    const items = (d.items ?? {}) as Record<string, Array<{ codigo: string; nombre?: string }>>;
    const geo = (d.geo ?? {}) as { provincias?: CatItem[]; departamentos?: Departamento[] };
    return {
      categorias: (d.categorias ?? []) as Item[],
      razas: (d.razas ?? []) as Item[],
      tiposEvento: (d.tipos_evento ?? []).map((t) => ({
        codigo: t.codigo ?? "",
        nombre: t.nombres?.es ?? t.codigo ?? "",
        modulo: t.modulo ?? "",
        requiere_sexo: ((t as Record<string, unknown>).requiere_sexo as string | null) ?? null,
      })) as TipoEvento[],
      items: Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.map((i) => ({ codigo: i.codigo, nombre: i.nombre ?? i.codigo }))])) as Record<string, CatItem[]>,
      provincias: geo.provincias ?? PROVINCIAS.map((p) => ({ codigo: p.codigo, nombre: p.nombre })),
      departamentos: mergeDepartamentos(geo.departamentos ?? []),
      parametros: ((d.parametros ?? []) as unknown as Parametro[]),
      plantillas: ((d as Record<string, unknown>).plantillas_sanitarias ?? []) as Item[],
      tiposDocumento: ((d as Record<string, unknown>).tipos_documento ?? []) as Item[],
      tiposPrueba: ((d as Record<string, unknown>).tipos_prueba ?? []) as Item[],
      categoriasFaena: ((d as Record<string, unknown>).categorias_faena ?? []) as Item[],
      reglas: ((d as Record<string, unknown>).reglas_categoria ?? []) as ReglaCategoria[],
      source: "api" as const,
    };
  } catch {
    return {
      categorias: CATEGORIAS.map((c) => ({ codigo: c.codigo, especie: c.especie, nombre: c.nombres.es.replace(/s$/, ""), nombres: c.nombres })) as Item[],
      razas: RAZAS.map((r) => ({ codigo: r.codigo, especie: r.especie, nombre: r.nombre })) as Item[],
      tiposEvento: [] as TipoEvento[],
      items: ITEMS_VACIOS,
      provincias: PROVINCIAS.map((p) => ({ codigo: p.codigo, nombre: p.nombre })),
      departamentos: PROVINCIAS.flatMap((p) => p.departamentos.map((d) => ({ ...d, provincia_codigo: p.codigo, garrapata_sugerida: null }))) as Departamento[],
      parametros: [] as Parametro[],
      plantillas: [] as Item[],
      tiposDocumento: [] as Item[],
      tiposPrueba: [] as Item[],
      categoriasFaena: [] as Item[],
      reglas: [] as ReglaCategoria[],
      source: "mock" as const,
    };
  }
}

/** El catálogo de la API trae hoy sólo Corrientes (con garrapata sugerida); el resto del NEA sale de lib/geo.ts. */
function mergeDepartamentos(api: Departamento[]): Departamento[] {
  const conApi = new Set(api.map((d) => d.provincia_codigo));
  const resto = PROVINCIAS.filter((p) => !conApi.has(p.codigo)).flatMap((p) =>
    p.departamentos.map((d) => ({ ...d, provincia_codigo: p.codigo, garrapata_sugerida: null })),
  );
  return [...api, ...resto];
}

export type Catalogos =Awaited<ReturnType<typeof getCatalogos>>;

/** Nombre de un ítem de catálogo por código (o el código si no está). */
export function nombreItem(cat: Catalogos, grupo: string, codigo?: string | null): string {
  if (!codigo) return "";
  return cat.items[grupo]?.find((i) => i.codigo === codigo)?.nombre ?? codigo;
}
