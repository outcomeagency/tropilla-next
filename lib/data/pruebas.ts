import type { Catalogos } from "@/lib/data/catalogos";
import type { TipoPrueba } from "@/lib/tuberculina";

/** Tipos de prueba del catálogo (umbrales versionados). */
export function tiposPrueba(cat: Catalogos): TipoPrueba[] {
  return (cat.tiposPrueba as Array<Record<string, unknown>>).map((t) => ({
    codigo: String(t.codigo),
    nombre: String(t.nombre ?? t.codigo),
    metodo: String(t.metodo_calculo ?? "declarado"),
    umbrales: (t.umbrales as TipoPrueba["umbrales"]) ?? null,
    version: Number(t.version ?? 1),
    validadoPorVet: !!t.validado_por_vet,
  }));
}
