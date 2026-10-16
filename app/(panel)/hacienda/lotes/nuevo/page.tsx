import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { NuevoLoteForm } from "@/components/panel/lotes/editor";
import { requireContexto } from "@/lib/establecimiento";
import { getEstablecimiento } from "@/lib/data/establecimientos";
import { listPotrerosConArchivados } from "@/lib/data/potreros";
import { getCatalogos } from "@/lib/data/catalogos";
import { categoriasDe } from "@/lib/data/lotes";
import { hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Nuevo lote" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) {
    return (
      <Card>
        <EmptyState
          icon={<IconLock size={24} />}
          title="Tu rol no permite crear lotes"
          description="Los lotes los arman el dueño, la administración y el encargado. Pedile a alguno de ellos que lo cree."
        />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const [potreros, cat, e] = await Promise.all([listPotrerosConArchivados(est).catch(() => []), getCatalogos(), getEstablecimiento(est).catch(() => null)]);
  await connection();
  const especies = (e?.especies?.length ? e.especies : ["BOV", "BUB"]) as Array<"BOV" | "BUB">;
  return (
    <NuevoLoteForm
      especies={especies}
      categorias={{ BOV: categoriasDe(cat, "BOV"), BUB: categoriasDe(cat, "BUB") }}
      potreros={potreros.map((p) => ({ id: p.id ?? "", nombre: p.nombre ?? "" }))}
      hoy={hoyAR(new Date())}
    />
  );
}

export default function NuevoLotePage() {
  return (
    <>
      <Link href="/hacienda/lotes" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Lotes
      </Link>
      <PageHeader title="Nuevo lote" subtitle="Una sola especie, un propósito y, si querés, el potrero y cuántas cabezas hay por categoría." />
      <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
