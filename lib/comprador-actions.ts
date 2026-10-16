"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { getSesionOpcional } from "./auth";
import { isMockable } from "./mock/fallback";
import { mockGuardarComprador, mockInformarPago, mockTomar } from "./mock/contratos";
import type { S } from "./schemas";

export interface CompradorState {
  error?: string;
  fields?: Record<string, string>;
}

const TIPOS = ["frigorifico", "exportador", "gastronomico", "institucion", "productor", "otro"] as const;

/** Cuenta liviana de comprador (empresa, país, tipo). */
export async function guardarCompradorAction(_prev: CompradorState, fd: FormData): Promise<CompradorState> {
  const me = await getSesionOpcional();
  if (!me) redirect("/ingresar?next=/comprador/cuenta");
  const body: S<"Comprador"> = {
    empresa: String(fd.get("empresa") ?? "").trim(),
    tipo: String(fd.get("tipo") ?? "") as S<"Comprador">["tipo"],
    pais: String(fd.get("pais") ?? "").trim(),
    volumen_habitual: String(fd.get("volumen") ?? "").trim() || null,
    idiomas: ["es"],
  };
  const fields: Record<string, string> = {};
  if (body.empresa.length < 2) fields.empresa = "Escribí el nombre de la empresa (o el tuyo si comprás como persona).";
  if (!TIPOS.includes(body.tipo)) fields.tipo = "Elegí qué tipo de comprador sos.";
  if (!body.pais) fields.pais = "Elegí el país.";
  if (Object.keys(fields).length) return { fields };
  try {
    await api("/me/comprador", { method: "PUT", body });
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) return { error: e.message };
    if (!isMockable(e)) return { error: "No pudimos guardar. Probá de nuevo." };
    mockGuardarComprador(me.usuario.id, body);
  }
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/comprador");
}

export interface TomaState {
  error?: string;
}

/** Tomar N tokens de un contrato publicado (requiere cuenta de comprador y email verificado). */
export async function tomarTokensAction(_prev: TomaState, fd: FormData): Promise<TomaState> {
  const codigo = String(fd.get("codigo") ?? "");
  const locale = String(fd.get("locale") ?? "es");
  const me = await getSesionOpcional();
  if (!me) redirect(`/ingresar?next=/${locale}/contratos/${codigo}`);
  const tokens = Number(fd.get("tokens"));
  if (!Number.isInteger(tokens) || tokens < 1) return { error: "Elegí cuántos tokens tomar." };
  if (me.usuario.email && me.usuario.email_verificado === false) return { error: "Verificá tu email antes de tomar tokens." };
  try {
    await api(`/contratos/${encodeURIComponent(codigo)}/tomas`, {
      method: "POST",
      body: { tokens } satisfies S<"TomaInput">,
      headers: { "Idempotency-Key": String(fd.get("idem") ?? crypto.randomUUID()) },
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === "tokens_insuficientes") return { error: "Ya no quedan tantos tokens libres. Elegí menos." };
    if (!isMockable(e)) return { error: e instanceof ApiError ? e.message : "No pudimos reservar los tokens." };
    const r = mockTomar(codigo, me.usuario.id, { nombre: me.usuario.nombre, empresa: me.comprador?.empresa }, tokens);
    if (r === "insuficientes") return { error: "Ya no quedan tantos tokens libres. Elegí menos." };
    if (!r) return { error: "El contrato no está disponible." };
  }
  redirect("/comprador?reservada=1");
}

/** El comprador informa «pagué» el anticipo (después confirma el productor). */
export async function informarPagoAction(fd: FormData): Promise<void> {
  const me = await getSesionOpcional();
  if (!me) redirect("/ingresar?next=/comprador");
  const id = String(fd.get("toma_id") ?? "");
  try {
    await api(`/comprador/tomas/${id}/pago-informado`, { method: "POST", body: { fecha: new Date().toISOString().slice(0, 10) } });
  } catch (e) {
    if (!isMockable(e)) redirect("/comprador?error=pago");
    mockInformarPago(me.usuario.id, id);
  }
  revalidatePath("/comprador");
  redirect("/comprador?pago=1");
}
