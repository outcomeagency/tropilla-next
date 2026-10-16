import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, EmptyState, Notice, PageHeader, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconLock } from "@/components/icons";
import { Recategorizacion, type GrupoRecat } from "@/components/panel/hacienda/recategorizacion";
import { requireContexto } from "@/lib/establecimiento";
import { listAnimales } from "@/lib/data/hacienda";
import { getCatalogos } from "@/lib/data/catalogos";
import { edad, hoyAR, nf } from "@/lib/format";
import { VALORES } from "@/lib/eventos-hacienda";
import { especieDe } from "@/lib/types";
import type { S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Recategorización sugerida" };

const DENT: Record<string, string> = { leche: "dientes de leche", "2": "2 dientes", "4": "4 dientes", "6_mas": "boca llena" };

async function Contenido() {
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  if (!ctx.can("hacienda.crear")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite recategorizar" description="Las sugerencias se ven en Hacienda con el filtro «Con recategorización sugerida»." />
      </Card>
    );
  }
  // Todas las sugerencias (hasta 500), en páginas de 100.
  const animales: S<"AnimalResumen">[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 5; i++) {
    const r = await listAnimales(est, { sugerencia_categoria: "1" }, cursor, 100);
    animales.push(...r.data);
    cursor = r.meta?.next_cursor ?? undefined;
    if (!cursor) break;
  }
  const cat = await getCatalogos();
  await connection();

  const catNombre = new Map(cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo]));
  // Motivo de la regla de mayor prioridad que lleva a esa categoría (catálogo de reglas, functional/03 §2.2).
  const reglas = [...cat.reglas].sort((a, b) => b.prioridad - a.prioridad);
  const motivoDe = (codigo: string) => {
    const m = reglas.find((r) => r.categoria === codigo)?.motivo;
    return m ? (VALORES[m] ?? m) : "Reglas de la especie";
  };

  const grupos = new Map<string, GrupoRecat>();
  for (const a of animales) {
    if (!a.categoria_sugerida || a.categoria_sugerida === a.categoria) continue;
    const key = `${a.categoria}>${a.categoria_sugerida}`;
    if (!grupos.has(key)) {
      grupos.set(key, {
        key,
        de: a.categoria_nombre ?? catNombre.get(a.categoria ?? "") ?? a.categoria ?? "",
        a: catNombre.get(a.categoria_sugerida) ?? a.categoria_sugerida,
        aCodigo: a.categoria_sugerida,
        motivo: motivoDe(a.categoria_sugerida),
        especie: especieDe(a.especie),
        animales: [],
      });
    }
    const x = a as S<"AnimalResumen"> & { denticion?: string | null };
    grupos.get(key)!.animales.push({
      id: a.id ?? "",
      ident: a.identificacion_principal ?? "Sin caravana",
      edad: edad(a.edad_meses, true),
      lote: a.lote?.nombre,
      peso: a.peso_kg ? `${nf.format(Number(a.peso_kg))} kg` : null,
      detalle: x.denticion ? DENT[x.denticion] : null,
    });
  }
  const lista = [...grupos.values()].sort((a, b) => b.animales.length - a.animales.length);

  if (!lista.length) {
    return (
      <Card>
        <EmptyState
          icon={<IconCheckCircle size={24} />}
          title="No hay recategorizaciones pendientes"
          description="Cuando un animal cumpla una regla de su especie (destete, castración, primer parto, edad o dentición en búfalos) aparece acá para confirmarlo."
          action={
            <Link href="/hacienda" className={buttonClass("outline", "md")}>
              Volver a Hacienda
            </Link>
          }
        />
      </Card>
    );
  }
  return <Recategorizacion key={lista.map((g) => g.key + g.animales.length).join()} grupos={lista} hoy={hoyAR(new Date())} />;
}

/** Recategorización sugerida con confirmación en bloque (TPA-25). */
async function Ok({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const n = Number((await searchParams).ok ?? 0);
  if (!n) return null;
  return (
    <div className="mb-4">
      <Notice tone="success" title={n === 1 ? "Recategorización confirmada." : `${n} recategorizaciones confirmadas.`}>
        La categoría nueva ya se ve en Hacienda y en las existencias; cada cambio quedó en la historia del animal.
      </Notice>
    </div>
  );
}

export default function RecategorizacionPage(props: { searchParams: Promise<{ ok?: string }> }) {
  return (
    <>
      <Link href="/hacienda" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Hacienda
      </Link>
      <PageHeader
        title="Recategorización sugerida"
        subtitle="Animales que cumplen una regla de su especie. Revisá, destildá lo que no corresponda y confirmá en bloque: cada cambio queda como evento."
      />
      <Suspense fallback={null}>
        <Ok searchParams={props.searchParams} />
      </Suspense>
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
