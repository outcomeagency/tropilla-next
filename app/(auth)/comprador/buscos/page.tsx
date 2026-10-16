import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompradorShell } from "@/components/comprador/shell";
import { getSesionOpcional } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";
import { BuscosManager } from "@/components/comprador/buscos-manager";

export const metadata: Metadata = { title: "Mis Busco" };

async function Contenido() {
  const me = await getSesionOpcional();
  if (!me) redirect("/ingresar?next=%2Fcomprador%2Fbuscos");
  let perfil: S<"Comprador"> | null = null;
  let buscos: S<"Busco">[] = [];
  try { perfil = (await api<One<S<"Comprador">>>("/me/comprador")).data; } catch { /* Estado visible abajo */ }
  try { buscos = (await api<Many<S<"Busco">>>("/comprador/buscos?limit=100")).data; } catch { /* Estado visible abajo */ }
  return <BuscosManager buscos={buscos} perfilCompleto={Boolean(perfil)} emailVerificado={me.usuario.email_verificado === true} />;
}

export default function BuscosPage() {
  return <CompradorShell><Suspense fallback={<div className="h-96 rounded border border-border bg-surface" />}><Contenido /></Suspense></CompradorShell>;
}
