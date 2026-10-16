import "server-only";
import type { Catalogos } from "@/lib/data/catalogos";
import type { CategoriaOpcion } from "@/lib/lotes";

export { getLote, getLoteEventos, listLotes, type Lote } from "@/lib/data/potreros";

/** Categorías del catálogo para una especie, en el orden del catálogo, con su sexo (para individualizar). */
export function categoriasDe(cat: Catalogos, especie: string): CategoriaOpcion[] {
  return cat.categorias
    .filter((c) => c.especie === especie)
    .sort((a, b) => Number((a as { orden?: number }).orden ?? 99) - Number((b as { orden?: number }).orden ?? 99))
    .map((c) => {
      const sexo = (c as { sexo?: string | null }).sexo;
      return { codigo: c.codigo, nombre: c.nombre ?? c.codigo, sexo: sexo === "M" || sexo === "H" ? sexo : null };
    });
}
