"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { SECCIONES, type TextosPerfil } from "./perfil";
import type { One, S } from "./schemas";

export interface PerfilFormState {
  error?: string;
  ok?: boolean;
  fields?: Record<string, string>;
}

const base = (est: string) => `/establecimientos/${est}/perfil`;

async function ctxEditor(ability: string) {
  const ctx = await requireContexto();
  if (!ctx.can(ability)) throw new Error("sin_permiso");
  return { est: ctx.activa.establecimiento_id, ctx };
}

/** Guardar secciones, textos, idiomas, contacto visible y directorio (PATCH …/perfil). */
export async function guardarPerfilAction(_prev: PerfilFormState, fd: FormData): Promise<PerfilFormState> {
  let c;
  try {
    c = await ctxEditor("perfil.editar");
  } catch {
    return { error: "Tu rol no permite editar el perfil público." };
  }
  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3) {
    return { fields: { slug: "Usá letras sin acentos, números y guiones (ej. la-esperanza)." } };
  }
  const idiomas = fd.getAll("idiomas").map(String) as Array<"es" | "en" | "pt">;
  if (!idiomas.includes("es")) idiomas.unshift("es");
  let actual: S<"Perfil">;
  try {
    actual = (await api<One<S<"Perfil">>>(base(c.est))).data;
  } catch {
    return { error: "No pudimos leer el perfil. Probá de nuevo." };
  }
  const prevSecciones = (actual.secciones ?? {}) as Record<string, Record<string, unknown>>;
  const textos: TextosPerfil = { ...((actual.textos ?? {}) as TextosPerfil) };
  const fields: Record<string, string> = {};
  for (const l of ["es", "en", "pt"] as const) {
    const titulo = String(fd.get(`titulo_${l}`) ?? "").trim();
    const descripcion = String(fd.get(`descripcion_${l}`) ?? "").trim();
    const historia = String(fd.get(`historia_${l}`) ?? "").trim();
    if (descripcion.length > 160) fields[`descripcion_${l}`] = "Hasta 160 caracteres (es lo que muestra Google).";
    if (titulo.length > 80) fields[`titulo_${l}`] = "Hasta 80 caracteres.";
    if (fd.has(`titulo_${l}`)) textos[l] = { titulo: titulo || undefined, descripcion: descripcion || undefined, historia: historia || undefined };
  }
  if (Object.keys(fields).length) return { fields, error: "Revisá los textos marcados." };
  const body: S<"PerfilInput"> = {
    slug,
    en_directorio: fd.get("en_directorio") === "on",
    secciones: Object.fromEntries(SECCIONES.map(({ k }) => [k, { ...prevSecciones[k], activa: fd.get(`sec_${k}`) === "on" }])),
    textos,
    idiomas,
    contacto_visible: {
      whatsapp: fd.get("cv_whatsapp") === "on",
      email: fd.get("cv_email") === "on",
      telefono: fd.get("cv_telefono") === "on",
    },
    ubicacion_publica: String(fd.get("ubicacion_publica") ?? "departamento"),
    row_version: actual.row_version ?? Number(fd.get("row_version") ?? 0),
  };
  try {
    await api(base(c.est), { method: "PATCH", body });
  } catch (e) {
    if (e instanceof ApiError && (e.code === "conflicto_row_version" || e.status === 409)) return { error: "Alguien más cambió el perfil. Recargá la página." };
    if (e instanceof ApiError && e.status === 422) return { error: e.message, fields: e.field("slug") ? { slug: e.field("slug")! } : undefined };
    return { error: "No pudimos guardar. Probá de nuevo." };
  }
  revalidateTag(`perfil:${slug}`, "max");
  if (actual.slug && actual.slug !== slug) revalidateTag(`perfil:${actual.slug}`, "max");
  revalidateTag("directorio", "max");
  revalidatePath("/perfil-publico");
  return { ok: true };
}

/** «Se ve bien»: registra la vista previa (obligatoria antes de la primera publicación). */
export async function aceptarPreviewAction(): Promise<void> {
  const c = await ctxEditor("perfil.publicar");
  await api(`${base(c.est)}/preview/aceptar`, { method: "POST" });
  redirect("/perfil-publico?preview=ok");
}

export async function publicarPerfilAction(fd: FormData): Promise<void> {
  const c = await ctxEditor("perfil.publicar");
  const publicar = fd.get("accion") === "publicar";
  let error: string | null = null;
  try {
    await api(`${base(c.est)}/${publicar ? "publicar" : "despublicar"}`, { method: "POST" });
  } catch (e) {
    if (e instanceof ApiError && e.code === "preview_requerida") redirect("/perfil-publico/vista-previa");
    if (e instanceof ApiError && (e.code === "email_no_verificado" || e.status === 403)) error = "email";
    else throw e;
  }
  if (error) redirect(`/perfil-publico?error=${error}`);
  const slug = String(fd.get("slug") ?? "");
  if (slug) revalidateTag(`perfil:${slug}`, "max");
  revalidateTag("directorio", "max");
  redirect(`/perfil-publico?${publicar ? "publicado=1" : "despublicado=1"}`);
}

/** Congelar / descongelar una sección derivada (rodeo, sanidad, trazabilidad). */
export async function congelarSeccionAction(fd: FormData): Promise<void> {
  const c = await ctxEditor("perfil.editar");
  const seccion = String(fd.get("seccion") ?? "");
  const congelar = fd.get("accion") === "congelar";
  await api(`${base(c.est)}/secciones/${seccion}/${congelar ? "congelar" : "descongelar"}`, { method: "POST" });
  const slug = String(fd.get("slug") ?? "");
  if (slug) revalidateTag(`perfil:${slug}`, "max");
  redirect("/perfil-publico");
}
