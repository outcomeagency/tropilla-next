"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ITEM = /^[a-z_]{1,40}$/;

/** Consulta asistida de una contraparte por CUIT (TPA-72). Registra finalidad y consentimiento; abre el informe. */
export async function consultarContraparteAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("contrapartes.consultar")) return { error: "Solo el dueño o la administración pueden consultar contrapartes." };
  const body = {
    cuit: String(fd.get("cuit") ?? "").replace(/\D/g, ""),
    finalidad: String(fd.get("finalidad") ?? ""),
    finalidad_detalle: String(fd.get("finalidad_detalle") ?? "").trim() || null,
    consentimiento: fd.get("consentimiento") === "1",
    titular_autorizo: fd.get("titular_autorizo") === "1",
  };
  let id = "";
  try {
    const r = await api<One<S<"ConsultaContraparte">>>(`/establecimientos/${ctx.activa.establecimiento_id}/contrapartes/consultas`, { method: "POST", body, timeoutMs: 60_000 });
    id = r.data.id;
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos hacer la consulta.");
  }
  revalidatePath("/comercializacion/contrapartes");
  redirect(`/comercializacion/contrapartes/${id}`);
}

/** Marca un ítem del checklist de diligencia de la consulta. */
export async function marcarChecklistAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  const id = String(fd.get("consulta") ?? "");
  const item = String(fd.get("item") ?? "");
  if (!ctx.can("contrapartes.consultar")) return { error: "Tu rol no permite editar el checklist." };
  if (!UUID.test(id) || !ITEM.test(item)) return { error: "Ítem inválido." };
  const estado = String(fd.get("estado") ?? "pendiente");
  const nota = String(fd.get("nota") ?? "").trim().slice(0, 500) || null;
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/contrapartes/consultas/${id}/checklist/${item}`, { method: "PUT", body: { estado, nota } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el ítem.");
  }
  revalidatePath(`/comercializacion/contrapartes/${id}`);
  return { ok: { mensaje: "Guardado." } };
}
