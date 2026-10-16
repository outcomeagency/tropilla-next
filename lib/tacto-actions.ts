"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, fdStr, isFecha, postEvento } from "./eventos-api";
import type { PesadaState } from "./pesaje-actions";

export interface FilaTacto {
  key: string;
  animal_id: string;
  resultado: "prenada" | "vacia" | "";
  dias: string;
}

/**
 * Sesión de tacto (TPA-28, modo manga en la web): un `reproduccion.tacto` por
 * hembra, cada uno con la clave de su fila (reintentar no duplica). Las
 * advertencias (gestación fuera de rango, servicio reciente…) se confirman por fila.
 */
export async function registrarTactosAction(prev: PesadaState, fd: FormData): Promise<PesadaState> {
  const ctx = await requireContexto();
  if (!ctx.can("reproduccion.crear")) return { error: "Tu rol no permite cargar tactos." };
  const est = ctx.activa.establecimiento_id;
  const fecha = fdStr(fd, "ocurrido_en");
  const metodo = fdStr(fd, "metodo");
  const fields: Record<string, string> = {};
  if (!isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha del tacto.";
  if (metodo !== "tacto" && metodo !== "ecografia") fields.metodo = "Elegí tacto o ecografía.";
  let filas: FilaTacto[] = [];
  try {
    filas = (JSON.parse(fdStr(fd, "filas") || "[]") as FilaTacto[]).filter((f) => f.animal_id).slice(0, 500);
  } catch {
    return { error: "No pudimos leer la sesión. Recargá la página." };
  }
  if (!filas.length) fields.filas = "Sumá al menos una hembra con su resultado.";
  const errores: Record<string, string> = {};
  for (const f of filas) {
    if (f.resultado !== "prenada" && f.resultado !== "vacia") errores[f.key] = "Falta el resultado (P o V).";
    else if (f.resultado === "prenada" && (!/^\d{1,3}$/.test(f.dias) || Number(f.dias) < 1 || Number(f.dias) > 340)) errores[f.key] = "Días de gestación entre 1 y 340.";
  }
  if (Object.keys(fields).length) return { fields, errores, error: Object.values(fields)[0] };
  if (Object.keys(errores).length) return { errores, error: "Revisá las filas marcadas." };

  const confirmadas = new Set(fd.getAll("confirmar_key").map(String));
  const veterinario = fdStr(fd, "veterinario").slice(0, 120);
  const guardadas: string[] = [];
  const avisos: Record<string, string[]> = {};
  for (const f of filas) {
    try {
      await postEvento(est, {
        id: f.key,
        tipo: "reproduccion.tacto",
        sujetos: { tipo: "animales", animal_ids: [f.animal_id] },
        payload: { metodo, resultado: f.resultado, ...(f.resultado === "prenada" ? { dias_gestacion: Number(f.dias) } : {}), ...(veterinario ? { veterinario } : {}) },
        ocurrido_en: fecha,
        confirmar_advertencias: confirmadas.has(f.key),
      });
      guardadas.push(f.key);
    } catch (e) {
      if (e instanceof ApiError && e.code === "requiere_confirmacion") avisos[f.key] = e.advertencias?.length ? e.advertencias : [e.message];
      else errores[f.key] = estadoDeError(e, {}, "No se pudo guardar.").error ?? "No se pudo guardar.";
    }
  }
  if (guardadas.length) revalidatePath("/reproduccion", "layout");
  return {
    guardadas,
    avisos,
    errores,
    total: (prev.total ?? 0) + guardadas.length,
    ts: Date.now(),
    error: Object.keys(errores).length ? "Algunas filas no se guardaron: revisalas." : undefined,
  };
}
