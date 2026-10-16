"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

export async function guardarReferenciaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: "Tu rol no permite ver ni cargar precios." };
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  try {
    await api<One<S<"PrecioReferencia">>>(`/establecimientos/${ctx.activa.establecimiento_id}/precios-referencia`, {
      method: "POST", body: { descripcion: get("descripcion"), especie: get("especie"), categoria: get("categoria") || null,
        modalidad: get("modalidad"), precio_kg: Number(get("precio_kg").replace(",", ".")), moneda: "ARS", fecha: get("fecha"), fuente: get("fuente") || null },
    });
    revalidatePath("/comercializacion/precios");
    return { ok: { mensaje: "Referencia guardada." } };
  } catch (e) { return estadoDeError(e, {}, "No pudimos guardar la referencia."); }
}
