import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { PotreroEditor } from "@/components/panel/potreros/editor";
import { requireContexto } from "@/lib/establecimiento";
import { getEstablecimiento } from "@/lib/data/establecimientos";
import { listPotrerosConArchivados, ringDe } from "@/lib/data/potreros";
import { getCatalogos } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Nuevo potrero" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite crear potreros" description="Los potreros los cargan el dueño, la administración y el encargado." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const [potreros, cat, e] = await Promise.all([listPotrerosConArchivados(est), getCatalogos(), getEstablecimiento(est).catch(() => null)]);
  return (
    <PotreroEditor
      p={null}
      otros={potreros.map((p) => ({ id: p.id ?? "", nombre: p.nombre ?? "", ring: ringDe(p) })).filter((p) => p.ring.length >= 3)}
      centro={e?.ubicacion ? { lat: Number(e.ubicacion.lat), lon: Number(e.ubicacion.lon) } : null}
      ambientes={cat.items.ambientes ?? []}
      forrajes={cat.items.recursos_forrajeros ?? []}
    />
  );
}

export default function NuevoPotreroPage() {
  return (
    <>
      <Link href="/establecimiento/potreros" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Potreros
      </Link>
      <PageHeader title="Nuevo potrero" subtitle="Nombre, ambiente y, si querés, el contorno sobre la imagen satelital." />
      <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
