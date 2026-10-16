"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { decimal, estadoDeError, fdStr, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

function poligonoDe(raw: string): { ok: true; value: S<"PotreroInput">["poligono"] } | { ok: false } {
  if (!raw) return { ok: true, value: null };
  try {
    const ring = JSON.parse(raw) as Array<[number, number]>;
    if (!Array.isArray(ring) || ring.length < 3 || ring.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) return { ok: false };
    const cerrado = [...ring, ring[0]].map(([lon, lat]) => [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]);
    return { ok: true, value: { type: "Polygon", coordinates: [cerrado] } as unknown as S<"PotreroInput">["poligono"] };
  } catch {
    return { ok: false };
  }
}

/** Crear o editar un potrero (TPA-14). El polígono es opcional; si no hay ha, la API las calcula del dibujo. */
export async function guardarPotreroAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite editar potreros." };
  const est = ctx.activa.establecimiento_id;
  const id = fdStr(fd, "id");

  const fields: Record<string, string> = {};
  const nombre = fdStr(fd, "nombre");
  if (!nombre) fields.nombre = "Poné un nombre que todos reconozcan (ej. «Bañado Norte»).";
  const sup = decimal(fdStr(fd, "superficie_ha"));
  if (sup === null) fields.superficie_ha = "Usá sólo números (ej. 120 o 120,5).";
  const pol = poligonoDe(fdStr(fd, "poligono"));
  if (!pol.ok) fields.poligono = "El contorno necesita al menos 3 puntos.";
  if (Object.keys(fields).length) return { fields, error: "Revisá los datos marcados." };

  const body: S<"PotreroInput"> = {
    nombre,
    superficie_ha: sup ?? null,
    ambiente: fdStr(fd, "ambiente") || null,
    recurso_forrajero: fdStr(fd, "recurso_forrajero") || null,
    agua: fd.get("agua") === "on",
    revolcadero: fd.get("revolcadero") === "on",
    notas: fdStr(fd, "notas") || null,
    poligono: pol.ok ? pol.value : null,
  };

  let destino = id;
  try {
    if (id) {
      await api(`/establecimientos/${est}/potreros/${id}`, { method: "PATCH", body: { ...body, row_version: fdStr(fd, "row_version") } });
    } else {
      const res = await api<One<S<"Potrero">>>(`/establecimientos/${est}/potreros`, { method: "POST", body: { ...body, id: fdStr(fd, "idem") || undefined } });
      destino = res.data.id ?? "";
    }
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el potrero. Probá de nuevo.");
  }
  revalidatePath("/establecimiento/potreros");
  redirect(`/establecimiento/potreros?ok=${id ? "editado" : "creado"}&p=${destino}`);
}

/** Archivar (nunca borrar): el potrero deja de ofrecerse pero su historia queda. */
export async function archivarPotreroAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite archivar potreros." };
  const motivo = fdStr(fd, "motivo");
  if (!motivo) return { fields: { motivo: "Contá por qué se archiva (ej. «se unió con Loma del Monte»)." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/potreros/${fdStr(fd, "id")}/archivar`, { method: "POST", body: { motivo } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos archivar el potrero.");
  }
  revalidatePath("/establecimiento/potreros");
  redirect("/establecimiento/potreros?ok=archivado");
}
