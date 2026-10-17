import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import Link from "next/link";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { RomaneoForm } from "@/components/panel/faena/romaneo-form";
import { requireContexto } from "@/lib/establecimiento";
import { ventasParaFaena } from "@/lib/data/faena";
import { fecha } from "@/lib/format";
import { categoriaNombre } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Cargar resultado de faena" };

async function Contenido({ searchParams }: { searchParams: Promise<{ venta?: string }> }) {
  const [ctx, sp] = await Promise.all([requireContexto(), searchParams]);
  if (!ctx.can("comercial.precios")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Precios privados" description="Cargar romaneos y liquidaciones está disponible para el dueño y la administración." />
      </Card>
    );
  }
  const ventas = await ventasParaFaena(ctx.activa.establecimiento_id);
  const opciones = ventas.map((o) => ({
    id: o.id ?? "",
    etiqueta: `${fecha(o.fecha)} · ${o.contraparte ?? "Sin comprador"} · ${o.cantidad ?? "?"} ${categoriaNombre(o.categoria ?? "").toLowerCase()}${o.modalidad === "al_gancho" ? " · al gancho" : ""}`,
  }));
  return <RomaneoForm ventas={opciones} ventaInicial={opciones.some((o) => o.id === sp.venta) ? sp.venta : undefined} />;
}

export default function NuevoResultadoFaenaPage(props: { searchParams: Promise<{ venta?: string }> }) {
  return (
    <>
      <Link href="/comercializacion/faena" className={buttonClass("ghost", "sm", "mb-3")}>
        <IconArrowLeft size={16} /> Faena
      </Link>
      <PageHeader title="Cargar resultado de faena" subtitle="Garrón, peso y clasificación de cada res, tal como los informa el frigorífico." />
      <ComercialTabs actual="faena" />
      <Suspense fallback={<div className="h-[720px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
