import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ApiError } from "@/lib/api";
import { Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { CorregirEvento } from "@/components/panel/eventos/corregir";
import { requireContexto } from "@/lib/establecimiento";
import { getEvento } from "@/lib/data/eventos";
import { listPotreros } from "@/lib/data/hacienda";
import { listLotes } from "@/lib/data/potreros";
import { getCatalogos } from "@/lib/data/catalogos";
import { camposEditables, leer } from "@/lib/correccion";
import { ETIQUETAS } from "@/lib/eventos-hacienda";
import { hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Corregir evento" };

type Params = { id: string };

async function Contenido({ params }: { params: Promise<Params> }) {
  const ctx = await requireContexto();
  const { id } = await params;
  const est = ctx.activa.establecimiento_id;
  const det = await getEvento(est, id).catch((e) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  });
  const ev = det.evento ?? {};
  const tipo = ev.tipo ?? "";
  const modulo = tipo.split(".")[0];
  const puede = ctx.can(modulo === "establecimiento" ? "establecimiento_eventos.crear" : `${modulo}.corregir`);
  const [cat, potreros, lotes] = await Promise.all([getCatalogos(), listPotreros(est).catch(() => []), listLotes(est).catch(() => [])]);
  await connection();
  const t = cat.tiposEvento.find((x) => x.codigo === tipo);

  if (!puede || ev.vigente === false || ev.accion === "anulacion") {
    return (
      <Card>
        <EmptyState
          icon={<IconLock size={24} />}
          title={!puede ? "Tu rol no permite corregir este evento" : "Este evento no se puede corregir"}
          description={!puede ? "Las correcciones las hacen el dueño, la administración o quien cargó con permiso de corrección." : "Ya tiene una versión más nueva o fue anulado. Abrí la versión vigente."}
          action={
            <Link href={`/hacienda/eventos/${id}`} className={buttonClass("outline", "md")}>
              Volver al evento
            </Link>
          }
        />
      </Card>
    );
  }

  const campos = camposEditables(t?.schema);
  const valores: Record<string, string> = {};
  for (const c of campos) {
    const v = leer(ev.payload as Record<string, unknown>, c.path);
    if (v != null) valores[c.path] = String(v);
  }
  const noEditables = Object.entries(ev.payload ?? {})
    .filter(([, v]) => Array.isArray(v))
    .map(([k]) => (ETIQUETAS[k] ?? k).toLowerCase())
    .concat(["los animales o el lote del evento"]);
  const especie = new Set((cat.categorias ?? []).map((c) => String(c.especie)));

  return (
    <CorregirEvento
      eventoId={ev.id ?? id}
      tipoNombre={t?.nombre ?? tipo}
      campos={campos}
      valores={valores}
      opciones={{
        causa: (cat.items.causas_muerte ?? []).map((i) => [i.codigo, i.nombre]),
        destino: (cat.items.destinos ?? []).map((i) => [i.codigo, i.nombre]),
        categoria_nueva: cat.categorias.filter((c) => especie.has(String(c.especie))).map((c) => [c.codigo, `${c.nombre ?? c.codigo} (${c.especie === "BUB" ? "bubalino" : "bovino"})`]),
        categoria_faena: cat.categoriasFaena.map((c) => [c.codigo, c.nombre ?? c.codigo]),
        potrero_destino_id: potreros.map((p) => [p.id ?? "", p.nombre ?? ""]),
        lote_destino_id: lotes.map((l) => [l.id ?? "", l.nombre ?? ""]),
      }}
      ocurridoEn={(ev.ocurrido_en ?? "").slice(0, 10)}
      observaciones={ev.observaciones ?? ""}
      noEditables={noEditables}
      hoy={hoyAR(new Date())}
    />
  );
}

/** Corregir un evento con motivo obligatorio (TPA-26). */
export default async function CorregirEventoPage(props: { params: Promise<Params> }) {
  return (
    <>
      <Suspense fallback={null}>
        <Volver params={props.params} />
      </Suspense>
      <PageHeader title="Corregir evento" subtitle="La corrección es una versión nueva: la original queda guardada y a la vista de todos." />
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido params={props.params} />
      </Suspense>
    </>
  );
}

async function Volver({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return (
    <Link href={`/hacienda/eventos/${id}`} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
      <IconArrowLeft size={16} /> Evento
    </Link>
  );
}
