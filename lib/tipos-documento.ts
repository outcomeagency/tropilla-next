import type { Catalogos } from "@/lib/data/catalogos";
import type { TipoDoc } from "@/components/panel/documentos/nuevo";

/** Tipos de documento del catálogo con su privacidad por defecto; los fiscales sólo con `documentos.fiscal`. */
export function tiposDocumento(cat: Catalogos, verFiscal: boolean): TipoDoc[] {
  return (cat.tiposDocumento as Array<Record<string, unknown>>)
    .map((t) => ({
      codigo: String(t.codigo),
      nombre: String(t.nombre ?? t.codigo),
      privacidad: String(t.privacidad_default ?? "general"),
      venceDias: (t.vence_por_defecto_dias as number | null) ?? null,
      publicable: t.publicable !== false,
    }))
    .filter((t) => verFiscal || t.privacidad !== "fiscal");
}
