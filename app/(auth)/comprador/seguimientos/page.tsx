import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CompradorShell } from "@/components/comprador/shell";
import { getSesionOpcional } from "@/lib/auth";
import { api } from "@/lib/api";
import type { One, S } from "@/lib/schemas";
import { Card, CardBody, CardHeader, Notice, Button } from "@/components/ui";
import { dejarDeSeguirAction } from "@/lib/comprador-actions";

export const metadata: Metadata = { title: "Productores que sigo" };

async function Contenido({ searchParams }: { searchParams: Promise<{ error?: string; seguido?: string }> }) {
  if (!(await getSesionOpcional())) redirect("/ingresar?next=/comprador/seguimientos");
  const params = await searchParams;
  const seguimientos = (await api<One<S<"Seguimiento">[]>>("/seguimientos")).data;
  return <div className="mx-auto max-w-[900px] space-y-5"><div><h1 className="text-[28px] font-bold tracking-tight text-ink">Productores que sigo</h1><p className="mt-1 text-sm text-muted">Recibís novedades cuando publican ofertas o contratos.</p></div>
    {params.error && <Notice tone="danger" title="No pudimos actualizar el seguimiento.">{params.error}</Notice>}
    {params.seguido && <Notice tone="success" title="Seguimiento activado. Te avisamos cuando publique ofertas o contratos." />}
    {seguimientos.length ? seguimientos.map((s, i) => <Card key={s.establecimiento?.slug ?? i}><CardHeader title={s.establecimiento?.nombre ?? "Productor"} description={s.desde ? `Desde ${new Intl.DateTimeFormat("es-AR").format(new Date(s.desde))}` : "Seguimiento activo"} /><CardBody className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Avisos de ofertas y contratos nuevos activados.</p><div className="flex items-center gap-3">{s.establecimiento?.slug && <Link href={`/es/p/${s.establecimiento.slug}`} className="text-sm font-medium text-monte underline">Ver perfil</Link>}{s.establecimiento?.slug && <form action={dejarDeSeguirAction}><input type="hidden" name="establecimiento_slug" value={s.establecimiento.slug} /><Button type="submit" variant="outline" size="sm">Dejar de seguir</Button></form>}</div></CardBody></Card>) : <Card><CardBody><p className="text-sm text-muted">Todavía no seguís productores. Abrí un perfil o contrato para activar avisos.</p></CardBody></Card>}
  </div>;
}

export default function SeguimientosPage(props: { searchParams: Promise<{ error?: string; seguido?: string }> }) {
  return <CompradorShell><Suspense fallback={<div className="h-80 rounded border border-border bg-surface" />}><Contenido searchParams={props.searchParams} /></Suspense></CompradorShell>;
}
