"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { decimal, estadoDeError, fdStr, isFecha, postEvento } from "./eventos-api";

export interface FilaPesada {
  key: string;
  animal_id: string;
  ident: string;
  peso: string;
}

export interface PesadaState {
  error?: string;
  fields?: Record<string, string>;
  /** Filas guardadas en este envío (keys). */
  guardadas?: string[];
  /** Advertencias por fila (pesaje atípico, posterior a baja…) a confirmar. */
  avisos?: Record<string, string[]>;
  /** Errores por fila. */
  errores?: Record<string, string>;
  /** Contador acumulado para el mensaje de éxito. */
  total?: number;
  ts?: number;
}

const METODOS = ["balanza", "cinta", "estimado"];

/**
 * Sesión de pesada (TPA-23): un evento `hacienda.pesaje` individual por
 * animal, cada uno con su clave de idempotencia (la key de la fila: un
 * reintento no duplica). Lo que la API advierte (difiere > 30 % en < 30 días)
 * no se guarda hasta confirmarlo fila por fila.
 */
export async function registrarPesadaAction(prev: PesadaState, fd: FormData): Promise<PesadaState> {
  const ctx = await requireContexto();
  if (!ctx.can("hacienda.crear")) return { error: "Tu rol no permite cargar pesajes." };
  const est = ctx.activa.establecimiento_id;
  const fecha = fdStr(fd, "ocurrido_en");
  const metodo = fdStr(fd, "metodo");
  const fields: Record<string, string> = {};
  if (!isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha de la pesada.";
  if (!METODOS.includes(metodo)) fields.metodo = "Elegí cómo se pesó.";
  let filas: FilaPesada[] = [];
  try {
    filas = (JSON.parse(fdStr(fd, "filas") || "[]") as FilaPesada[]).filter((f) => f.animal_id).slice(0, 300);
  } catch {
    return { error: "No pudimos leer la planilla de pesada. Recargá la página." };
  }
  if (!filas.length) fields.filas = "Sumá al menos un animal con su peso.";
  const errores: Record<string, string> = {};
  for (const f of filas) {
    const d = decimal(f.peso ?? "");
    if (!d || Number(d) <= 0 || Number(d) > 2500) errores[f.key] = "Peso en kg (ej. 412,5).";
  }
  if (Object.keys(fields).length) return { fields, errores, error: Object.values(fields)[0] };
  if (Object.keys(errores).length) return { errores, error: "Revisá los pesos marcados." };

  const confirmadas = new Set(fd.getAll("confirmar_key").map(String));
  const desbaste = fd.get("desbaste") === "on";
  const pct = decimal(fdStr(fd, "desbaste_pct"));
  const guardadas: string[] = [];
  const avisos: Record<string, string[]> = {};
  const obs = fdStr(fd, "observaciones").slice(0, 2000) || null;

  for (const f of filas) {
    try {
      await postEvento(est, {
        id: f.key,
        tipo: "hacienda.pesaje",
        sujetos: { tipo: "animales", animal_ids: [f.animal_id] },
        payload: { modo: "individual", peso_kg: decimal(f.peso), metodo, ...(desbaste ? { desbaste: true, ...(pct ? { desbaste_pct: pct } : {}) } : {}) },
        ocurrido_en: fecha,
        observaciones: obs,
        confirmar_advertencias: confirmadas.has(f.key),
      });
      guardadas.push(f.key);
    } catch (e) {
      if (e instanceof ApiError && e.code === "requiere_confirmacion") avisos[f.key] = e.advertencias?.length ? e.advertencias : [e.message];
      else if (e instanceof ApiError && e.status === 409 && e.code === "id_reutilizado") guardadas.push(f.key);
      else errores[f.key] = estadoDeError(e, {}, "No se pudo guardar.").error ?? "No se pudo guardar.";
    }
  }
  if (guardadas.length) {
    revalidatePath("/hacienda", "layout");
  }
  return {
    guardadas,
    avisos,
    errores,
    total: (prev.total ?? 0) + guardadas.length,
    ts: Date.now(),
    error: Object.keys(errores).length ? "Algunas filas no se guardaron: revisalas." : undefined,
  };
}
