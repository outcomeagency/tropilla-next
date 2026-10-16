import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { TactoManga } from "@/components/panel/reproduccion/tacto-manga";
import { requireContexto } from "@/lib/establecimiento";
import { getCatalogos } from "@/lib/data/catalogos";
import { gestacionesDe } from "@/lib/gestacion";
import { hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Sesión de tacto" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("reproduccion.crear")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite cargar tactos" description="Podés ver el estado de los vientres y el calendario de partos en Reproducción." />
      </Card>
    );
  }
  const cat = await getCatalogos();
  await connection();
  return <TactoManga hoy={hoyAR(new Date())} gestaciones={gestacionesDe(cat.parametros)} />;
}

/** Tacto en la manga desde la web (TPA-28). */
export default function TactoPage() {
  return (
    <>
      <Link href="/reproduccion" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Reproducción
      </Link>
      <PageHeader title="Sesión de tacto" subtitle="Para cargar un rodeo entero de corrido: la fecha probable de parto sale de la gestación de cada especie y raza (Murrah 303 días, Mediterránea 313, Jafarabadi 330, bovino 283)." />
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
