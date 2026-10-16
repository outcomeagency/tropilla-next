"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { One, S } from "@/lib/schemas";

export async function guardarProfesionalAction(fd: FormData) {
  if (!(await getSesionOpcional())) throw new Error("Iniciá sesión para guardar tu perfil.");
  const idiomas = fd.getAll("idiomas").map(String).filter((v): v is "es" | "en" | "pt" => ["es", "en", "pt"].includes(v));
  const body: S<"Profesional"> = {
    slug: String(fd.get("slug")).trim().toLowerCase(),
    nombre_publico: String(fd.get("nombre_publico")).trim(),
    profesion: String(fd.get("profesion")) as S<"Profesional">["profesion"],
    matricula_declarada: String(fd.get("matricula_declarada") ?? "") || null,
    especialidades: String(fd.get("especialidades") ?? "").split(",").map((v) => v.trim()).filter(Boolean),
    zonas: { provincias: String(fd.get("provincias") ?? "").split(",").map((v) => v.trim()).filter(Boolean) },
    idiomas,
    bio: String(fd.get("bio") ?? "") || null,
    publico: fd.get("publico") === "on",
  };
  await api<One<S<"Profesional">>>("/me/profesional", { method: "PUT", body });
  revalidatePath("/profesional");
  revalidatePath(`/es/profesionales/${body.slug}`);
}
