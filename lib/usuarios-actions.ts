"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { requireContexto, setActiveEstablecimiento } from "./establecimiento";
import { getToken } from "./session";
import type { One, S } from "./schemas";

export interface InviteState {
  error?: string;
  fields?: Record<string, string>;
  creada?: { url: string | null; destino: string; rol: string };
}

const ROLES = ["admin", "encargado", "asesor", "lectura"] as const;
type RolInvitable = (typeof ROLES)[number];

/** Invitar por email o teléfono con rol (TPA-11). La API devuelve la URL sólo en la creación. */
export async function invitarAction(_prev: InviteState, fd: FormData): Promise<InviteState> {
  const ctx = await requireContexto();
  if (!ctx.can("usuarios.gestionar")) return { error: "Tu rol no permite invitar usuarios." };
  const destino = String(fd.get("destino") ?? "").trim();
  const rol = String(fd.get("rol") ?? "") as RolInvitable;
  const fields: Record<string, string> = {};
  const esEmail = destino.includes("@");
  if (!destino) fields.destino = "Escribí un email o un teléfono.";
  else if (esEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) fields.destino = "Revisá el email.";
  else if (!esEmail && destino.replace(/\D/g, "").length < 8) fields.destino = "Revisá el teléfono: incluí la característica.";
  if (!ROLES.includes(rol)) fields.rol = "Elegí un rol.";
  if (Object.keys(fields).length) return { fields };

  try {
    const res = await api<One<S<"Invitacion">>>(`/establecimientos/${ctx.activa.establecimiento_id}/invitaciones`, {
      method: "POST",
      body: { email: esEmail ? destino.toLowerCase() : null, telefono: esEmail ? null : destino.replace(/[^\d+]/g, ""), rol } satisfies S<"InvitacionInput">,
    });
    revalidatePath("/configuracion/usuarios");
    return { creada: { url: res.data.url ?? null, destino, rol } };
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      const m = e.field("email") ?? e.field("telefono");
      return m ? { fields: { destino: m } } : { error: e.message };
    }
    if (e instanceof ApiError && e.status === 403) return { error: "Tu rol no permite invitar usuarios." };
    return { error: "No pudimos crear la invitación. Probá de nuevo." };
  }
}

/** Cambiar rol (la API revoca la membresía y crea una nueva: queda en la auditoría). */
export async function cambiarRolAction(fd: FormData): Promise<void> {
  const ctx = await requireContexto();
  const id = String(fd.get("membresia_id") ?? "");
  const rol = String(fd.get("rol") ?? "") as RolInvitable;
  if (!ctx.can("usuarios.gestionar") || !ROLES.includes(rol)) redirect("/configuracion/usuarios?error=permiso");
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/membresias/${id}/rol`, { method: "POST", body: { rol, motivo: "Cambio de rol desde la web" } satisfies S<"RolInput"> });
  } catch {
    redirect("/configuracion/usuarios?error=rol");
  }
  revalidatePath("/configuracion/usuarios");
  redirect("/configuracion/usuarios?ok=rol");
}

export async function revocarMembresiaAction(fd: FormData): Promise<void> {
  const ctx = await requireContexto();
  const id = String(fd.get("membresia_id") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim() || "Revocado desde la web";
  if (!ctx.can("usuarios.gestionar")) redirect("/configuracion/usuarios?error=permiso");
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/membresias/${id}/revocar`, { method: "POST", body: { motivo } satisfies S<"MotivoInput"> });
  } catch {
    redirect("/configuracion/usuarios?error=revocar");
  }
  revalidatePath("/configuracion/usuarios");
  redirect("/configuracion/usuarios?ok=revocada");
}

export async function revocarInvitacionAction(fd: FormData): Promise<void> {
  const ctx = await requireContexto();
  const id = String(fd.get("invitacion_id") ?? "");
  if (!ctx.can("usuarios.gestionar")) redirect("/configuracion/usuarios?error=permiso");
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/invitaciones/${id}/revocar`, { method: "POST" });
  } catch {
    redirect("/configuracion/usuarios?error=invitacion");
  }
  revalidatePath("/configuracion/usuarios");
  redirect("/configuracion/usuarios?ok=invitacion");
}

/** El invitado acepta y entra al establecimiento (queda como activo). */
export async function aceptarInvitacionAction(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  if (!(await getToken())) redirect(`/ingresar?next=/invitacion/${encodeURIComponent(token)}`);
  let est = "";
  try {
    const res = await api<One<S<"MembresiaResumen">>>(`/invitaciones/${encodeURIComponent(token)}/aceptar`, { method: "POST" });
    est = res.data.establecimiento_id;
  } catch (e) {
    const motivo = e instanceof ApiError && (e.status === 410 || e.status === 404) ? "vencida" : e instanceof ApiError && e.status === 422 ? "otra-cuenta" : "error";
    redirect(`/invitacion/${encodeURIComponent(token)}?error=${motivo}`);
  }
  await setActiveEstablecimiento(est);
  redirect("/inicio");
}
