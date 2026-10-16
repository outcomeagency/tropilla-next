import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconLock } from "@/components/icons";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { PreciosReferenciaForm } from "@/components/panel/precios-referencia-form";
import { requireContexto } from "@/lib/establecimiento";
import { api, query } from "@/lib/api";
import type { Many, S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Mis precios" };
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

async function Contenido({ searchParams }: { searchParams: Promise<{ especie?: string; categoria?: string; referencia?: string }> }) {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return <Card><EmptyState icon={<IconLock size={24} />} title="Historial privado" description="Los precios propios y las referencias sólo son visibles para el dueño y la administración." /></Card>;
  const f = await searchParams;
  const base = `/establecimientos/${ctx.activa.establecimiento_id}`;
  const [historial, referencias] = await Promise.all([
    api<Many<S<"HistorialPrecios">>>(`${base}/precios/historial${query({ especie: f.especie, categoria: f.categoria, referencia: f.referencia })}`).then((r) => r.data).catch(() => []),
    api<Many<S<"PrecioReferencia">>>(`${base}/precios-referencia?limit=100`).then((r) => r.data).catch(() => []),
  ]);
  const puntos = historial.flatMap((h) => (h.puntos ?? []).map((p) => ({ ...p, especie: h.especie, categoria: h.categoria })));
  return <div className="space-y-4">
    <Card><form className="grid gap-3 p-5 sm:grid-cols-4"><label className="text-sm text-muted">Especie<select name="especie" defaultValue={f.especie ?? ""} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-ink"><option value="">Todas</option><option value="BUB">Búfalos</option><option value="BOV">Bovinos</option></select></label><label className="text-sm text-muted">Categoría<input name="categoria" defaultValue={f.categoria} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-ink" /></label><label className="text-sm text-muted">Comparar con<input name="referencia" defaultValue={f.referencia} placeholder="Ej. novillo overo" className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-ink" /></label><button className="self-end rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-base">Aplicar filtros</button></form></Card>
    {puntos.length ? <Card className="overflow-hidden"><CardHeader title="Precios obtenidos" description="Valores declarados por operación y diferencial contra la referencia elegida." /><Table minWidth={760}><thead><tr><Th>Fecha</Th><Th>Especie · categoría</Th><Th>Modalidad</Th><Th numeric>Tu precio/kg</Th><Th numeric>Referencia/kg</Th><Th numeric>Diferencial</Th></tr></thead><tbody>{puntos.map((p, i) => <Tr key={`${p.operacion_id ?? i}`}><Td>{p.fecha ?? "—"}</Td><Td>{p.especie} · {p.categoria}</Td><Td>{p.modalidad === "al_gancho" ? "Al gancho" : "En pie"}</Td><Td numeric>{p.precio_kg ? money.format(Number(p.precio_kg)) : "—"}</Td><Td numeric>{p.referencia_kg ? money.format(Number(p.referencia_kg)) : "—"}</Td><Td numeric>{p.diferencial_pct == null ? "—" : <Badge tone={Number(p.diferencial_pct) >= 0 ? "success" : "warning"}>{Number(p.diferencial_pct) > 0 ? "+" : ""}{p.diferencial_pct} %</Badge>}</Td></Tr>)}</tbody></Table></Card> : <Card><EmptyState title="Todavía no hay precios para comparar" description="Al registrar ventas con precio, el historial aparece acá. También podés cargar una referencia declarada." /></Card>}
    {historial.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{historial.map((h) => <Card key={`${h.especie}-${h.categoria}`} className="p-5"><p className="text-sm text-muted">Diferencial promedio · {h.especie} · {h.categoria}</p><p className="mt-1 text-2xl font-bold tabular-nums text-ink">{h.diferencial_promedio_pct == null ? "—" : `${Number(h.diferencial_promedio_pct) > 0 ? "+" : ""}${h.diferencial_promedio_pct} %`}</p></Card>)}</div>}
    <PreciosReferenciaForm />
    {referencias.length > 0 && <Card><CardHeader title="Referencias declaradas" description="La comparación usa la misma modalidad de venta." /><Table minWidth={650}><thead><tr><Th>Descripción</Th><Th>Especie · categoría</Th><Th>Modalidad</Th><Th numeric>Precio/kg</Th><Th>Fecha</Th></tr></thead><tbody>{referencias.map((r) => <Tr key={r.id}><Td>{r.descripcion}{r.fuente && <span className="block text-xs text-muted">{r.fuente}</span>}</Td><Td>{r.especie} · {r.categoria ?? "Todas"}</Td><Td>{r.modalidad === "al_gancho" ? "Al gancho" : "En pie"}</Td><Td numeric>{r.precio_kg ? money.format(Number(r.precio_kg)) : "—"}</Td><Td>{r.fecha}</Td></Tr>)}</tbody></Table></Card>}
  </div>;
}

export default function PreciosPage(props: { searchParams: Promise<{ especie?: string; categoria?: string; referencia?: string }> }) { return <><PageHeader title="Mis precios" subtitle="Compará lo obtenido por categoría con referencias declaradas." /><ComercialTabs actual="precios" /><Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}><Contenido searchParams={props.searchParams} /></Suspense></>; }
