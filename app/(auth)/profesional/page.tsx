import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { One, S } from "@/lib/schemas";
import { ProfesionalEditor } from "@/components/profesional/editor";

export const metadata: Metadata = { title: "Perfil profesional" };

async function Contenido() {
  if (!(await getSesionOpcional())) redirect("/ingresar?next=%2Fprofesional");
  let perfil: S<"Profesional"> | null = null;
  try { perfil = (await api<One<S<"Profesional">>>("/me/profesional")).data; } catch { /* Perfil nuevo */ }
  return <ProfesionalEditor perfil={perfil} />;
}

export default function ProfesionalPage() {
  return <Suspense fallback={<div className="mx-auto h-[620px] max-w-[760px] rounded border border-border bg-surface" />}><Contenido /></Suspense>;
}
