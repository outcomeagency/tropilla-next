import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardHeader, EmptyState, FilterTabs, PageHeader } from "@/components/ui";
import { IconAlert, IconCheckCircle } from "@/components/icons";
import { CamposTabs } from "@/components/panel/campos/comun";
import { ResolverForm } from "@/components/panel/campos/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { getDisputasStaff } from "@/lib/data/campos";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Moderación de campos" };

const ESTADO: Record<string, string> = { abierta: "Abierta", en_revision: "En revisión", resuelta: "Resuelta", desestimada: "Desestimada" };
const ACCION: Record<string, string> = { ninguna: "Sin cambios", aviso_pausado: "Aviso pausado", aviso_cerrado: "Aviso cerrado", verificacion_retirada: "Verificación retirada" };

async function Contenido({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const [ctx, sp] = await Promise.all([requireContexto(), searchParams]);
  if (!ctx.me.usuario.es_staff) notFound();
  const estado = ["resuelta", "desestimada"].includes(sp.estado ?? "") ? (sp.estado as string) : "pendientes";
  const r = await getDisputasStaff(estado);
  return (
    <>
      <CamposTabs actual="moderacion" staff />
      <div className="mb-4">
        <FilterTabs
          label="Estado"
          items={[
            { href: "/campos/moderacion", label: "Pendientes", active: estado === "pendientes" },
            { href: "/campos/moderacion?estado=resuelta", label: "Resueltas", active: estado === "resuelta" },
            { href: "/campos/moderacion?estado=desestimada", label: "Desestimadas", active: estado === "desestimada" },
          ]}
        />
      </div>
      {r.estado !== "ok" ? (
        <Card>
          <EmptyState icon={<IconAlert size={24} />} title="No pudimos traer las disputas" description={r.estado === "error" ? r.mensaje : "Probá de nuevo."} action={<Button href="/campos/moderacion">Reintentar</Button>} />
        </Card>
      ) : r.data.length === 0 ? (
        <Card>
          <EmptyState icon={<IconCheckCircle size={24} />} title="No hay disputas en esta lista" description="Cuando alguien reporte un aviso o una operación, aparece acá con el descargo del anunciante." />
        </Card>
      ) : (
        <Card>
          <CardHeader title={`${r.data.length} ${r.data.length === 1 ? "disputa" : "disputas"}`} description="TROPILLA modera la publicación; no arbitra el contrato entre las partes." />
          <ul className="divide-y divide-border">
            {r.data.map((d) => (
              <li key={d.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_420px]">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={d.estado === "abierta" ? "warning" : d.estado === "en_revision" ? "info" : "neutral"} icon={<IconAlert size={14} />}>
                      {ESTADO[d.estado] ?? d.estado}
                    </Badge>
                    <span className="text-[14px] font-semibold text-ink">{d.motivo_nombre}</span>
                    <span className="text-[12.5px] text-muted">{fechaHora(d.created_at)}</span>
                  </div>
                  <p className="text-[14px] text-ink">
                    <Link href={`/campos/${d.aviso_id}`} className="font-semibold text-campo hover:underline">
                      {d.aviso?.titulo}
                    </Link>{" "}
                    <span className="text-muted">· {d.aviso?.establecimiento} · aviso {d.aviso?.estado}</span>
                  </p>
                  <p className="whitespace-pre-line text-[14px] text-ink">{d.detalle}</p>
                  <p className="text-[13px] text-muted">
                    Reportó: {d.denunciante?.nombre}
                    {d.denunciante?.telefono && ` · ${d.denunciante.telefono}`}
                    {d.denunciante?.email && ` · ${d.denunciante.email}`}
                  </p>
                  {d.descargo ? (
                    <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-[13.5px] text-ink">
                      <span className="font-semibold">Descargo del anunciante:</span> {d.descargo}
                    </p>
                  ) : (
                    <p className="text-[13px] text-muted">El anunciante todavía no dejó descargo.</p>
                  )}
                  {d.resolucion && (
                    <p className="text-[13.5px] text-ink">
                      <span className="font-semibold">Resolución:</span> {d.resolucion} {d.accion && <Badge>{ACCION[d.accion] ?? d.accion}</Badge>}
                    </p>
                  )}
                </div>
                {(d.estado === "abierta" || d.estado === "en_revision") && <ResolverForm disputa={d.id} estado={d.estado} />}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export default function ModeracionCamposPage(props: { searchParams: Promise<{ estado?: string }> }) {
  return (
    <>
      <PageHeader title="Campos y pastajes" subtitle="Moderación del equipo de TROPILLA: reportes, descargos y resoluciones." />
      <Suspense fallback={<div className="h-80 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
