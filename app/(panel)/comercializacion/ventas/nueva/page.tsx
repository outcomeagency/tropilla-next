import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, buttonClass } from "@/components/ui";
import { IconArrowLeft } from "@/components/icons";
import { RegistrarVenta } from "@/components/panel/registrar-venta";
import { requireContexto } from "@/lib/establecimiento";
import { getCatalogos } from "@/lib/data/catalogos";
import { ComercialTabs } from "@/components/panel/comercial-tabs";

export const metadata: Metadata = { title: "Registrar venta" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">Registrar ventas con precio está disponible para el dueño y la administración.</p>;
  const catalogos = await getCatalogos();
  const categorias = (catalogos.items.categorias ?? []).map((c) => c.codigo).filter((x): x is string => Boolean(x));
  return <RegistrarVenta categorias={categorias} />;
}

export default function NuevaVentaPage() {
  return <>
    <Link href="/comercializacion/ventas" className={buttonClass("ghost", "sm", "mb-3")}><IconArrowLeft size={16} /> Ventas</Link>
    <PageHeader title="Registrar venta" subtitle="Dejá por escrito lo acordado con el comprador y guardá el resumen del trato." />
    <ComercialTabs actual="ventas" />
    <Suspense fallback={<div className="h-[700px] rounded-[var(--radius-card)] border border-border bg-surface" />}><Contenido /></Suspense>
  </>;
}
