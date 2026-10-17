"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { getToken } from "./session";
import type { One, S } from "./schemas";

export interface CodigoState {
  error?: string;
  codigo?: S<"TelegramCodigo">;
}

/** Código de vinculación de un solo uso (TPA-77): solo se muestra acá, la API guarda el hash. */
export async function generarCodigoTelegramAction(): Promise<CodigoState> {
  if (!(await getToken())) redirect("/ingresar");
  try {
    const res = await api<One<S<"TelegramCodigo">>>("/me/telegram/codigo", { method: "POST" });
    return { codigo: res.data };
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) return { error: "El bot de Telegram no está disponible en este momento." };
    if (e instanceof ApiError && e.status === 429) return { error: "Generaste varios códigos seguidos. Esperá un minuto." };
    return { error: "No pudimos generar el código. Probá de nuevo." };
  }
}

export async function avisosTelegramAction(fd: FormData): Promise<void> {
  if (!(await getToken())) redirect("/ingresar");
  const avisos = fd.get("avisos") === "1";
  try {
    await api("/me/telegram", { method: "PATCH", body: { avisos } satisfies S<"TelegramVinculoInput"> });
  } catch {
    redirect("/configuracion/telegram?error=avisos");
  }
  revalidatePath("/configuracion/telegram");
  redirect(`/configuracion/telegram?ok=${avisos ? "avisos-on" : "avisos-off"}`);
}

export async function desvincularTelegramAction(): Promise<void> {
  if (!(await getToken())) redirect("/ingresar");
  try {
    await api("/me/telegram", { method: "DELETE" });
  } catch {
    redirect("/configuracion/telegram?error=desvincular");
  }
  revalidatePath("/configuracion/telegram");
  redirect("/configuracion/telegram?ok=desvinculado");
}
