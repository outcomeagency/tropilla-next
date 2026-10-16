import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { EditarEstablecimientoForm } from "@/components/panel/establecimiento/editar-form";
import { requireContexto } from "@/lib/establecimiento";
import { getEstablecimiento, getProductor } from "@/lib/data/establecimientos";
import { getCatalogos } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Editar establecimiento" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("establecimiento.editar")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite editar el establecimiento" description="Los datos los editan el dueño y la administración. Si ves algo mal, avisales." />
      </Card>
    );
  }
  const [e, cat] = await Promise.all([getEstablecimiento(ctx.activa.establecimiento_id), getCatalogos()]);
  const privados = ctx.can("establecimiento.ver_privados");
  const p = privados && e.productor_id ? await getProductor(e.productor_id).catch(() => null) : null;
  const contacto = (p?.contacto ?? {}) as Record<string, string | null | undefined>;
  const z = e.zonas_sanitarias ?? {};

  return (
    <EditarEstablecimientoForm
      privados={privados}
      provincias={cat.provincias}
      departamentos={cat.departamentos}
      actividades={cat.items.actividades ?? []}
      instalaciones={cat.items.instalaciones ?? []}
      e={{
        nombre: e.nombre,
        provincia_codigo: e.provincia_codigo ?? "18",
        departamento_codigo: e.departamento_codigo ?? "",
        localidad: e.localidad ?? "",
        superficie_ha: e.superficie_ha ?? "",
        renspa: e.renspa ?? "",
        especies: e.especies ?? [],
        actividades: e.actividades ?? [],
        instalaciones: e.instalaciones ?? [],
        historia: e.historia ?? "",
        ficha_ampliada: e.ficha_ampliada ?? {},
        visibilidad_ficha: e.visibilidad_ficha ?? {},
        aftosa_zona: z.aftosa_zona ?? "",
        garrapata: z.garrapata ?? "",
        rabia_endemica: !!z.rabia_endemica,
        fasciola_endemica: !!z.fasciola_endemica,
        lat: e.ubicacion?.lat ?? "",
        lon: e.ubicacion?.lon ?? "",
        row_version: String(e.row_version ?? ""),
      }}
      productor={
        p?.id
          ? {
              id: p.id,
              tipo: p.tipo ?? "persona_humana",
              nombre: p.nombre ?? "",
              cuit: p.cuit ?? "",
              email: contacto.email ?? "",
              telefono: contacto.telefono ?? "",
              whatsapp: contacto.whatsapp ?? "",
              row_version: String(p.row_version ?? ""),
            }
          : null
      }
    />
  );
}

/** Editar datos, zonas sanitarias, ubicación e historia (TPA-13). */
export default function EditarEstablecimientoPage() {
  return (
    <>
      <Link href="/establecimiento" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Mi establecimiento
      </Link>
      <PageHeader title="Editar establecimiento" subtitle="Lo marcado con candado es privado siempre: nunca se publica." />
      <Suspense fallback={<div className="h-[720px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
