"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, fdStr, uuidv7, type EventoActionState } from "./eventos-api";
import { TIPOS_PRODUCTO, VIAS } from "./sanidad";

const en = (lista: readonly (readonly [string, string])[], v: string) => lista.some(([c]) => c === v);

function dias(fd: FormData, k: string, fields: Record<string, string>): number | null {
  const s = fdStr(fd, k);
  if (!s) return null;
  if (!/^\d{1,3}$/.test(s)) {
    fields[k] = "Días enteros, de 0 a 999.";
    return null;
  }
  return Number(s);
}

/** Alta o edición de un producto del catálogo del establecimiento (TPA-31). La dosis es texto declarado: TROPILLA no prescribe. */
export async function guardarProductoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite editar el catálogo de productos." };
  const est = ctx.activa.establecimiento_id;
  const id = fdStr(fd, "id");
  const fields: Record<string, string> = {};

  const nombre = fdStr(fd, "nombre_comercial").slice(0, 120);
  if (nombre.length < 2) fields.nombre_comercial = "Escribí el nombre como figura en el envase.";
  const tipo = fdStr(fd, "tipo");
  if (!en(TIPOS_PRODUCTO, tipo)) fields.tipo = "Elegí el tipo de producto.";
  const via = fdStr(fd, "via");
  if (via && !en(VIAS, via)) fields.via = "Elegí la vía.";
  const carne = dias(fd, "retiro_carne_dias", fields);
  const leche = dias(fd, "retiro_leche_dias", fields);
  const especies = fd.getAll("especies").map(String).filter((e) => e === "BOV" || e === "BUB");
  if (!especies.length) fields.especies = "Elegí al menos una especie.";
  const enfermedades = [...new Set(fd.getAll("enfermedades").map(String).filter(Boolean))];

  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  const body = {
    nombre_comercial: nombre,
    principio_activo: fdStr(fd, "principio_activo").slice(0, 120) || null,
    tipo,
    via: via || null,
    dosis_declarada: fdStr(fd, "dosis_declarada").slice(0, 200) || null,
    retiro_carne_dias: carne,
    retiro_leche_dias: leche,
    especies,
    enfermedades,
    notas: fdStr(fd, "notas").slice(0, 2000) || null,
  };

  try {
    if (id) {
      await api(`/establecimientos/${est}/productos-sanitarios/${id}`, { method: "PATCH", body: { ...body, row_version: Number(fdStr(fd, "row_version") || "1") } });
    } else {
      await api(`/establecimientos/${est}/productos-sanitarios`, {
        method: "POST",
        body: { ...body, id: fdStr(fd, "idem") || uuidv7(), sugerido_codigo: fdStr(fd, "sugerido_codigo") || null },
      });
    }
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el producto.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: id ? `Guardamos los cambios de ${nombre}.` : `${nombre} quedó en tu catálogo.` } };
}

/** Archivar con motivo: deja de ofrecerse al registrar; lo aplicado queda en la historia. */
export async function archivarProductoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite archivar productos." };
  const motivo = fdStr(fd, "motivo").slice(0, 500);
  if (!motivo) return { fields: { motivo: "Contá por qué (ej. «se dejó de usar», «cambio de marca»)." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/productos-sanitarios/${fdStr(fd, "id")}/archivar`, { method: "POST", body: { motivo } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos archivar el producto.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: "Producto archivado. Lo ya aplicado sigue en la historia." } };
}
