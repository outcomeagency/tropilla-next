"use client";

import { useState } from "react";
import type { S } from "@/lib/schemas";
import { Button, Card, CardBody, CardHeader, Notice } from "@/components/ui";
import { crearBuscoAction, editarBuscoAction, cerrarBuscoAction } from "@/app/(auth)/comprador/buscos/actions";

function campos(busco?: S<"Busco">) {
  const zona = busco?.zona ?? {};
  const zone = zona as { cualquiera?: boolean; provincias?: string[] };
  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium text-ink">Especie<select name="especie" defaultValue={busco?.especie ?? "BOV"} className="mt-1 h-10 w-full rounded border border-border bg-surface px-3"><option value="BOV">Bovinos</option><option value="BUB">Búfalos</option></select></label>
      <label className="text-sm font-medium text-ink">Cantidad de cabezas<input name="cantidad" type="number" min="1" required defaultValue={busco?.cantidad ?? 1} className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
      <label className="text-sm font-medium text-ink">Categorías<input name="categorias" required defaultValue={busco?.categorias?.join(", ") ?? ""} placeholder="novillitos, vaquillonas" className="mt-1 h-10 w-full rounded border border-border px-3" /><span className="text-xs text-muted">Separá varias categorías con coma.</span></label>
      <label className="text-sm font-medium text-ink">Razas (opcional)<input name="razas" defaultValue={busco?.razas?.join(", ") ?? ""} placeholder="Braford, Brangus" className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
      <label className="text-sm font-medium text-ink">Peso objetivo por animal, kg<input name="peso_objetivo_kg" type="number" min="1" step="0.1" defaultValue={busco?.peso_objetivo_kg ?? ""} className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
      <label className="text-sm font-medium text-ink">Plazo hasta<input name="plazo_hasta" type="date" defaultValue={busco?.plazo_hasta ?? ""} className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
    </div>
    <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="cualquier_zona" defaultChecked={zone.cualquiera ?? false} className="accent-monte" />Acepto cualquier zona</label>
    <label className="block text-sm font-medium text-ink">Provincias de interés<input name="provincias" defaultValue={zone.provincias?.join(", ") ?? ""} placeholder="Corrientes, Chaco" className="mt-1 h-10 w-full rounded border border-border px-3" /><span className="text-xs text-muted">Si aceptás cualquier zona, este campo se ignora.</span></label>
    <label className="block text-sm font-medium text-ink">Mensaje<textarea name="mensaje" rows={3} defaultValue={busco?.mensaje ?? ""} className="mt-1 w-full rounded border border-border px-3 py-2" /></label>
    <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="mostrar_nombre" defaultChecked={busco?.mostrar_nombre ?? false} className="accent-monte" />Mostrar mi nombre o empresa en la demanda pública</label>
  </>;
}

export function BuscosManager({ buscos, perfilCompleto, emailVerificado }: { buscos: S<"Busco">[]; perfilCompleto: boolean; emailVerificado: boolean }) {
  const [editando, setEditando] = useState<string | null>(null);
  return <div className="mx-auto max-w-[920px] space-y-6">
    <div><h1 className="text-[28px] font-bold tracking-tight text-ink">Mis Busco</h1><p className="mt-1 text-sm text-muted">Publicá la hacienda que necesitás y recibí respuestas de productores.</p></div>
    {(!perfilCompleto || !emailVerificado) && <Notice tone="warning" title="Completá tu cuenta para publicar">{!perfilCompleto ? "Terminá tu perfil de comprador." : "Verificá tu email."} La API requiere ambas condiciones para publicar.</Notice>}
    <Card><CardHeader title="Publicar una demanda" description="La zona y la identidad se muestran según lo que elijas." /><CardBody>
      <form action={crearBuscoAction} className="space-y-4">{campos()}<Button type="submit" disabled={!perfilCompleto || !emailVerificado}>Publicar Busco</Button></form>
    </CardBody></Card>
    <section className="space-y-3"><h2 className="text-lg font-semibold text-ink">Demandas publicadas</h2>
      {buscos.length ? buscos.map((b) => <Card key={b.id}><CardHeader title={`${b.cantidad ?? "—"} cabezas · ${b.especie === "BUB" ? "Búfalos" : "Bovinos"}`} description={`Estado: ${b.estado ?? "—"} · ${b.respuestas_count ?? 0} respuestas`} /><CardBody>
        {editando === b.id && b.id ? <form action={editarBuscoAction} className="space-y-4"><input type="hidden" name="busco_id" value={b.id} />{campos(b)}<div className="flex gap-2"><Button type="submit" size="sm">Guardar cambios</Button><Button type="button" variant="ghost" size="sm" onClick={() => setEditando(null)}>Cancelar</Button></div></form> : <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">{b.categorias?.join(", ") || "Sin categoría"}{b.plazo_hasta ? ` · hasta ${b.plazo_hasta}` : ""}</p><div className="flex gap-2">{b.estado === "abierta" && b.id && <><Button type="button" variant="outline" size="sm" onClick={() => setEditando(b.id ?? null)}>Editar</Button><form action={cerrarBuscoAction}><input type="hidden" name="busco_id" value={b.id} /><Button type="submit" variant="danger" size="sm">Cerrar</Button></form></>}</div></div>}
      </CardBody></Card>) : <Card><CardBody><p className="text-sm text-muted">Todavía no publicaste ninguna demanda.</p></CardBody></Card>}
    </section>
  </div>;
}
