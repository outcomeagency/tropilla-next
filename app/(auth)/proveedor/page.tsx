import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { api, ApiError } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { Many, One, S } from "@/lib/schemas";
import { ProveedorEditor } from "@/components/proveedor/editor";

export const metadata: Metadata = { title: "Cuenta de proveedor" };

async function Contenido({ searchParams }: PageProps<"/proveedor">) {
  if (!(await getSesionOpcional())) redirect("/ingresar?next=%2Fproveedor");
  let perfil: S<"ProveedorPerfil"> | null = null;
  let error = false;
  try {
    perfil = (await api<One<S<"ProveedorPerfil">>>("/me/proveedor")).data;
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) error = true;
  }
  let rubros: S<"RubroProveedor">[] = [];
  try {
    rubros = (await api<Many<S<"RubroProveedor">>>("/public/directorio/proveedores/rubros", { auth: false })).data;
  } catch {
    error = true;
  }
  const search = await searchParams;
  const status = typeof search.estado === "string" ? search.estado : undefined;
  return <ProveedorEditor perfil={perfil} rubros={rubros} error={error} status={status} />;
}

export default function ProveedorPage(props: PageProps<"/proveedor">) {
  return <Suspense fallback={<div className="mx-auto h-[700px] max-w-[760px] rounded border border-border bg-surface" />}><Contenido {...props} /></Suspense>;
}
