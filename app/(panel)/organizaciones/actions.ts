"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { getContexto } from "@/lib/establecimiento";
import type { One, S } from "@/lib/schemas";

const alcanceKeys = ["existencias_agregadas", "cobertura_sanitaria", "lotes_postulados", "precios_agregados"] as const;

function productorId(ctx: NonNullable<Awaited<ReturnType<typeof getContexto>>>) {
  // La API usa el identificador del productor en esta ruta; el onboarding vincula
  // al productor al usuario propietario y el contrato no expone un alias /me.
  return ctx.me.usuario.id;
}

export async function adherirAction(fd: FormData) {
  const ctx = await getContexto();
  if (!ctx || !ctx.can("organizaciones.adherir")) throw new Error("No tenés permiso para adherirte a organizaciones.");
  const alcances = Object.fromEntries(alcanceKeys.map((key) => [key, fd.get(key) === "on"])) as S<"Alcances">;
  await api<One<S<"Adhesion">>>(`/productores/${productorId(ctx)}/adhesiones`, {
    method: "POST",
    body: {
      organizacion_id: String(fd.get("organizacion_id")),
      alcances,
      texto_version: "adhesion-organizaciones-v1",
    } satisfies S<"AdhesionInput">,
  });
  revalidatePath("/organizaciones");
}

export async function consentimientoAction(fd: FormData) {
  const ctx = await getContexto();
  if (!ctx || !ctx.can("consentimientos.gestionar")) throw new Error("No tenés permiso para cambiar el consentimiento.");
  const alcances = Object.fromEntries(alcanceKeys.map((key) => [key, fd.get(key) === "on"])) as S<"Alcances">;
  await api<One<S<"Adhesion">>>(`/productores/${productorId(ctx)}/adhesiones/${String(fd.get("adhesion_id"))}/consentimiento`, {
    method: "POST",
    body: { alcances, texto_version: "adhesion-organizaciones-v1" } satisfies S<"ConsentimientoInput">,
  });
  revalidatePath("/organizaciones");
}

export async function revocarAction(fd: FormData) {
  const ctx = await getContexto();
  if (!ctx || !ctx.can("consentimientos.gestionar")) throw new Error("No tenés permiso para revocar esta adhesión.");
  await api<One<S<"Adhesion">>>(`/productores/${productorId(ctx)}/adhesiones/${String(fd.get("adhesion_id"))}/revocar`, {
    method: "POST",
    body: { motivo: String(fd.get("motivo") || "Decisión del productor") },
  });
  revalidatePath("/organizaciones");
}

export async function miembroAction(fd: FormData) {
  const ctx = await getContexto();
  const org = String(fd.get("organizacion_id"));
  if (!ctx?.me.organizaciones?.some((item) => item.id === org && item.rol === "admin") && !ctx?.me.usuario.es_staff) throw new Error("No tenés permiso para administrar integrantes.");
  await api(`/organizaciones/${org}/miembros`, { method: "POST", body: { email: String(fd.get("email")), rol: String(fd.get("rol")) } });
  revalidatePath("/organizaciones");
}

export async function cambiarRolMiembroAction(fd: FormData) {
  const ctx = await getContexto();
  const org = String(fd.get("organizacion_id"));
  const usuario = String(fd.get("usuario_id"));
  if (!ctx?.me.organizaciones?.some((item) => item.id === org && item.rol === "admin") && !ctx?.me.usuario.es_staff) throw new Error("No tenés permiso para administrar integrantes.");
  await api(`/organizaciones/${org}/miembros/${usuario}`, { method: "PATCH", body: { rol: String(fd.get("rol")) } });
  revalidatePath("/organizaciones");
}

export async function quitarMiembroAction(fd: FormData) {
  const ctx = await getContexto();
  const org = String(fd.get("organizacion_id"));
  const usuario = String(fd.get("usuario_id"));
  if (!ctx?.me.organizaciones?.some((item) => item.id === org && item.rol === "admin") && !ctx?.me.usuario.es_staff) throw new Error("No tenés permiso para administrar integrantes.");
  await api(`/organizaciones/${org}/miembros/${usuario}`, { method: "DELETE" });
  revalidatePath("/organizaciones");
}
