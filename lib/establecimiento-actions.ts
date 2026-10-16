"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { setActiveEstablecimiento } from "./establecimiento";

/** Cambia el establecimiento activo. Sólo a uno donde el usuario tiene membresía vigente. */
export async function cambiarEstablecimientoAction(formData: FormData): Promise<void> {
  const id = String(formData.get("establecimiento_id") ?? "");
  const current = await getCurrentUser();
  if (current.status !== "ok") redirect("/inicio");
  if (current.me.membresias.some((m) => m.establecimiento_id === id)) {
    await setActiveEstablecimiento(id);
  }
  const volver = String(formData.get("volver") ?? "");
  // Las fichas de un establecimiento no existen en otro: siempre se vuelve a la raíz del módulo.
  const modulo = volver.startsWith("/") && !volver.startsWith("//") ? `/${volver.split("/")[1]}` : "/inicio";
  redirect(modulo === "/" ? "/inicio" : modulo);
}
