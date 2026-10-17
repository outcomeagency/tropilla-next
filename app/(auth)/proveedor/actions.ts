"use server";

import { redirect } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { One, S } from "@/lib/schemas";

export async function guardarProveedorAction(formData: FormData) {
  const rubros = formData.getAll("rubros").map(String);
  const provincias = formData.getAll("provincias").map(String);
  const idiomas = formData.getAll("idiomas").map(String);
  const slug = String(formData.get("slug") ?? "");
  const cuit = String(formData.get("cuit") ?? "").trim();
  if (!(await getSesionOpcional())) redirect("/ingresar?next=%2Fproveedor");
  try {
    await api<One<S<"ProveedorPerfil">>>("/me/proveedor", {
      method: "PUT",
      body: {
        slug,
        nombre_publico: String(formData.get("nombre_publico") ?? "").trim(),
        razon_social_declarada: String(formData.get("razon_social_declarada") ?? "").trim(),
        ...(cuit ? { cuit } : {}),
        rubros,
        provincias,
        idiomas,
        descripciones: {
          es: String(formData.get("descripcion_es") ?? "").trim(),
          en: String(formData.get("descripcion_en") ?? "").trim(),
          pt: String(formData.get("descripcion_pt") ?? "").trim(),
        },
        publico: formData.get("publico") === "on",
      },
    });
  } catch (error) {
    const status = error instanceof ApiError && error.status === 403 ? "email" : "error";
    redirect(`/proveedor?estado=${status}`);
  }
  redirect("/proveedor?estado=guardado");
}
