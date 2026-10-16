"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

export async function registrarVentaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: "Tu rol no permite registrar ventas con precio." };
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const n = (k: string) => Number(get(k).replace(",", "."));
  const modalidad = get("modalidad");
  const comprador = get("comprador");
  const destino = get("destino");
  const categoria = get("categoria");
  const errors: Record<string, string> = {};
  if (!comprador) errors.comprador = "Indicá quién compra.";
  if (!categoria) errors.categoria = "Indicá la categoría.";
  if (!(n("cantidad") > 0)) errors.cantidad = "La cantidad debe ser mayor a cero.";
  if (!(n("peso_bruto_kg") > 0)) errors.peso_bruto_kg = "Indicá los kilos brutos.";
  if (!(n("precio_kg") > 0)) errors.precio_kg = "Indicá el precio por kilo.";
  if (!get("fecha")) errors.fecha = "Indicá la fecha.";
  if (Object.keys(errors).length) return { fields: errors };
  const trato = {
    comprador, destino: destino || null, lugar_pesada: get("lugar_pesada"), hora_pesada: get("hora_pesada"),
    modalidad, desbaste_pct: n("desbaste_pct"), plazo_pago_dias: n("plazo_pago_dias"),
    tolerancias: get("tolerancias"), flete_a_cargo: get("flete_a_cargo"), comision_pct: n("comision_pct"),
    intermediario: get("intermediario") || null, dt_e: get("dt_e") || null, tropa: get("tropa") || null, renspa: get("renspa") || null,
  };
  const liquidacion = {
    peso_bruto_kg: n("peso_bruto_kg"), precio_kg: n("precio_kg"), desbaste_pct: n("desbaste_pct"),
    rendimiento_pct: n("rendimiento_pct"), iva_pct: n("iva_pct"), flete: n("flete"), arranque: n("arranque"),
    seguro: n("seguro"), comision_pct: n("comision_pct"), moneda: "ARS",
  };
  try {
    const r = await api<One<S<"Operacion">>>(`/establecimientos/${ctx.activa.establecimiento_id}/operaciones`, {
      method: "POST", body: { tipo: "venta", fecha: get("fecha"), especie: get("especie"), categoria,
        cantidad: n("cantidad"), trato, liquidacion, lote_id: get("lote_id") || undefined,
        generar_pdf: true, confirmar_advertencias: get("confirmar") === "1" },
    });
    revalidatePath("/comercializacion/ventas");
    revalidatePath("/comercializacion/precios");
    return { ok: { mensaje: `Venta registrada.${r.data.documento_id ? ` El resumen del trato quedó en Documentos (${r.data.documento_id}).` : ""}` } };
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos registrar la venta.");
  }
}
