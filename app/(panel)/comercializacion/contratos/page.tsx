import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Button, Card, CardHeader, EmptyState, KpiCard, MockNotice, PageHeader, Progress, Table, Td, Th, Tr } from "@/components/ui";
import { IconCalendar, IconChart, IconChevronRight, IconLock, IconPlus, IconRoute, IconScale } from "@/components/icons";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { EstadoContratoBadge } from "@/components/panel/contratos/estado";
import { requireContexto } from "@/lib/establecimiento";
import { getApalancamiento, listContratos } from "@/lib/data/contratos";
import { ars } from "@/lib/contratos-calc";
import { fecha, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Contratos a futuro" };

async function Contenido() {
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  const { data: contratos, source } = await listContratos(est);
  const precios = ctx.can("comercial.precios");
  const ap = precios ? (await getApalancamiento(est, contratos)).data : null;

  return (
    <>
      {source === "mock" && (
        <div className="mb-4">
          <MockNotice what="los contratos" />
        </div>
      )}
      {ap ? (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="anticipos cobrados" value={ars.format(Number(ap.anticipos_cobrados ?? 0))} icon={<IconChart size={22} />} />
          <KpiCard label="anticipos por confirmar" value={ars.format(Number(ap.anticipos_pendientes ?? 0))} icon={<IconCalendar size={22} />} />
          <KpiCard label="kg al gancho comprometidos" value={nf.format(ap.kg_comprometidos ?? 0)} icon={<IconScale size={22} />} />
          <KpiCard label="contratos activos" value={String(contratos.filter((c) => !["cancelado", "liquidado"].includes(c.estado ?? "")).length)} icon={<IconRoute size={22} />} />
        </div>
      ) : (
        <p className="mb-4 flex items-center gap-1.5 text-[13px] text-muted">
          <IconLock size={14} /> Los montos los ven el dueño y los administradores.
        </p>
      )}
      <Card>
        <CardHeader title="Mi apalancamiento" description="Kg futuros de tus lotes, tomados por compradores con anticipo." />
        {contratos.length ? (
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Contrato</Th>
                <Th>Estado</Th>
                <Th>Tomado</Th>
                <Th numeric>Tokens libres</Th>
                <Th>Entrega</Th>
                <Th>
                  <span className="sr-only">Abrir</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const total = c.terminos?.tokens_totales ?? 0;
                const pct = total ? Math.round(((c.tokens_comprometidos ?? 0) / total) * 100) : 0;
                return (
                  <Tr key={c.id}>
                    <Td>
                      <Link href={`/comercializacion/contratos/${c.id}`} className="font-semibold text-ink hover:text-campo hover:underline">
                        {c.lote?.nombre}
                      </Link>
                      <span className="block text-[12.5px] text-muted">
                        {c.codigo_publico ? `Código ${c.codigo_publico} · ` : ""}
                        {nf.format(c.terminos?.kg_gancho_totales ?? 0)} kg al gancho · v{c.version}
                      </span>
                    </Td>
                    <Td>
                      <EstadoContratoBadge estado={c.estado} />
                    </Td>
                    <Td className="w-[200px]">
                      <span className="mb-1 block text-[12.5px] tabular-nums text-muted">
                        {c.tokens_comprometidos ?? 0} de {total} tokens · {pct} %
                      </span>
                      <Progress value={pct} label="Porcentaje tomado" />
                    </Td>
                    <Td numeric>{c.tokens_libres ?? 0}</Td>
                    <Td className="whitespace-nowrap text-muted">{fecha(c.terminos?.fecha_entrega)}</Td>
                    <Td className="w-10 text-right">
                      <Link href={`/comercializacion/contratos/${c.id}`} aria-label="Abrir contrato" className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-control)] text-subtle hover:bg-surface-2 hover:text-ink">
                        <IconChevronRight size={18} />
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<IconRoute size={24} />}
            title="Todavía no tokenizaste ningún lote"
            description="Vendé por adelantado los kg al gancho de un lote en recría: el comprador paga un anticipo y vos financiás la terminación. Fijás el descuento, el anticipo y la fecha de entrega."
            action={ctx.can("contratos.gestionar") ? <Button href="/comercializacion/contratos/nuevo" icon={<IconPlus size={18} />}>Crear contrato a futuro</Button> : undefined}
          />
        )}
      </Card>
    </>
  );
}

/** Contratos a futuro con token (TPA-56, flujo 20 productor). */
export default function ContratosPage() {
  return (
    <>
      <PageHeader
        title="Comercialización"
        subtitle="Ofertas publicadas y contratos a futuro de tus lotes."
        actions={
          <Button href="/comercializacion/contratos/nuevo" icon={<IconPlus size={18} />}>
            Contrato a futuro
          </Button>
        }
      />
      <ComercialTabs actual="contratos" />
      <Suspense fallback={<div className="h-[380px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
