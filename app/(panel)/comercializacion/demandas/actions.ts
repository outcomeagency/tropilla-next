"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { getContexto } from "@/lib/establecimiento";
import type { One, S } from "@/lib/schemas";

export async function responderDemandaAction(fd: FormData) {
  const ctx = await getContexto();
  if (!ctx || !ctx.can("busco.responder")) throw new Error("Tu rol no puede responder demandas.");
  await api<One<S<"BuscoRespuesta">>>(`/establecimientos/${ctx.activa.establecimiento_id}/demandas/${String(fd.get("busco_id"))}/respuestas`, {
    method: "POST",
    body: { mensaje: String(fd.get("mensaje")) } satisfies S<"BuscoRespuestaInput">,
  });
  revalidatePath("/comercializacion/demandas");
}
