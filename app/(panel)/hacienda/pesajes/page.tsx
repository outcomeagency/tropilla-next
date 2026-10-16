import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, CardHeader, EmptyState, PageHeader, SpeciesChip, Table, Td, Th, Tr } from "@/components/ui";
import { IconChevronRight, IconLock, IconScale } from "@/components/icons";
import { HaciendaTabs } from "@/components/panel/hacienda/tabs";
import { Pesada } from "@/components/panel/pesajes/pesada";
import { requireContexto } from "@/lib/establecimiento";
import { getAnimal } from "@/lib/data/hacienda";
import { listLotes } from "@/lib/data/potreros";
import { listEventos } from "@/lib/data/eventos";
import { fecha, hoyAR } from "@/lib/format";
import { fmtGdp, fmtKg } from "@/lib/pesajes";
import { especieDe } from "@/lib/types";
import type { AnimalElegido } from "@/lib/evento-actions";

export const metadata: Metadata = { title: "Pesajes" };

type SP = { animal?: string };

async function Sesion({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  if (!ctx.can("hacienda.crear")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite cargar pesajes" description="Podés ver la ganancia diaria por lote y en la ficha de cada animal." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const a = sp.animal && /^[0-9a-f-]{36}$/i.test(sp.animal) ? await getAnimal(est, sp.animal).catch(() => null) : null;
  await connection();
  const iniciales: AnimalElegido[] =
    a?.id && (a.estado ?? "activo") === "activo"
      ? [{ id: a.id, ident: a.identificacion_principal ?? "Sin caravana", especie: a.especie ?? "", sexo: a.sexo ?? "", categoria: a.categoria_nombre ?? a.categoria ?? "", lote: a.lote?.nombre ?? null, peso: a.peso_kg ?? null, pesoFecha: a.peso_fecha ?? null }]
      : [];
  return <Pesada hoy={hoyAR(new Date())} iniciales={iniciales} />;
}

/** GDP promedio por lote (de la proyección del lote) y últimos pesajes. */
async function Resumen() {
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  const [lotes, ultimos] = await Promise.all([listLotes(est).catch(() => []), listEventos(est, { tipo: "hacienda.pesaje" }, undefined, 8).catch(() => null)]);
  const conPeso = lotes.filter((l) => l.peso_promedio_kg).sort((x, y) => Number(y.gdp_promedio_kg_dia ?? -99) - Number(x.gdp_promedio_kg_dia ?? -99));

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader title="Ganancia diaria por lote" description="Promedio del lote entre sus dos últimos pesajes (individuales o de lote)." />
        {conPeso.length ? (
          <Table minWidth={560}>
            <thead>
              <tr>
                <Th>Lote</Th>
                <Th numeric>Peso promedio</Th>
                <Th numeric>Ganancia diaria</Th>
                <Th className="w-[44px]" />
              </tr>
            </thead>
            <tbody>
              {conPeso.map((l) => {
                const g = l.gdp_promedio_kg_dia != null ? Number(l.gdp_promedio_kg_dia) : null;
                return (
                  <Tr key={l.id}>
                    <Td>
                      <Link href={`/hacienda/lotes/${l.id}`} className="font-semibold text-ink hover:underline">
                        {l.nombre}
                      </Link>
                      <span className="ml-2 align-middle">
                        <SpeciesChip especie={especieDe(l.especie)} />
                      </span>
                    </Td>
                    <Td numeric>
                      {fmtKg(Number(l.peso_promedio_kg))}
                      <span className="block text-[12px] text-muted">{fecha(l.peso_promedio_fecha)}</span>
                    </Td>
                    <Td numeric>{g == null ? <span className="whitespace-nowrap text-muted">Falta otro pesaje</span> : <span className={g < 0 ? "font-semibold text-danger" : "font-semibold"}>{fmtGdp(g)}</span>}</Td>
                    <Td>
                      <Link href={`/hacienda/lotes/${l.id}`} aria-label={`Abrir ${l.nombre}`} className="grid h-8 w-8 place-items-center rounded-[8px] text-subtle hover:bg-base hover:text-ink">
                        <IconChevronRight size={18} />
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<IconScale size={24} />} title="Ningún lote tiene pesajes todavía" description="Pesá el lote completo o una muestra: desde la ficha del lote se carga el promedio con la cantidad de cabezas." />
        )}
      </Card>
      <Card className="overflow-hidden">
        <CardHeader
          title="Últimos pesajes"
          action={
            <Link href="/hacienda/eventos?tipo=hacienda.pesaje&modulo=hacienda" className="text-[13px] font-medium text-campo hover:underline">
              Ver todos
            </Link>
          }
        />
        {ultimos?.data.length ? (
          <ul className="divide-y divide-border">
            {ultimos.data.map((e) => (
              <li key={e.id}>
                <Link href={`/hacienda/eventos/${e.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-2">
                  <span className="min-w-0 text-[14px]">
                    <span className="block truncate text-ink">{e.resumen}</span>
                    <span className="text-[12.5px] text-muted">{e.autor?.nombre}</span>
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-muted">{fecha(e.ocurrido_en)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-[14px] text-muted">Sin pesajes registrados.</p>
        )}
      </Card>
    </div>
  );
}

/** Pesajes y ganancia diaria (TPA-23). */
export default function PesajesPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Hacienda" subtitle="Pesajes y ganancia diaria: cargá una pesada completa y mirá cómo viene cada lote." />
      <HaciendaTabs activo="pesajes" />
      <div className="space-y-4">
        <Suspense fallback={<div className="h-[360px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
          <Sesion searchParams={props.searchParams} />
        </Suspense>
        <Suspense fallback={<div className="h-[280px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
          <Resumen />
        </Suspense>
      </div>
    </>
  );
}
