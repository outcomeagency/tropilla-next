"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { decimal, estadoDeError, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

export type SimEntradasForm = {
  especie: "BOV" | "BUB";
  cabezas: string;
  pesoProm: string;
  desbaste: string;
  precioPie: string;
  rendimiento: string;
  precioGancho: string;
  iva: string;
  flete: string;
  arranque: string;
  seguro: string;
  comision: string;
};

export type SimResultado = S<"SimulacionResultado">;

const d = (s: string) => {
  const v = decimal(s);
  return v === null || v === undefined ? undefined : v;
};

/** Arma `SimulacionEntradas`: el peso bruto es el del lote (cabezas × promedio). */
function entradas(f: SimEntradasForm): S<"SimulacionEntradas"> {
  const cab = Number(f.cabezas) || 0;
  const prom = Number(decimal(f.pesoProm) ?? 0);
  const bruto = cab > 0 && prom > 0 ? String(Math.round(cab * prom * 100) / 100) : undefined;
  const limpio = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
  return limpio({
    especie: f.especie,
    cantidad: cab || undefined,
    en_pie: d(f.precioPie) ? limpio({ peso_bruto_kg: bruto, desbaste_pct: d(f.desbaste), precio_kg: d(f.precioPie) }) : undefined,
    al_gancho: d(f.precioGancho) ? limpio({ peso_bruto_kg: bruto, rendimiento_pct: d(f.rendimiento), precio_kg: d(f.precioGancho) }) : undefined,
    iva_pct: d(f.iva),
    flete: d(f.flete),
    arranque: d(f.arranque),
    seguro: d(f.seguro),
    comision_pct: d(f.comision),
    moneda: "ARS",
  });
}

/** Calcula en pie vs al gancho con la fórmula de la API (TPA-45). No guarda nada. */
export async function calcularSimulacionAction(f: SimEntradasForm): Promise<{ resultado?: SimResultado; error?: string; fields?: Record<string, string> }> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: "Tu rol no permite ver precios." };
  try {
    const r = await api<One<SimResultado>>(`/establecimientos/${ctx.activa.establecimiento_id}/simulaciones/calcular`, { method: "POST", body: { entradas: entradas(f) } });
    return { resultado: r.data };
  } catch (e) {
    const st = estadoDeError(e, {}, "No pudimos calcular.");
    return { error: st.error, fields: st.fields };
  }
}

export async function guardarSimulacionAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: "Tu rol no permite ver precios." };
  let f: SimEntradasForm;
  try {
    f = JSON.parse(String(fd.get("entradas") ?? "{}"));
  } catch {
    return { error: "No pudimos leer la simulación." };
  }
  const nombre = String(fd.get("nombre") ?? "").trim().slice(0, 120) || null;
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/simulaciones`, { method: "POST", body: { nombre, entradas: entradas(f) } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar la simulación.");
  }
  revalidatePath("/comercializacion/simulador");
  return { ok: { mensaje: "Simulación guardada." } };
}
