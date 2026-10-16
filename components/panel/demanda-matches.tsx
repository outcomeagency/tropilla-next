"use client";

import type { S } from "@/lib/schemas";
import { Button, Card, CardBody, CardHeader, Notice } from "@/components/ui";
import { responderDemandaAction } from "@/app/(panel)/comercializacion/demandas/actions";

export function DemandaMatches({ demandas, puedeResponder }: { demandas: S<"Demanda">[]; puedeResponder: boolean }) {
  return <div className="mt-4 space-y-3">
    {demandas.length ? demandas.map((item, index) => {
      const busco = item.busco;
      if (!busco) return null;
      const comprador = busco.comprador as { empresa?: string; nombre?: string; tipo?: string } | null | undefined;
      const zona = busco.zona as { provincias_nombres?: string[]; provincias?: string[]; cualquiera?: boolean } | undefined;
      return <Card key={busco.id ?? index}><CardHeader title={`${busco.cantidad ?? "—"} cabezas · ${busco.especie === "BUB" ? "Búfalos" : "Bovinos"}`} description={`${busco.categorias?.join(", ") || "Categoría abierta"} · ${item.puntaje ?? 0}% de coincidencia`} />
        <CardBody className="space-y-3"><div className="grid gap-2 text-sm text-muted sm:grid-cols-2"><p>Zona: {zona?.cualquiera ? "Cualquier zona" : zona?.provincias_nombres?.join(", ") || zona?.provincias?.join(", ") || "A convenir"}</p><p>Plazo: {busco.plazo_hasta || "A convenir"}</p>{busco.peso_objetivo_kg && <p>Peso objetivo: {busco.peso_objetivo_kg} kg</p>}<p>Comprador: {comprador?.empresa || comprador?.nombre || comprador?.tipo || "Nombre reservado"}</p></div>{busco.mensaje && <p className="rounded bg-surface-2 p-3 text-sm text-ink">{busco.mensaje}</p>}
          {item.respondida ? <Notice tone="success" title="Ya respondiste esta demanda." /> : puedeResponder ? <form action={responderDemandaAction} className="space-y-2"><input type="hidden" name="busco_id" value={busco.id} /><label className="block text-sm font-medium text-ink">Mensaje al comprador<textarea name="mensaje" required minLength={10} rows={2} placeholder="Contale qué hacienda podrías ofrecer." className="mt-1 w-full rounded border border-border px-3 py-2" /></label><Button type="submit" size="sm">Responder demanda</Button></form> : null}
        </CardBody></Card>;
    }) : <Card><CardBody><p className="text-sm text-muted">Todavía no hay demandas que calcen con la hacienda de este establecimiento.</p></CardBody></Card>}
  </div>;
}
