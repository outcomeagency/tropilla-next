import "server-only";
import { createHash } from "node:crypto";
import { api } from "./api";
import type { One, S } from "./schemas";

export type ArchivoRef = S<"ArchivoRef">;

/** Tipos que acepta la carpeta documental desde la web (PDF y fotos). */
export const MIMES_DOCUMENTO = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
export const MAX_BYTES_DOCUMENTO = 10 * 1024 * 1024;

/**
 * Sube un archivo al almacenamiento de TROPILLA (TPA-36/44): la clave es su SHA-256.
 * POST /archivos/subidas → PUT a la URL prefirmada (simple o por partes) → completar,
 * donde la API verifica hash y bytes. Si el archivo ya existía, no se vuelve a subir.
 * Corre en el servidor: el navegador nunca ve la URL ni el token.
 */
export async function subirArchivo(est: string, file: File): Promise<ArchivoRef> {
  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const mime = file.type || "application/octet-stream";
  const ref = { sha256, bytes: buf.byteLength, mime };

  const sub = (await api<One<S<"Subida">>>("/archivos/subidas", { method: "POST", body: { ...ref, establecimiento_id: est } })).data;
  if (sub.estado === "completo" || !sub.subida_id) return ref;

  const partes: Array<{ numero: number; etag: string }> = [];
  if (sub.modo === "multipart" && sub.partes?.length) {
    const tam = sub.parte_bytes ?? Math.ceil(buf.byteLength / sub.partes.length);
    for (const p of sub.partes) {
      const numero = p.numero ?? 1;
      const desde = (numero - 1) * tam;
      const r = await fetch(p.url ?? "", { method: "PUT", body: buf.subarray(desde, Math.min(desde + tam, buf.byteLength)), signal: AbortSignal.timeout(60_000) });
      if (!r.ok) throw new Error(`No pudimos subir la parte ${numero} del archivo.`);
      partes.push({ numero, etag: (r.headers.get("etag") ?? "").replaceAll('"', "") });
    }
  } else if (sub.url) {
    const r = await fetch(sub.url, { method: "PUT", body: buf, headers: { "Content-Type": mime }, signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error("No pudimos subir el archivo.");
  }
  await api(`/archivos/subidas/${sub.subida_id}/completar`, { method: "POST", body: partes.length ? { partes } : {} });
  return ref;
}

/** Valida tipo y tamaño antes de subir. */
export function validarArchivo(file: File | null): string | null {
  if (!file || !file.size) return null;
  if (file.size > MAX_BYTES_DOCUMENTO) return "El archivo supera los 10 MB. Mandá una foto más liviana o un PDF comprimido.";
  if (file.type && !MIMES_DOCUMENTO.includes(file.type)) return "Subí un PDF o una foto (JPG, PNG, WebP).";
  return null;
}

export type DocumentoNuevo = {
  tipo: string;
  titulo: string;
  privacidad?: "fiscal" | "sanitario" | "comercial" | "general";
  emisor?: { nombre?: string | null; identificacion?: string | null } | null;
  emitido_en?: string | null;
  vence_en?: string | null;
  vinculos?: Array<{ tipo: string; id: string }>;
};

/** Sube el archivo y registra el documento (versión 1, con huella en la cadena). Devuelve el documento creado. */
export async function crearDocumentoConArchivo(est: string, file: File, doc: DocumentoNuevo, ids?: { id?: string; version_id?: string }) {
  const ref = await subirArchivo(est, file);
  const body = Object.fromEntries(Object.entries({ ...doc, ...ids, archivos: [ref] }).filter(([, v]) => v !== undefined && v !== ""));
  return (await api<One<S<"Documento">>>(`/establecimientos/${est}/documentos`, { method: "POST", body })).data;
}
