"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { isMockable } from "./mock/fallback";
import { SECCIONES, mockGuardarPerfil, mockPerfil } from "./mock/perfil-panel";
import type { S } from "./schemas";

export interface PerfilFormState {
  error?: string;
  ok?: boolean;
  fields?: Record<string, string>;
}

const base = (est: string) => `/establecimientos/${est}/perfil`;

async function ctxEditor(ability: string) {
  const ctx = await requireContexto();
  if (!ctx.can(ability)) throw new Error("sin_permiso");
  return { est: ctx.activa.establecimiento_id, nombre: ctx.activa.establecimiento_nombre ?? "Establecimiento", ctx };
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
  const prevSecciones = (mockPerfil(c.est, c.nombre).secciones ?? {}) as Record<string, { congelada_en?: string | null }>;
  const body: S<"PerfilInput"> = {
    slug,
    en_directorio: fd.get("en_directorio") === "on",
    secciones: Object.fromEntries(SECCIONES.map((s) => [s, { activa: fd.get(`sec_${s}`) === "on", congelada_en: prevSecciones[s]?.congelada_en ?? null }])),
    textos: { historia: String(fd.get("historia") ?? "").trim() },
    idiomas,
    contacto_visible: {
      formulario: fd.get("sec_contacto") === "on",
      whatsapp: fd.get("cv_whatsapp") === "on",
      email: fd.get("cv_email") === "on",
      telefono: fd.get("cv_telefono") === "on",
    },
    ubicacion_publica: String(fd.get("ubicacion_publica") ?? "departamento"),
    row_version: Number(fd.get("row_version") ?? 0),
  };
  try {
    await api(base(c.est), { method: "PATCH", body });
  } catch (e) {
    if (e instanceof ApiError && e.code === "conflicto_row_version") return { error: "Alguien más cambió el perfil. Recargá la página." };
    if (e instanceof ApiError && e.status === 422) return { error: e.message, fields: e.field("slug") ? { slug: e.field("slug")! } : undefined };
    if (!isMockable(e)) return { error: "No pudimos guardar. Probá de nuevo." };
    mockGuardarPerfil(c.est, c.nombre, { ...body, slug, url_publica: `/es/p/${slug}` } as Partial<S<"Perfil">>);
  }
  revalidatePath("/perfil-publico");
  return { ok: true };
}

/** «Se ve bien»: registra la vista previa (obligatoria antes de la primera publicación). */
export async function aceptarPreviewAction(): Promise<void> {
  const c = await ctxEditor("perfil.publicar");
  try {
    await api(`${base(c.est)}/preview/aceptar`, { method: "POST" });
  } catch (e) {
    if (!isMockable(e)) throw e;
    mockGuardarPerfil(c.est, c.nombre, { preview_aceptada_en: new Date().toISOString() });
  }
  redirect("/perfil-publico?preview=ok");
}

export async function publicarPerfilAction(fd: FormData): Promise<void> {
  const c = await ctxEditor("perfil.publicar");
  const publicar = fd.get("accion") === "publicar";
  try {
    await api(`${base(c.est)}/${publicar ? "publicar" : "despublicar"}`, { method: "POST" });
  } catch (e) {
    if (e instanceof ApiError && e.code === "preview_requerida") redirect("/perfil-publico/vista-previa");
    if (!isMockable(e)) throw e;
    const actual = mockPerfil(c.est, c.nombre);
    if (publicar && !actual.preview_aceptada_en) redirect("/perfil-publico/vista-previa");
    mockGuardarPerfil(c.est, c.nombre, {
      publicado: publicar,
      primera_publicacion_en: actual.primera_publicacion_en ?? (publicar ? new Date().toISOString() : null),
    });
  }
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
  try {
    await api(`${base(c.est)}/secciones/${seccion}/${congelar ? "congelar" : "descongelar"}`, { method: "POST" });
  } catch (e) {
    if (!isMockable(e)) throw e;
    const actual = mockPerfil(c.est, c.nombre);
    const secs = { ...(actual.secciones ?? {}) } as Record<string, { activa?: boolean; congelada_en?: string | null }>;
    secs[seccion] = { ...secs[seccion], congelada_en: congelar ? new Date().toISOString() : null };
    mockGuardarPerfil(c.est, c.nombre, { secciones: secs });
  }
  redirect("/perfil-publico");
}
