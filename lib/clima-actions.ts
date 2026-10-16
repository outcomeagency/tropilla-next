"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";

const CODIGO = /^[a-z0-9_]{1,40}$/;

/** Activa o desactiva una regla climática para el establecimiento activo (TPA-70). Solo dueño/admin. */
export async function alternarReglaClimaAction(fd: FormData): Promise<void> {
  const ctx = await requireContexto();
  const codigo = String(fd.get("codigo") ?? "");
  const activa = fd.get("activa") === "1";
  if (!ctx.can("establecimiento.editar") || !CODIGO.test(codigo)) redirect("/clima?error=permiso");

  let error = "";
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/clima/reglas/${codigo}`, { method: "PUT", body: { activa }, timeoutMs: 25_000 });
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    error = e.unreachable ? "conexion" : "api";
  }
  revalidatePath("/clima");
  revalidatePath("/inicio");
  redirect(error ? `/clima?error=${error}` : `/clima?ok=${activa ? "activada" : "desactivada"}`);
}
