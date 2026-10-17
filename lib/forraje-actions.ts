"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

export type BriefEntradas = S<"BriefForrajeInput">;
type Resultado = S<"BriefForrajeResultado">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Calcula los escenarios del brief sin guardar (TPA-71). */
export async function calcularBriefAction(entradas: BriefEntradas): Promise<{ resultado?: Resultado; error?: string; fields?: Record<string, string> }> {
  const ctx = await requireContexto();
  if (!ctx.can("forraje.crear")) return { error: "Tu rol permite ver los briefs guardados, pero no armar uno nuevo." };
  try {
    const r = await api<One<Resultado>>(`/establecimientos/${ctx.activa.establecimiento_id}/forraje/briefs/calcular`, { method: "POST", body: entradas });
    return { resultado: r.data };
  } catch (e) {
    const st = estadoDeError(e, {}, "No pudimos calcular los escenarios.");
    return { error: st.error, fields: st.fields };
  }
}

/** Guarda el brief (inmutable) y abre su detalle. */
export async function guardarBriefAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("forraje.crear")) return { error: "Tu rol no permite guardar briefs." };
  let entradas: BriefEntradas;
  try {
    entradas = JSON.parse(String(fd.get("entradas") ?? "{}"));
  } catch {
    return { error: "No pudimos leer el brief." };
  }
  const nombre = String(fd.get("nombre") ?? "").trim().slice(0, 120) || null;
  let id = "";
  try {
    const r = await api<One<S<"BriefForraje">>>(`/establecimientos/${ctx.activa.establecimiento_id}/forraje/briefs`, { method: "POST", body: { ...entradas, nombre } });
    id = r.data.id;
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el brief.");
  }
  revalidatePath("/forraje");
  redirect(`/forraje/${id}?ok=guardado`);
}

/** Revisión humana del brief (piloto con asesor): asesor, dueño o admin. */
export async function revisarBriefAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  const id = String(fd.get("brief") ?? "");
  if (!ctx.can("forraje.revisar")) return { error: "Solo el asesor, el dueño o un administrador pueden registrar la revisión." };
  if (!UUID.test(id)) return { error: "Brief inválido." };
  const resultado = fd.get("resultado") === "con_observaciones" ? "con_observaciones" : "revisado";
  const nota = String(fd.get("nota") ?? "").trim();
  if (nota.length < 10) return { fields: { nota: "Contá en al menos 10 caracteres qué revisaste o qué cambiarías." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/forraje/briefs/${id}/revisiones`, { method: "POST", body: { resultado, nota } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos registrar la revisión.");
  }
  revalidatePath(`/forraje/${id}`);
  revalidatePath("/forraje");
  return { ok: { mensaje: "Revisión registrada." } };
}
