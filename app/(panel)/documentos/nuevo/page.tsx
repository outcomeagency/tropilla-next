import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { NuevoDocumento } from "@/components/panel/documentos/nuevo";
import { requireContexto } from "@/lib/establecimiento";
import { getCatalogos } from "@/lib/data/catalogos";
import { getAnimal, listPotreros } from "@/lib/data/hacienda";
import { listLotes } from "@/lib/data/potreros";
import { tiposDocumento } from "@/lib/tipos-documento";
import { hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Subir documento" };

type SP = { animal?: string; lote?: string };

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  if (!ctx.can("documentos.crear")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite cargar documentos" description="Podés verlos en la carpeta. Para cargar, pedile al dueño un rol de encargado o administración." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const [cat, lotes, potreros, animal] = await Promise.all([
    getCatalogos(),
    listLotes(est).catch(() => []),
    listPotreros(est).catch(() => []),
    sp.animal && /^[0-9a-f-]{36}$/i.test(sp.animal) ? getAnimal(est, sp.animal).catch(() => null) : Promise.resolve(null),
  ]);
  await connection();
  return (
    <NuevoDocumento
      tipos={tiposDocumento(cat, ctx.can("documentos.fiscal"))}
      lotes={lotes.map((l) => ({ id: l.id ?? "", nombre: l.nombre ?? "" }))}
      potreros={potreros.map((x) => ({ id: x.id ?? "", nombre: x.nombre ?? "" }))}
      hoy={hoyAR(new Date())}
      loteInicial={sp.lote}
      animalesIniciales={animal?.id ? [{ id: animal.id, ident: animal.identificacion_principal ?? "Sin caravana", especie: animal.especie ?? "", sexo: animal.sexo ?? "", categoria: animal.categoria_nombre ?? "" }] : []}
    />
  );
}

/** Subir un documento con tipo, vencimiento y vínculos (TPA-36). */
export default function NuevoDocumentoPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <Link href="/documentos" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Documentos
      </Link>
      <PageHeader title="Subir documento" subtitle="El archivo se guarda con su huella; los datos que cargás son declarados y se pueden corregir con motivo." />
      <Suspense fallback={<div className="h-[560px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
