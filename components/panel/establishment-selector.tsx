import { getContexto } from "@/lib/establecimiento";
import { ROL_LABEL } from "@/lib/auth";
import { getMisEstablecimientos } from "@/lib/data/establecimientos";
import { ubicacionCorta } from "@/lib/geo";
import { EstablishmentSwitcher } from "./establishment-switcher";

/**
 * Datos del selector: la verdad son las membresías de /auth/me; la ubicación
 * sale de GET /establecimientos (si no responde, se muestra el productor).
 */
export async function EstablishmentSelector() {
  const ctx = await getContexto();
  if (!ctx) return null;
  const lista = await getMisEstablecimientos().catch(() => null);
  const porId = new Map((lista?.data ?? []).map((e) => [e.id, e]));

  const items = ctx.me.membresias.map((m) => {
    const e = porId.get(m.establecimiento_id);
    const ubic = e ? ubicacionCorta(e.provincia_codigo, e.departamento_codigo, e.localidad) : "";
    return {
      id: m.establecimiento_id,
      nombre: m.establecimiento_nombre ?? e?.nombre ?? "Establecimiento",
      detalle: ubic || m.productor_nombre || "",
      rol: ROL_LABEL[m.rol],
    };
  });

  return <EstablishmentSwitcher items={items} activeId={ctx.activa.establecimiento_id} />;
}
