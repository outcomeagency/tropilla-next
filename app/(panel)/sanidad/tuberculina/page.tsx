import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { TuberculinaManga } from "@/components/panel/sanidad/tuberculina-manga";
import { requireContexto } from "@/lib/establecimiento";
import { getCatalogos } from "@/lib/data/catalogos";
import { tiposPrueba } from "@/lib/data/pruebas";
import { hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Lectura de tuberculina" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("sanidad.crear")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite cargar pruebas" description="Podés ver los resultados en la ficha de cada animal y los reactores en Sanidad." />
      </Card>
    );
  }
  const cat = await getCatalogos();
  await connection();
  return <TuberculinaManga hoy={hoyAR(new Date())} pruebas={tiposPrueba(cat).filter((p) => p.metodo === "diferencia_mm")} />;
}

/** Tuberculina anocaudal o cervical simple con resultado calculado (TPA-34). */
export default function TuberculinaPage() {
  return (
    <>
      <Link href="/sanidad" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Sanidad
      </Link>
      <PageHeader title="Lectura de tuberculina" subtitle="Cargá el espesor del pliegue a las 0 y a las 72 horas: el resultado sale de los umbrales del catálogo. Los positivos quedan como reactores, siempre privados." />
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
