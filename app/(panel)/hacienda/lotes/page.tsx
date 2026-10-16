import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Button, Card, EmptyState, FilterTabs, KpiCard, Notice, PageHeader, SpeciesChip, Table, Td, Th, Tr } from "@/components/ui";
import { IconChevronRight, IconCow, IconHash, IconList, IconPlus, IconScale, IconTag } from "@/components/icons";
import { HaciendaTabs } from "@/components/panel/hacienda/tabs";
import { requireContexto } from "@/lib/establecimiento";
import { listLotes, type Lote } from "@/lib/data/potreros";
import { getCatalogos } from "@/lib/data/catalogos";
import { propositoNombre } from "@/lib/lotes";
import { fecha, nf } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Lotes" };

type SP = { tipo?: string; especie?: string; archivados?: string; ok?: string };

const OK: Record<string, string> = { archivado: "Lote archivado. Su historia sigue disponible." };

function href(sp: SP, cambios: Partial<SP>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ok: undefined, ...cambios })) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/hacienda/lotes?${s}` : "/hacienda/lotes";
}

const cabezas = (l: Lote) => (l.cabezas_individuales ?? 0) + (l.cabezas_anonimas ?? 0);

/** Tipo de lote según cómo se lleva la hacienda (los identificados de un lote por cantidades se ven en la composición). */
function TipoLote({ l }: { l: Lote }) {
  if (l.anonimo)
    return (
      <Badge tone="neutral" icon={<IconHash size={14} />}>
        Por cantidades
      </Badge>
    );
  return (
    <Badge tone="success" icon={<IconTag size={14} />}>
      Identificados
    </Badge>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  const est = ctx.activa.establecimiento_id;
  const verArchivados = sp.archivados === "1";
  const especie = sp.especie === "BOV" || sp.especie === "BUB" ? sp.especie : undefined;
  const [todos, cat] = await Promise.all([listLotes(est, { especie, archivados: verArchivados }), getCatalogos()]);
  const catNombre = new Map(cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo]));
  const catOrden = new Map(cat.categorias.map((c) => [c.codigo, Number((c as { orden?: number }).orden ?? 99)]));

  const activos = todos.filter((l) => !l.archivado_en);
  const anonimas = activos.reduce((s, l) => s + (l.cabezas_anonimas ?? 0), 0);
  const individuales = activos.reduce((s, l) => s + (l.cabezas_individuales ?? 0), 0);
  const sinPotrero = activos.filter((l) => !l.potrero && cabezas(l) > 0).length;

  const lotes = todos
    .filter((l) => (sp.tipo === "anonimos" ? l.anonimo : sp.tipo === "identificados" ? !l.anonimo : true))
    .sort((a, b) => Number(!!a.archivado_en) - Number(!!b.archivado_en) || cabezas(b) - cabezas(a));
  const filtrado = !!(sp.tipo || especie);

  return (
    <>
      {sp.ok && OK[sp.ok] && (
        <div className="mb-4">
          <Notice tone="success" title={OK[sp.ok]} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="lotes activos" value={nf.format(activos.length)} icon={<IconList size={22} />} />
        <KpiCard label="cabezas en lotes" value={nf.format(anonimas + individuales)} icon={<IconCow size={22} />} />
        <KpiCard label="cabezas sin caravana" value={nf.format(anonimas)} icon={<IconHash size={22} />} />
        <KpiCard label="identificadas en lotes" value={nf.format(individuales)} icon={<IconTag size={22} />} href="/hacienda" />
      </div>

      {sinPotrero > 0 && !verArchivados && (
        <div className="mb-4">
          <Notice tone="warning" title={`${sinPotrero} ${sinPotrero === 1 ? "lote con hacienda no tiene" : "lotes con hacienda no tienen"} potrero asignado`}>
            Abrilo y usá «Mover a otro potrero» para que la ocupación del campo cierre.
          </Notice>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <FilterTabs
            label="Tipo de lote"
            items={[
              { href: href(sp, { tipo: undefined }), label: "Todos", active: !sp.tipo },
              { href: href(sp, { tipo: "anonimos" }), label: "Por cantidades", active: sp.tipo === "anonimos" },
              { href: href(sp, { tipo: "identificados" }), label: "Identificados", active: sp.tipo === "identificados" },
            ]}
          />
          <FilterTabs
            label="Especie"
            items={[
              { href: href(sp, { especie: undefined }), label: "Todas", active: !especie },
              { href: href(sp, { especie: "BOV" }), label: "Bovinos", active: especie === "BOV" },
              { href: href(sp, { especie: "BUB" }), label: "Bubalinos", active: especie === "BUB" },
            ]}
          />
          <Link href={href(sp, { archivados: verArchivados ? undefined : "1" })} className="ml-auto text-[13px] font-medium text-campo hover:underline">
            {verArchivados ? "Ocultar archivados" : "Ver archivados"}
          </Link>
        </div>

        {lotes.length === 0 ? (
          filtrado || todos.length ? (
            <EmptyState
              icon={<IconList size={24} />}
              title="Ningún lote coincide con estos filtros"
              description="Probá con otra especie o mirá todos los tipos de lote."
              action={
                <Button href="/hacienda/lotes" variant="outline">
                  Ver todos los lotes
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<IconList size={24} />}
              title="Armá tus lotes de manejo"
              description="Un lote agrupa hacienda de una sola especie con un propósito (cría, recría, engorde…) y un potrero. Si no caravaneás todo, creá un lote por cantidades: cargás cuántas cabezas hay por categoría y le registrás vacunas, pesajes y traslados en grupo."
              action={
                ctx.can("maestros.editar") ? (
                  <Button href="/hacienda/lotes/nuevo" icon={<IconPlus size={18} />}>
                    Crear el primer lote
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <Table minWidth={980}>
            <thead>
              <tr>
                <Th>Lote</Th>
                <Th>Especie</Th>
                <Th numeric>Cabezas</Th>
                <Th>Composición</Th>
                <Th>Potrero</Th>
                <Th numeric className="whitespace-nowrap">Peso prom.</Th>
                <Th>
                  <span className="sr-only">Abrir</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => {
                const comp = Object.entries(l.conteo ?? {}).sort(([a], [b]) => (catOrden.get(a) ?? 99) - (catOrden.get(b) ?? 99));
                return (
                  <Tr key={l.id}>
                    <Td>
                      <Link href={`/hacienda/lotes/${l.id}`} className="font-semibold text-ink hover:text-campo hover:underline">
                        {l.nombre}
                      </Link>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <TipoLote l={l} />
                        {l.proposito && <span className="text-[12.5px] text-muted">{propositoNombre(l.proposito)}</span>}
                        {l.archivado_en && <Badge tone="neutral">Archivado</Badge>}
                      </span>
                    </Td>
                    <Td>
                      <SpeciesChip especie={especieDe(l.especie)} />
                    </Td>
                    <Td numeric>
                      <span className="text-[16px] font-semibold">{nf.format(cabezas(l))}</span>
                    </Td>
                    <Td className="max-w-[360px]">
                      {comp.length || (l.cabezas_individuales ?? 0) > 0 ? (
                        <span className="flex flex-wrap gap-1.5">
                          {comp.map(([c, n]) => (
                            <span key={c} className="inline-flex items-center gap-1 rounded-[var(--radius-chip)] border border-border bg-base px-2 py-0.5 text-[12.5px] text-ink">
                              {catNombre.get(c) ?? c} <span className="font-semibold tabular-nums">{nf.format(n)}</span>
                            </span>
                          ))}
                          {(l.cabezas_individuales ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-chip)] border border-campo-50 bg-campo-50 px-2 py-0.5 text-[12.5px] text-monte">
                              <IconTag size={13} /> Identificados <span className="font-semibold tabular-nums">{nf.format(l.cabezas_individuales ?? 0)}</span>
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[13px] text-muted">Sin hacienda</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-[13.5px]">
                      {l.potrero ? (
                        <Link href={`/establecimiento/potreros/${l.potrero.id}`} className="text-ink hover:text-campo hover:underline">
                          {l.potrero.nombre}
                        </Link>
                      ) : (
                        <span className="text-muted">Sin potrero</span>
                      )}
                    </Td>
                    <Td numeric>
                      {l.peso_promedio_kg ? (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <IconScale size={14} className="text-subtle" />
                            {nf.format(Number(l.peso_promedio_kg))} kg
                          </span>
                          <span className="block text-[12px] text-muted">{fecha(l.peso_promedio_fecha)}</span>
                        </>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </Td>
                    <Td className="w-10">
                      <Link href={`/hacienda/lotes/${l.id}`} aria-label={`Abrir ${l.nombre}`} className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-surface-2">
                        <IconChevronRight size={18} />
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

/** Lotes de manejo: identificados y por cantidades (TPA-20). */
export default function LotesPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        title="Hacienda"
        subtitle="Lotes de manejo: cuántas cabezas hay por categoría, en qué potrero y cómo vienen de peso."
        actions={
          <Suspense fallback={null}>
            <AccionNuevo />
          </Suspense>
        }
      />
      <HaciendaTabs activo="lotes" />
      <Suspense fallback={<div className="h-[560px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function AccionNuevo() {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return null;
  return (
    <Button href="/hacienda/lotes/nuevo" icon={<IconPlus size={18} />}>
      Nuevo lote
    </Button>
  );
}
