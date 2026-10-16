"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError } from "./eventos-api";
import { IMPORTACION_COOKIE, type Importacion, type ImportacionFila } from "./data/importaciones";
import type { One } from "./schemas";

/** Columnas de la plantilla (ValidadorFila::COLUMNAS de la API). */
const COLUMNAS = new Set([
  "especie", "sexo", "categoria", "raza", "caravana", "caravana_oficial", "rfid", "tatuaje", "marca",
  "fecha_nacimiento", "nacimiento_estimado", "castrado", "denticion", "lote", "potrero", "senas",
]);
const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SubidaState {
  error?: string;
}

async function contexto() {
  const ctx = await requireContexto();
  if (!ctx.can("importaciones.gestionar")) return null;
  return ctx.activa.establecimiento_id;
}

async function recordar(est: string, id: string | null) {
  const jar = await cookies();
  if (!id) {
    jar.delete(IMPORTACION_COOKIE);
    return;
  }
  jar.set(IMPORTACION_COOKIE, `${est}:${id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Sube la planilla (CSV/XLSX) a la API en multipart desde el servidor: el
 * token nunca toca el navegador. La API responde 202 y valida en cola.
 */
export async function subirPlanillaAction(_prev: SubidaState, fd: FormData): Promise<SubidaState> {
  const est = await contexto();
  if (!est) return { error: "Tu rol no permite importar hacienda en este establecimiento." };

  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí la planilla que completaste (CSV o Excel)." };
  const ext = archivo.name.toLowerCase().split(".").pop();
  if (ext !== "csv" && ext !== "xlsx") return { error: "La planilla tiene que ser .csv o .xlsx. Si usás un .xls viejo, guardalo como «Libro de Excel (.xlsx)»." };
  if (archivo.size > MAX_BYTES) return { error: "La planilla pesa más de 10 MB. Dividila en dos archivos." };
  const especie = String(fd.get("especie_default") ?? "");

  const body = new FormData();
  body.set("archivo", archivo, archivo.name);
  body.set("formato", ext);
  if (especie === "BOV" || especie === "BUB") body.set("especie_default", especie);

  let id: string;
  try {
    const res = await api<One<Importacion>>(`/establecimientos/${est}/importaciones`, { method: "POST", body, timeoutMs: 60_000 });
    id = res.data.id;
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) return { error: e.field("archivo") ?? e.message };
    return { error: estadoDeError(e, {}, "No pudimos subir la planilla. Probá de nuevo.").error };
  }
  await recordar(est, id);
  redirect(`/hacienda/importar/${id}`);
}

export interface FilaResult {
  fila?: ImportacionFila;
  importacion?: Importacion;
  error?: string;
}

/**
 * Corrige una fila (`datos` = columnas de la planilla, la API revalida en el
 * acto) o la descarta / la vuelve a incluir (`accion`).
 */
export async function corregirFilaAction(
  importacionId: string,
  numero: number,
  cambios: { datos?: Record<string, string>; accion?: "importar" | "descartar" },
): Promise<FilaResult> {
  const est = await contexto();
  if (!est) return { error: "Tu rol no permite importar hacienda en este establecimiento." };
  if (!UUID.test(importacionId) || !Number.isInteger(numero) || numero < 1) return { error: "Fila inválida." };

  const body: { datos?: Record<string, string>; accion?: string } = {};
  if (cambios.accion === "importar" || cambios.accion === "descartar") body.accion = cambios.accion;
  if (cambios.datos) {
    body.datos = {};
    for (const [k, v] of Object.entries(cambios.datos)) {
      if (COLUMNAS.has(k)) body.datos[k] = String(v ?? "").trim().slice(0, 2000);
    }
  }
  const path = `/establecimientos/${est}/importaciones/${importacionId}`;
  try {
    const res = await api<One<ImportacionFila>>(`${path}/filas/${numero}`, { method: "PATCH", body });
    const imp = await api<One<Importacion>>(path).catch(() => null);
    return { fila: res.data, importacion: imp?.data };
  } catch (e) {
    if (e instanceof ApiError && e.status === 422 && e.errors?.estado) return { error: "Esta planilla ya no se puede editar (se confirmó o se canceló). Recargá la página." };
    return { error: estadoDeError(e, {}, "No pudimos guardar la corrección. Probá de nuevo.").error };
  }
}

/** Confirma: la API registra un `hacienda.alta` por fila válida (en cola, idempotente). */
export async function confirmarImportacionAction(importacionId: string): Promise<{ error?: string }> {
  const est = await contexto();
  if (!est) return { error: "Tu rol no permite importar hacienda en este establecimiento." };
  if (!UUID.test(importacionId)) return { error: "Importación inválida." };
  try {
    await api(`/establecimientos/${est}/importaciones/${importacionId}/confirmar`, { method: "POST", timeoutMs: 30_000 });
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      if (e.errors?.filas) return { error: "No hay filas listas para importar: corregí o descartá las que tienen errores." };
      if (e.errors?.estado) return { error: "La planilla todavía se está revisando. Esperá unos segundos y probá de nuevo." };
    }
    return { error: estadoDeError(e, {}, "No pudimos confirmar la importación. Probá de nuevo.").error };
  }
  await recordar(est, null);
  revalidatePath("/hacienda");
  redirect(`/hacienda/importar/${importacionId}?confirmando=1`);
}

export async function cancelarImportacionAction(importacionId: string): Promise<{ error?: string }> {
  const est = await contexto();
  if (!est) return { error: "Tu rol no permite importar hacienda en este establecimiento." };
  if (!UUID.test(importacionId)) return { error: "Importación inválida." };
  try {
    await api(`/establecimientos/${est}/importaciones/${importacionId}/cancelar`, { method: "POST" });
  } catch (e) {
    return { error: estadoDeError(e, {}, "No pudimos cancelar la importación. Probá de nuevo.").error };
  }
  await recordar(est, null);
  redirect("/hacienda/importar?cancelada=1");
}
