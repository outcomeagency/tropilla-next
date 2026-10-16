import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Card, EmptyState, MockNotice, PageHeader, SpeciesChip, TrustBadge, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconArrowRight, IconList, IconMap } from "@/components/icons";
import { PasosOferta } from "@/components/panel/ofertas/estado";
import { requireContexto } from "@/lib/establecimiento";
import { listLotes } from "@/lib/data/ofertas";
import { listReactores, listRetiros } from "@/lib/data/sanidad";
import { connection } from "next/server";
import { crearDesdeLoteAction } from "@/lib/oferta-actions";
import { categoriaNombre } from "@/lib/catalogo";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Publicar oferta" };

const fmt = (iso: string) => iso.split("-").reverse().join("/");

async function Lotes() {
  const ctx = await requireContexto();
  if (!ctx.can("ofertas.gestionar")) {
    return (
      <Card>
        <EmptyState icon={<IconAlert size={24} />} title="Tu rol no permite publicar ofertas" description="Pedile al dueño o a un administrador del establecimiento que la publique." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  await connection();
  const HOY = new Date();
  const [{ data: lotes, source }, retiros, reactores] = await Promise.all([
    listLotes(est),
    listRetiros(est).catch(() => ({ data: [], lotes: [] })),
    listReactores(est).catch(() => []),
  ]);
  // TPA-35: retiro vigente y reactores por lote (los animales con retiro cuentan para su lote).
  const retiroLote = new Map<string, string | null>((retiros.lotes ?? []).map((l) => [l.id ?? "", l.retiro_carne_hasta ?? null]));
  for (const a of retiros.data) if (a.lote?.id && !retiroLote.has(a.lote.id)) retiroLote.set(a.lote.id, null);
  const reactoresLote = new Map<string, number>();
  for (const a of reactores) if (a.lote?.id) reactoresLote.set(a.lote.id, (reactoresLote.get(a.lote.id) ?? 0) + 1);
  const disponibles = lotes.filter((l) => (l.cabezas_individuales ?? 0) + (l.cabezas_anonimas ?? 0) > 0);

  if (!disponibles.length) {
    return (
      <Card>
        <EmptyState
          icon={<IconList size={24} />}
          title="No hay lotes con animales"
          description="Una oferta se arma desde un lote: armá uno en Hacienda (por ejemplo «Bubillos para venta») y volvé."
          action={
            <Link href="/hacienda" className={buttonClass("primary", "md")}>
              Ir a Hacienda
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <>
      {source === "mock" && (
        <div className="mb-4">
          <MockNotice what="los lotes" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {disponibles.map((l) => {
          const cabezas = (l.cabezas_individuales ?? 0) + (l.cabezas_anonimas ?? 0);
          const dias = l.peso_promedio_fecha ? Math.round((HOY.getTime() - new Date(l.peso_promedio_fecha).getTime()) / 86_400_000) : null;
          const retiro = retiroLote.has(l.id ?? "") || (l.extra?.retiroHasta && new Date(l.extra.retiroHasta) > HOY);
          const retiroHasta = retiroLote.get(l.id ?? "") ?? l.extra?.retiroHasta ?? null;
          const nReactores = reactoresLote.get(l.id ?? "") ?? 0;
          return (
            <Card key={l.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3 px-5 pt-4">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold text-ink">{l.nombre}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                    <IconMap size={14} /> {l.potrero?.nombre ?? "Sin potrero"}
                    {l.anonimo && " · incluye animales sin identificar"}
                  </p>
                </div>
                <SpeciesChip especie={especieDe(l.especie)} />
              </div>
              <dl className="mx-5 mt-4 grid grid-cols-3 divide-x divide-border rounded-[10px] border border-border text-center">
                <div className="px-2 py-2.5">
                  <dt className="text-[11.5px] text-muted">Cabezas</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-ink">{cabezas}</dd>
                </div>
                <div className="px-2 py-2.5">
                  <dt className="text-[11.5px] text-muted">Peso promedio</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-ink">{l.peso_promedio_kg ? `${l.peso_promedio_kg} kg` : "—"}</dd>
                </div>
                <div className="px-2 py-2.5">
                  <dt className="text-[11.5px] text-muted">Categoría</dt>
                  <dd className="truncate text-[14px] font-semibold text-ink">
                    {Object.keys(l.conteo ?? {})
                      .map((c) => categoriaNombre(c))
                      .join(", ") || "—"}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5 px-5 pt-3">
                {l.peso_promedio_fecha && <TrustBadge nivel="integridad_registrada" detail={`Pesaje ${fmt(l.peso_promedio_fecha)}`} />}
                {dias != null && dias > 60 && (
                  <Badge tone="warning" icon={<IconAlert size={14} />}>
                    Pesaje de hace {dias} días
                  </Badge>
                )}
                {retiro && (
                  <Badge tone="warning" icon={<IconAlert size={14} />}>
                    Retiro vigente{retiroHasta ? ` hasta ${fmt(retiroHasta)}` : ""}
                  </Badge>
                )}
                {nReactores > 0 && (
                  <Badge tone="danger" icon={<IconAlert size={14} />}>
                    {nReactores} {nReactores === 1 ? "reactor" : "reactores"} (privado)
                  </Badge>
                )}
              </div>
              <form action={crearDesdeLoteAction} className="mt-auto border-t border-border px-5 py-3 pt-3">
                <input type="hidden" name="lote_id" value={l.id} />
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Ofertar este lote <IconArrowRight size={16} />
                </button>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export default function NuevaOfertaPage() {
  return (
    <>
      <Link href="/comercializacion" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Comercialización
      </Link>
      <PageHeader title="Publicar una oferta" subtitle="Elegí el lote. Precargamos lo que ya está registrado; después decidís qué se muestra." />
      <PasosOferta actual={0} />
      <Suspense fallback={<div className="h-[280px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Lotes />
      </Suspense>
    </>
  );
}
