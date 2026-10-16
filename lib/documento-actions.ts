"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, fdStr, isFecha, uuidv7, type EventoActionState } from "./eventos-api";
import { crearDocumentoConArchivo, subirArchivo, validarArchivo } from "./archivos";

function vinculosDe(fd: FormData) {
  const out: Array<{ tipo: string; id: string }> = [];
  for (const id of fd.getAll("animal_id").map(String).filter(Boolean)) out.push({ tipo: "animal", id });
  const lote = fdStr(fd, "lote_id");
  if (lote) out.push({ tipo: "lote", id: lote });
  const potrero = fdStr(fd, "potrero_id");
  if (potrero) out.push({ tipo: "potrero", id: potrero });
  return out;
}

function fechas(fd: FormData, fields: Record<string, string>) {
  const emitido = fdStr(fd, "emitido_en");
  const vence = fdStr(fd, "vence_en");
  if (emitido && !isFecha(emitido)) fields.emitido_en = "Fecha inválida.";
  if (vence && !isFecha(vence)) fields.vence_en = "Fecha inválida.";
  if (emitido && vence && vence < emitido) fields.vence_en = "No puede vencer antes de emitirse.";
  return { emitido_en: emitido || null, vence_en: vence || null };
}

/** Alta de un documento: sube el archivo (server-side) y registra la versión 1 con su huella (TPA-36). */
export async function crearDocumentoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("documentos.crear")) return { error: "Tu rol no permite cargar documentos." };
  const est = ctx.activa.establecimiento_id;
  const fields: Record<string, string> = {};
  const archivo = fd.get("archivo");
  const file = archivo instanceof File && archivo.size ? archivo : null;
  if (!file) fields.archivo = "Elegí el PDF o la foto del documento.";
  else {
    const err = validarArchivo(file);
    if (err) fields.archivo = err;
  }
  const tipo = fdStr(fd, "tipo");
  if (!tipo) fields.tipo = "Elegí el tipo de documento.";
  const privacidad = fdStr(fd, "privacidad");
  if (privacidad === "fiscal" && !ctx.can("documentos.fiscal")) fields.privacidad = "Tu rol no permite cargar documentos fiscales.";
  const titulo = fdStr(fd, "titulo").slice(0, 200);
  if (!titulo) fields.titulo = "Poné un título que lo identifique (ej. «Acta aftosa 1.ª campaña 2026»).";
  const f = fechas(fd, fields);
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  let id = fdStr(fd, "doc_id") || uuidv7();
  try {
    const doc = await crearDocumentoConArchivo(
      est,
      file!,
      {
        tipo,
        titulo,
        privacidad: (["fiscal", "sanitario", "comercial", "general"].includes(privacidad) ? privacidad : undefined) as "fiscal" | undefined,
        emisor: fdStr(fd, "emisor") ? { nombre: fdStr(fd, "emisor").slice(0, 200) } : null,
        ...f,
        vinculos: vinculosDe(fd),
      },
      { id, version_id: fdStr(fd, "doc_version_id") || uuidv7() },
    );
    id = doc.id ?? id;
  } catch (e) {
    if (e instanceof Error && !("status" in e)) return { error: e.message };
    return estadoDeError(e, { "archivos.0.mime": "archivo", "vinculos.0.id": "animales" }, "No pudimos guardar el documento. Probá de nuevo.");
  }
  revalidatePath("/documentos", "layout");
  redirect(`/documentos/${id}?ok=creado`);
}

/** Nueva versión (archivo nuevo), corrección de datos o revocación: siempre con motivo; la anterior queda. */
export async function versionDocumentoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  const accion = fdStr(fd, "accion");
  if (!["nueva_version", "correccion_metadatos", "revocacion"].includes(accion)) return { error: "Acción inválida." };
  if (!ctx.can("documentos.versionar")) return { error: "Tu rol no permite versionar documentos." };
  const est = ctx.activa.establecimiento_id;
  const id = fdStr(fd, "id");
  const fields: Record<string, string> = {};
  const motivo = fdStr(fd, "motivo").slice(0, 500);
  if (!motivo) fields.motivo = accion === "revocacion" ? "Contá por qué se revoca (ej. «el SENASA lo dio de baja»)." : "Contá qué cambió (ej. «constancia renovada»).";
  const body: Record<string, unknown> = { id: fdStr(fd, "version_id") || uuidv7(), accion, motivo };
  if (accion !== "revocacion") {
    Object.assign(body, fechas(fd, fields));
    const titulo = fdStr(fd, "titulo").slice(0, 200);
    if (titulo) body.titulo = titulo;
    if (fd.has("emisor")) body.emisor = fdStr(fd, "emisor") ? { nombre: fdStr(fd, "emisor").slice(0, 200) } : null;
  }
  let file: File | null = null;
  if (accion === "nueva_version") {
    const a = fd.get("archivo");
    file = a instanceof File && a.size ? a : null;
    if (!file) fields.archivo = "Elegí el archivo de la versión nueva.";
    else {
      const err = validarArchivo(file);
      if (err) fields.archivo = err;
    }
  }
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };
  try {
    if (file) body.archivos = [await subirArchivo(est, file)];
    await api(`/establecimientos/${est}/documentos/${id}/versiones`, { method: "POST", body });
  } catch (e) {
    if (e instanceof Error && !("status" in e)) return { error: e.message };
    return estadoDeError(e, {}, "No pudimos guardar el cambio.");
  }
  revalidatePath("/documentos", "layout");
  return { ok: { mensaje: accion === "revocacion" ? "Documento revocado: queda en la historia, ya no cuenta como vigente." : accion === "nueva_version" ? "Versión nueva guardada. La anterior sigue en la historia." : "Datos corregidos con su motivo." } };
}

/** Privado o visible en el perfil público (los fiscales nunca). */
export async function visibilidadDocumentoAction(fd: FormData): Promise<void> {
  const ctx = await requireContexto();
  if (!ctx.can("documentos.publicar")) throw new Error("sin_permiso");
  const id = fdStr(fd, "id");
  await api(`/establecimientos/${ctx.activa.establecimiento_id}/documentos/${id}/visibilidad`, {
    method: "POST",
    body: { visibilidad: fdStr(fd, "visibilidad") === "perfil" ? "perfil" : "privado", row_version: Number(fdStr(fd, "row_version") || "1") },
  });
  revalidatePath("/documentos", "layout");
  redirect(`/documentos/${id}?ok=visibilidad`);
}
