import { Suspense } from "react";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getContexto } from "@/lib/establecimiento";
import type { Many, S } from "@/lib/schemas";
import { Notice, PageHeader } from "@/components/ui";
import { OrganizacionesManager } from "@/components/panel/organizaciones/manager";

export const metadata: Metadata = { title: "Mis organizaciones" };

async function Contenido() {
  const ctx = await getContexto();
  if (!ctx) return <Notice tone="danger" title="No pudimos validar tu sesión." />;
  const productor = ctx.me.usuario.id;
  const [organizacionesResult, adhesionesResult] = await Promise.allSettled([
    api<Many<S<"Organizacion">>>("/organizaciones?limit=100"),
    api<Many<S<"Adhesion">>>(`/productores/${productor}/adhesiones`),
  ]);
  if (organizacionesResult.status === "rejected" && adhesionesResult.status === "rejected") {
    return <Notice tone="danger" title="No pudimos cargar tus organizaciones.">Probá de nuevo en unos minutos.</Notice>;
  }
  const organizaciones = organizacionesResult.status === "fulfilled" ? organizacionesResult.value.data : [];
  const adhesiones = adhesionesResult.status === "fulfilled" ? adhesionesResult.value.data : [];
  const administrables = ctx.me.usuario.es_staff
    ? organizacionesResult.status === "fulfilled" ? organizaciones.map((org) => ({ id: org.id, nombre: org.nombre, rol: "admin" as const })) : []
    : ctx.me.organizaciones?.filter((org) => org.id && org.rol === "admin") ?? [];
  const integrantes = await Promise.all(administrables.map(async (org) => {
    try {
      const result = await api<{ data: { usuario: { id: string; nombre: string; email: string }; rol: "admin" | "operador" }[] }>(`/organizaciones/${org.id}/miembros`);
      return { ...org, miembros: result.data };
    } catch { return { ...org, miembros: [] }; }
  }));
  return (
    <OrganizacionesManager
      organizaciones={organizaciones}
      adhesiones={adhesiones}
      puedeAdherir={ctx.can("organizaciones.adherir")}
      puedeGestionar={ctx.can("consentimientos.gestionar")}
      integrantes={integrantes}
      esStaff={ctx.me.usuario.es_staff ?? false}
    />
  );
}

export default function OrganizacionesPage() {
  return (
    <>
      <PageHeader title="Mis organizaciones" subtitle="Elegí qué información compartís. Podés cambiar o revocar el consentimiento cuando quieras." />
      <Suspense fallback={<div className="h-80 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
