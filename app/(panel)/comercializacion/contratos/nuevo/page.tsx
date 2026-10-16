import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, EmptyState, MockNotice, PageHeader, SpeciesChip, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconArrowRight } from "@/components/icons";
import { CalculadoraContrato } from "@/components/panel/contratos/calculadora";
import { requireContexto } from "@/lib/establecimiento";
import { listLotes } from "@/lib/data/ofertas";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Nuevo contrato a futuro" };

async function Contenido({ searchParams }: { searchParams: Promise<{ lote?: string }> }) {
  const ctx = await requireContexto();
  if (!ctx.can("contratos.gestionar")) {
    return (
      <Card>
        <EmptyState icon={<IconAlert size={24} />} title="Tu rol no permite crear contratos" description="Los contratos a futuro los crea el dueño o un administrador." />
      </Card>
    );
  }
  const { lote: loteId } = await searchParams;
  const { data: lotes, source } = await listLotes(ctx.activa.establecimiento_id);
  const lote = lotes.find((l) => l.id === loteId);
  const mock = source === "mock" && (
    <div className="mb-4">
      <MockNotice what="los lotes" />
    </div>
  );

  if (!lote) {
    return (
      <>
        {mock}
        <p className="mb-3 text-[14px] text-muted">Elegí el lote que vas a entregar. Hereda especie, categoría y cabezas.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {lotes.map((l) => (
            <Link
              key={l.id}
              href={`/comercializacion/contratos/nuevo?lote=${l.id}`}
              className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-5 py-4 transition-colors hover:border-campo hover:bg-base"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{l.nombre}</p>
                <p className="text-[13px] tabular-nums text-muted">
                  {(l.cabezas_individuales ?? 0) + (l.cabezas_anonimas ?? 0)} cabezas
                  {l.peso_promedio_kg && ` · ${l.peso_promedio_kg} kg prom.`}
                </p>
              </div>
              <SpeciesChip especie={especieDe(l.especie)} />
              <IconArrowRight size={18} className="text-campo" />
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {mock}
      <CalculadoraContrato
        lote={{
          id: lote.id ?? "",
          nombre: lote.nombre ?? "",
          especie: lote.especie ?? "BUB",
          cabezas: (lote.cabezas_individuales ?? 0) + (lote.cabezas_anonimas ?? 0),
          peso: lote.peso_promedio_kg,
        }}
      />
      <Link href="/comercializacion/contratos/nuevo" className={buttonClass("ghost", "sm", "mt-3")}>
        <IconArrowLeft size={16} /> Elegir otro lote
      </Link>
    </>
  );
}

export default function NuevoContratoPage(props: { searchParams: Promise<{ lote?: string }> }) {
  return (
    <>
      <Link href="/comercializacion/contratos" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Contratos a futuro
      </Link>
      <PageHeader title="Tokenizar un lote" subtitle="Vendé por adelantado los kg al gancho: calculás, ajustás y lo ves como el comprador antes de publicar." />
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
