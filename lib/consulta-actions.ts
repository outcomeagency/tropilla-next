"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError } from "./eventos-api";

const ESTADOS = ["nueva", "respondida", "cerrada", "spam"] as const;
const CANALES = ["whatsapp", "email", "telefono", "otro"] as const;

/**
 * Cambiar el estado de una consulta (TPA-49). Al tocar «Responder por
 * WhatsApp/email» se marca respondida con el canal: la respuesta en sí sale
 * del teléfono o del correo del productor, no de TROPILLA.
 */
export async function estadoConsultaAction(id: string, estado: (typeof ESTADOS)[number], canal?: (typeof CANALES)[number]): Promise<{ error?: string }> {
  const ctx = await requireContexto();
  if (!ctx.can("consultas.gestionar")) return { error: "Tu rol no permite gestionar consultas." };
  if (!ESTADOS.includes(estado) || (canal && !CANALES.includes(canal)) || !/^[0-9a-f-]{36}$/i.test(id)) return { error: "Datos inválidos." };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/consultas/${id}/estado`, {
      method: "POST",
      body: { estado, ...(estado === "respondida" ? { canal_respuesta: canal ?? "otro" } : {}) },
    });
  } catch (e) {
    return { error: estadoDeError(e, {}, "No pudimos actualizar la consulta.").error };
  }
  revalidatePath("/comercializacion", "layout");
  return {};
}
