import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Button, Card, CardHeader, EmptyState, FilterTabs, MockNotice, PageHeader, SpeciesChip, Table, Td, Th, Tr } from "@/components/ui";
import { IconChevronRight, IconMessage, IconPlus, IconTag } from "@/components/icons";
import { EstadoOfertaBadge } from "@/components/panel/ofertas/estado";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { requireContexto } from "@/lib/establecimiento";
import { listOfertas } from "@/lib/data/ofertas";
import { categoriaNombre } from "@/lib/catalogo";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Comercialización" };

const ESTADOS = [
  { v: "", l: "Todas" },
  { v: "publicada", l: "Publicadas" },
  { v: "borrador", l: "Borradores" },
  { v: "reservada", l: "Reservadas" },
  { v: "vendida", l: "Vendidas" },
];

const fmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

async function Ofertas({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const ctx = await requireContexto();
  const { estado = "" } = await searchParams;
  const todas = await listOfertas(ctx.activa.establecimiento_id);
  const lista = todas.data.filter((o) => !estado || o.estado === estado);
  const puede = ctx.can("ofertas.gestionar");
  // Las consultas pueden traer precios: el encargado no las ve (Claude Design, duda 21).
  const verConsultas = ctx.can("consultas.ver");

  return (
    <Card>
      <CardHeader
        title="Ofertas"
        description="Lotes publicados en el portal, con enlace, QR y PDF para compartir."
        action={
          <FilterTabs
            label="Filtrar por estado"
            items={ESTADOS.map((e) => ({
              href: e.v ? `/comercializacion?estado=${e.v}` : "/comercializacion",
              label: e.l,
              count: todas.data.filter((o) => !e.v || o.estado === e.v).length,
              active: estado === e.v,
            }))}
          />
        }
      />
      {todas.source === "mock" && (
        <div className="border-b border-border px-5 py-2.5">
          <MockNotice what="las ofertas" />
        </div>
      )}
      {lista.length ? (
        <Table minWidth={820}>
          <thead>
            <tr>
              <Th>Oferta</Th>
              <Th>Especie</Th>
              <Th numeric>Cabezas</Th>
              <Th>Estado</Th>
              {verConsultas && <Th numeric>Consultas</Th>}
              <Th>Publicada</Th>
              <Th>
                <span className="sr-only">Abrir</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <Link href={`/comercializacion/ofertas/${o.id}`} className="font-semibold text-ink hover:text-campo hover:underline">
                    {String(o.textos?.titulo ?? categoriaNombre(o.categorias?.[0] ?? ""))}
                  </Link>
                  <span className="block text-[12.5px] text-muted">{o.codigo_publico ? `Código ${o.codigo_publico}` : "Sin publicar"}</span>
                </Td>
                <Td>
                  <SpeciesChip especie={especieDe(o.especie)} />
                </Td>
                <Td numeric>{o.cantidad}</Td>
                <Td>
                  <EstadoOfertaBadge estado={o.estado} />
                </Td>
                {verConsultas && (
                  <Td numeric>
                    <span className="inline-flex items-center gap-1">
                      {!!o.consultas_count && <IconMessage size={15} className="text-muted" />}
                      {o.consultas_count ?? 0}
                    </span>
                  </Td>
                )}
                <Td className="whitespace-nowrap text-muted">{o.publicada_en ? fmt.format(new Date(o.publicada_en)) : "—"}</Td>
                <Td className="w-10 text-right">
                  <Link
                    href={`/comercializacion/ofertas/${o.id}`}
                    aria-label="Abrir oferta"
                    className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-control)] text-subtle hover:bg-surface-2 hover:text-ink"
                  >
                    <IconChevronRight size={18} />
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<IconTag size={24} />}
          title={estado ? "No hay ofertas en este estado" : "Todavía no publicaste ninguna oferta"}
          description="Elegí un lote y TROPILLA precarga especie, categoría, cantidad, peso con su fecha y sanidad. Vos decidís qué se muestra; los datos privados nunca se publican."
          action={
            puede ? (
              <Button href="/comercializacion/ofertas/nueva" icon={<IconPlus size={18} />}>
                Publicar una oferta
              </Button>
            ) : undefined
          }
        />
      )}
    </Card>
  );
}

/** Comercialización → Ofertas (TPA-48, flujo 11 desde el panel). */
export default function ComercializacionPage(props: { searchParams: Promise<{ estado?: string }> }) {
  return (
    <>
      <PageHeader
        title="Comercialización"
        subtitle="Ofertas publicadas y contratos a futuro de tus lotes."
        actions={
          <Button href="/comercializacion/ofertas/nueva" icon={<IconPlus size={18} />}>
            Publicar oferta
          </Button>
        }
      />
      <ComercialTabs actual="ofertas" />
      <Suspense fallback={<div className="h-[320px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Ofertas searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
