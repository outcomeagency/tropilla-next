import { Suspense } from "react";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getContexto } from "@/lib/establecimiento";
import type { Many, S } from "@/lib/schemas";
import { Card, CardBody, Notice, PageHeader } from "@/components/ui";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { DemandaMatches } from "@/components/panel/demanda-matches";

export const metadata: Metadata = { title: "Demandas que calzan" };

async function Contenido() {
  const ctx = await getContexto();
  if (!ctx) return <Notice tone="danger" title="No pudimos validar tu sesión." />;
  let demandas: S<"Demanda">[];
  try { demandas = (await api<Many<S<"Demanda">>>(`/establecimientos/${ctx.activa.establecimiento_id}/demandas?limit=100`)).data; }
  catch {
    return <Card><CardBody><p className="text-sm text-muted">No pudimos cargar las demandas ahora. Probá de nuevo más tarde.</p></CardBody></Card>;
  }
  return <DemandaMatches demandas={demandas} puedeResponder={ctx.can("busco.responder")} />;
}

export default function DemandasPage() {
  return <><PageHeader title="Comercialización" subtitle="Demandas abiertas que coinciden con tu hacienda." /><ComercialTabs actual="demandas" /><Notice tone="info" title="Coincidencias según lo declarado">Las demandas se ordenan por cercanía de categoría, cantidad y zona. Revisá cada detalle antes de responder.</Notice><Suspense fallback={<div className="mt-4 h-80 rounded border border-border bg-surface" />}><Contenido /></Suspense></>;
}
