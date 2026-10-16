import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconLock, IconPlus } from "@/components/icons";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { requireContexto } from "@/lib/establecimiento";
import { api } from "@/lib/api";
import type { Many, S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Ventas registradas" };
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return <Card><EmptyState icon={<IconLock size={24} />} title="Precios privados" description="El historial de ventas con importes es visible sólo para el dueño y la administración." /></Card>;
  const ventas = await api<Many<S<"Operacion">>>(`/establecimientos/${ctx.activa.establecimiento_id}/operaciones?tipo=venta&limit=50`).then((r) => r.data).catch(() => []);
  if (!ventas.length) return <Card><EmptyState title="Todavía no hay ventas registradas" description="Registrá las condiciones de un trato para conservar el resumen privado en Documentos." action={<Link href="/comercializacion/ventas/nueva"><Button>Registrar venta</Button></Link>} /></Card>;
  return <Card className="overflow-hidden"><CardHeader title="Operaciones de venta" description="Datos y precios privados del establecimiento." /><Table minWidth={850}><thead><tr><Th>Fecha</Th><Th>Comprador</Th><Th>Especie · categoría</Th><Th>Modalidad</Th><Th numeric>Precio/kg</Th><Th numeric>Neto</Th><Th>Registro</Th></tr></thead><tbody>{ventas.map((v) => <Tr key={v.id}><Td>{v.fecha}</Td><Td>{v.contraparte ?? "—"}</Td><Td>{v.especie} · {v.categoria}</Td><Td>{v.modalidad === "al_gancho" ? "Al gancho" : "En pie"}</Td><Td numeric>{v.precio_kg ? money.format(Number(v.precio_kg)) : "—"}</Td><Td numeric>{v.neto_total ? money.format(Number(v.neto_total)) : "—"}</Td><Td><Badge tone={v.estado === "anulada" ? "warning" : "success"}>{v.estado === "anulada" ? "Anulada" : "Registrada"}</Badge>{v.documento_id && <Link className="ml-2 text-link underline" href={`/documentos/${v.documento_id}`}>PDF</Link>}</Td></Tr>)}</tbody></Table></Card>;
}

export default function VentasPage() { return <><PageHeader title="Ventas" subtitle="Operaciones registradas y sus condiciones privadas." actions={<Link href="/comercializacion/ventas/nueva"><Button icon={<IconPlus size={16} />}>Registrar venta</Button></Link>} /><ComercialTabs actual="ventas" /><Suspense fallback={<div className="h-64 rounded-[var(--radius-card)] border border-border bg-surface" />}><Contenido /></Suspense></>; }
