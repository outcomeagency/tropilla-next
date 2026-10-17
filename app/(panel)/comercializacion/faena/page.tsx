import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, FilterTabs, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconChevronRight, IconLock, IconPlus, IconScale } from "@/components/icons";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { requireContexto } from "@/lib/establecimiento";
import { listResultadosFaena } from "@/lib/data/faena";
import { fecha } from "@/lib/format";
import { kg, ORIGEN } from "@/lib/faena";

export const metadata: Metadata = { title: "Resultados de faena" };

const FILTROS = [
  { v: "vigente", l: "Vigentes" },
  { v: "anulado", l: "Anulados" },
] as const;

async function Contenido({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const [ctx, sp] = await Promise.all([requireContexto(), searchParams]);
  if (!ctx.can("comercial.precios")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Precios privados" description="Los romaneos y liquidaciones son visibles sólo para el dueño y la administración." />
      </Card>
    );
  }
  const estado = sp.estado === "anulado" ? "anulado" : "vigente";
  const r = await listResultadosFaena(ctx.activa.establecimiento_id, estado);
  if (r.estado !== "ok") {
    return (
      <Card>
        <EmptyState
          icon={<IconScale size={24} />}
          title="No pudimos traer los resultados de faena"
          description={r.estado === "error" ? r.mensaje : "La API de este entorno todavía no publica el resultado de faena."}
        />
      </Card>
    );
  }
  const lista = r.data;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Romaneos y resultados de faena"
        description="Lo que informó el frigorífico por tropa, conciliado con la venta."
        action={
          <FilterTabs
            label="Filtrar por estado"
            items={FILTROS.map((f) => ({ href: f.v === "vigente" ? "/comercializacion/faena" : `/comercializacion/faena?estado=${f.v}`, label: f.l, active: estado === f.v }))}
          />
        }
      />
      {lista.length ? (
        <Table minWidth={900}>
          <thead>
            <tr>
              <Th>Faena</Th>
              <Th>Frigorífico</Th>
              <Th>Tropa · romaneo</Th>
              <Th numeric>Reses</Th>
              <Th numeric>Kg de reses</Th>
              <Th>Asociadas a animales</Th>
              <Th>Venta</Th>
              <Th>
                <span className="sr-only">Abrir</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((x) => {
              const t = x.oficial.totales;
              return (
                <Tr key={x.id}>
                  <Td className="whitespace-nowrap">
                    <Link href={`/comercializacion/faena/${x.id}`} className="font-semibold text-ink hover:text-campo hover:underline">
                      {fecha(x.oficial.fecha_faena)}
                    </Link>
                    <span className="block text-[12.5px] text-muted">{ORIGEN[x.origen] ?? x.origen}</span>
                  </Td>
                  <Td>{x.oficial.frigorifico}</Td>
                  <Td className="tabular-nums">
                    {x.oficial.tropa_numero ? `Tropa ${x.oficial.tropa_numero}` : "Sin tropa"}
                    {x.oficial.romaneo_numero && <span className="block text-[12.5px] text-muted">Romaneo {x.oficial.romaneo_numero}</span>}
                  </Td>
                  <Td numeric>{t?.reses ?? 0}</Td>
                  <Td numeric>{kg(t?.kg)}</Td>
                  <Td className="tabular-nums">
                    {t?.asociadas ?? 0} de {t?.reses ?? 0}
                  </Td>
                  <Td>{x.operacion_id ? <Badge tone="success">Vinculada</Badge> : <Badge tone="warning">Sin vincular</Badge>}</Td>
                  <Td className="w-10 text-right">
                    <Link
                      href={`/comercializacion/faena/${x.id}`}
                      aria-label="Abrir resultado de faena"
                      className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-control)] text-subtle hover:bg-surface-2 hover:text-ink"
                    >
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
          icon={<IconScale size={24} />}
          title={estado === "anulado" ? "No hay resultados anulados" : "Todavía no cargaste ningún romaneo"}
          description="Cuando el frigorífico te mande el resultado de faena, cargalo acá (a mano o con su planilla) para ver qué animales llegaron, cuánto rindieron y si la liquidación cierra con lo pactado."
          action={
            estado === "vigente" ? (
              <Button href="/comercializacion/faena/nuevo" icon={<IconPlus size={18} />}>
                Cargar resultado de faena
              </Button>
            ) : undefined
          }
        />
      )}
    </Card>
  );
}

/** Comercialización → Faena (TPA-67): romaneos por tropa y conciliación con la venta. */
export default function FaenaPage(props: { searchParams: Promise<{ estado?: string }> }) {
  return (
    <>
      <PageHeader
        title="Faena"
        subtitle="Resultado de faena del frigorífico y conciliación con lo que vendiste."
        actions={
          <Button href="/comercializacion/faena/nuevo" icon={<IconPlus size={18} />}>
            Cargar resultado
          </Button>
        }
      />
      <ComercialTabs actual="faena" />
      <Suspense fallback={<div className="h-[320px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
