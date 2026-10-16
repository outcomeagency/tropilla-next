"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { getCatalogos } from "./data/catalogos";
import { decimal, estadoDeError, fdStr, isFecha, postEvento } from "./eventos-api";
import { calcularTuberculina, type TipoPrueba } from "./tuberculina";
import type { PesadaState } from "./pesaje-actions";

export interface FilaTuberculina {
  key: string;
  animal_id: string;
  mm0: string;
  mm72: string;
}

/**
 * Sesión de tuberculina (TPA-34): un `sanidad.prueba_diagnostica` por animal con las
 * lecturas a 0 h y 72 h y el resultado calculado con los umbrales del catálogo (se
 * recalcula acá: el navegador sólo muestra). Un positivo marca reactor en la API;
 * por eso hay que confirmarlos explícitamente.
 */
export async function registrarTuberculinasAction(prev: PesadaState, fd: FormData): Promise<PesadaState> {
  const ctx = await requireContexto();
  if (!ctx.can("sanidad.crear")) return { error: "Tu rol no permite cargar pruebas." };
  const est = ctx.activa.establecimiento_id;
  const fecha = fdStr(fd, "ocurrido_en");
  const fields: Record<string, string> = {};
  if (!isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha de la lectura.";
  const cat = await getCatalogos();
  const prueba = (cat.tiposPrueba as Array<Record<string, unknown>>).find((t) => t.codigo === fdStr(fd, "prueba"));
  const tipo: TipoPrueba | undefined = prueba
    ? { codigo: String(prueba.codigo), nombre: String(prueba.nombre), metodo: String(prueba.metodo_calculo), umbrales: (prueba.umbrales as TipoPrueba["umbrales"]) ?? null, version: Number(prueba.version ?? 1), validadoPorVet: !!prueba.validado_por_vet }
    : undefined;
  if (!tipo || tipo.metodo !== "diferencia_mm") fields.prueba = "Elegí la prueba (anocaudal o cervical simple).";
  let filas: FilaTuberculina[] = [];
  try {
    filas = (JSON.parse(fdStr(fd, "filas") || "[]") as FilaTuberculina[]).filter((f) => f.animal_id).slice(0, 500);
  } catch {
    return { error: "No pudimos leer la sesión. Recargá la página." };
  }
  if (!filas.length) fields.filas = "Sumá al menos un animal con sus dos lecturas.";
  if (Object.keys(fields).length) return { fields, error: Object.values(fields)[0] };

  const errores: Record<string, string> = {};
  const calculos = new Map(filas.map((f) => [f.key, calcularTuberculina(tipo, f.mm0, f.mm72)]));
  for (const f of filas) if (!calculos.get(f.key)) errores[f.key] = "Faltan las lecturas en mm (0 h y 72 h).";
  if (Object.keys(errores).length) return { errores, error: "Revisá las filas marcadas." };
  const positivos = filas.filter((f) => calculos.get(f.key)?.resultado === "positivo");
  if (positivos.length && fd.get("confirmo_positivos") !== "on") {
    return { fields: { confirmo_positivos: "Confirmá los positivos" }, error: `Hay ${positivos.length} ${positivos.length === 1 ? "positivo" : "positivos"}: confirmá que pasan a reactores antes de guardar.` };
  }

  const confirmadas = new Set(fd.getAll("confirmar_key").map(String));
  const veterinario = fdStr(fd, "veterinario").slice(0, 200);
  const protocolo = fdStr(fd, "protocolo_numero").slice(0, 200);
  const guardadas: string[] = [];
  const avisos: Record<string, string[]> = {};
  for (const f of filas) {
    const c = calculos.get(f.key)!;
    try {
      await postEvento(est, {
        id: f.key,
        tipo: "sanidad.prueba_diagnostica",
        sujetos: { tipo: "animales", animal_ids: [f.animal_id] },
        payload: {
          prueba: tipo!.codigo,
          resultado: c.resultado,
          resultado_origen: "calculado",
          lectura_0h_mm: decimal(f.mm0) ?? undefined,
          lectura_72h_mm: decimal(f.mm72) ?? undefined,
          umbrales_version: tipo!.version,
          ...(protocolo ? { protocolo_numero: protocolo } : {}),
        },
        ocurrido_en: fecha,
        responsable: veterinario || null,
        // El tilde «Confirmo los positivos» ya es la confirmación explícita que pide la API para marcar reactor.
        confirmar_advertencias: confirmadas.has(f.key) || (c.resultado === "positivo" && fd.get("confirmo_positivos") === "on"),
      });
      guardadas.push(f.key);
    } catch (e) {
      if (e instanceof ApiError && e.code === "requiere_confirmacion") avisos[f.key] = e.advertencias?.length ? e.advertencias : [e.message];
      else errores[f.key] = estadoDeError(e, {}, "No se pudo guardar.").error ?? "No se pudo guardar.";
    }
  }
  if (guardadas.length) revalidatePath("/sanidad", "layout");
  return {
    guardadas,
    avisos,
    errores,
    total: (prev.total ?? 0) + guardadas.length,
    ts: Date.now(),
    error: Object.keys(errores).length ? "Algunas filas no se guardaron: revisalas." : undefined,
  };
}
