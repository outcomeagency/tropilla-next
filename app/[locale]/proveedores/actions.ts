"use server";

import { redirect } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { Many, One, S } from "@/lib/schemas";

export async function solicitarPresupuesto(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const locale = String(formData.get("locale") ?? "es");
  const rubro = String(formData.get("rubro") ?? "");
  const establecimientoId = String(formData.get("establecimiento_id") ?? "");
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!/^[a-z0-9-]{3,60}$/.test(slug) || !["es", "en", "pt"].includes(locale) || !establecimientoId || mensaje.length < 10 || mensaje.length > 2000) {
    redirect(`/${locale}/proveedores/${slug}?pedido=error`);
  }
  if (!(await getSesionOpcional())) redirect(`/ingresar?next=${encodeURIComponent(`/${locale}/proveedores/${slug}`)}`);
  try {
    const establecimientos = await api<Many<S<"Establecimiento">>>("/establecimientos");
    if (!establecimientos.data.some((item) => item.id === establecimientoId)) {
      throw new ApiError(403, "No tenés acceso a ese establecimiento.");
    }
    await api<One<S<"LeadProveedor">>>(`/proveedores/${encodeURIComponent(slug)}/leads`, {
      method: "POST",
      body: { establecimiento_id: establecimientoId, rubro, mensaje },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(`/ingresar?next=/${locale}/proveedores/${slug}`);
    redirect(`/${locale}/proveedores/${slug}?pedido=error`);
  }
  redirect(`/${locale}/proveedores/${slug}?pedido=enviado`);
}
