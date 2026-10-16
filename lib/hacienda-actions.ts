"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import type { S } from "./schemas";

export interface EventoState {
  error?: string;
  advertencias?: string[];
  ok?: { cantidad: number };
}

/**
 * Evento grupal desde la selección del listado (TPA-18): traslado de potrero.
 * El servidor arma el sobre, la huella y la cadena (api-v1 §5.1). Si la API
 * devuelve advertencias de coherencia (422 requiere_confirmacion), se muestran
 * y el usuario confirma.
 */
export async function trasladoGrupalAction(_prev: EventoState, fd: FormData): Promise<EventoState> {
  const ctx = await requireContexto();
  if (!ctx.can("hacienda.crear")) return { error: "Tu rol no permite cargar eventos." };
  const ids = fd.getAll("animal_ids").map(String).filter(Boolean);
  const destino = String(fd.get("potrero_destino_id") ?? "");
  const fecha = String(fd.get("ocurrido_en") ?? "");
  if (!ids.length) return { error: "Elegí al menos un animal." };
  if (!destino) return { error: "Elegí el potrero de destino." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Indicá la fecha del traslado." };

  const body: S<"EventoInput"> = {
    id: String(fd.get("idem") ?? "") || undefined,
    tipo: "hacienda.traslado",
    sujetos: { tipo: "animales", animal_ids: ids },
    payload: { potrero_destino_id: destino },
    ocurrido_en: fecha,
    observaciones: String(fd.get("observaciones") ?? "").trim() || null,
    confirmar_advertencias: fd.get("confirmar") === "1",
  };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/eventos`, { method: "POST", body });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === "requiere_confirmacion") {
        const adv = e.advertencias?.length ? e.advertencias : Object.values(e.errors ?? {}).flat();
        return { advertencias: adv.length ? adv : [e.message] };
      }
      if (e.status === 422 || e.status === 409) return { error: e.message };
      if (e.unreachable) return { error: "No pudimos conectar con TROPILLA. Probá de nuevo." };
    }
    return { error: "No pudimos registrar el traslado. Probá de nuevo." };
  }
  revalidatePath("/hacienda");
  return { ok: { cantidad: ids.length } };
}

/**
 * Cambio de lote grupal (TPA-20): mueve los animales identificados elegidos a
 * otro lote de la misma especie. Un animal pertenece a un solo lote a la vez.
 */
export async function cambioLoteGrupalAction(_prev: EventoState, fd: FormData): Promise<EventoState> {
  const ctx = await requireContexto();
  if (!ctx.can("hacienda.crear")) return { error: "Tu rol no permite cargar eventos." };
  const ids = fd.getAll("animal_ids").map(String).filter(Boolean);
  const destino = String(fd.get("lote_destino_id") ?? "");
  const fecha = String(fd.get("ocurrido_en") ?? "");
  if (!ids.length) return { error: "Elegí al menos un animal." };
  if (!destino) return { error: "Elegí el lote de destino." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Indicá la fecha del cambio." };

  const body: S<"EventoInput"> = {
    id: String(fd.get("idem") ?? "") || undefined,
    tipo: "hacienda.cambio_lote",
    sujetos: { tipo: "animales", animal_ids: [...ids].sort() },
    payload: { lote_destino_id: destino },
    ocurrido_en: fecha,
    observaciones: String(fd.get("observaciones") ?? "").trim() || null,
    confirmar_advertencias: fd.get("confirmar") === "1",
  };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/eventos`, { method: "POST", body });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === "requiere_confirmacion") {
        const adv = e.advertencias?.length ? e.advertencias : Object.values(e.errors ?? {}).flat();
        return { advertencias: adv.length ? adv : [e.message] };
      }
      if (e.status === 422 || e.status === 409) return { error: e.message };
      if (e.unreachable) return { error: "No pudimos conectar con TROPILLA. Probá de nuevo." };
    }
    return { error: "No pudimos registrar el cambio de lote. Probá de nuevo." };
  }
  revalidatePath("/hacienda");
  revalidatePath("/hacienda/lotes");
  return { ok: { cantidad: ids.length } };
}
