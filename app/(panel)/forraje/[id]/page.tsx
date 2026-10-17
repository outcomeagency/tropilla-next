import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconLeaf, IconMessage } from "@/components/icons";
import { ESTADO_REVISION, ResultadoBrief } from "@/components/panel/forraje/resultado-brief";
import { RevisionForm } from "@/components/panel/forraje/revision-form";
import { requireContexto } from "@/lib/establecimiento";
import { getBriefForraje } from "@/lib/data/forraje";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Brief de forraje" };

const ROL: Record<string, string> = { asesor: "Asesor", dueno: "Dueño", admin: "Administración", staff: "Equipo TROPILLA" };

async function Contenido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const [ctx, { id }, sp] = await Promise.all([requireContexto(), params, searchParams]);
  const r = await getBriefForraje(ctx.activa.establecimiento_id, id);
  if (r.estado === "no_encontrado") notFound();
  if (r.estado !== "ok") {
    return (
      <Card>
        <EmptyState
          icon={<IconLeaf size={24} />}
          title="No pudimos abrir el brief"
          description={r.estado === "error" ? r.mensaje : "La API de este entorno aún no publica el brief preventivo."}
          action={<Button href="/forraje">Volver</Button>}
        />
      </Card>
    );
  }
  const b = r.data;
  const rev = ESTADO_REVISION[b.estado_revision] ?? ESTADO_REVISION.sin_revisar;

  return (
    <>
      <PageHeader
        title={b.nombre ?? "Brief de forraje y carga"}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone="info">Piloto</Badge>
            <Badge tone={rev.tone} icon={b.estado_revision === "revisado" ? <IconCheckCircle size={13} /> : undefined}>
              {rev.label}
            </Badge>
            Armado por {b.autor} · {fechaHora(b.created_at)} · {b.horizonte_dias} días · guardado sin cambios
          </span>
        }
        actions={
          <Button href="/forraje" variant="outline" icon={<IconArrowLeft size={16} />}>
            Briefs
          </Button>
        }
      />
      <div className="space-y-6">
        {sp.ok === "guardado" && <Notice tone="success" title="Brief guardado. Compartilo con tu asesor para que deje su revisión." />}
        {b.resultado && <ResultadoBrief r={b.resultado} />}

        <Card>
          <CardHeader title="Revisión del asesor" description="Piloto: cada brief se revisa con una persona que conozca el campo. Las revisiones quedan registradas y no se editan." />
          {(b.revisiones ?? []).length ? (
            <ol className="divide-y divide-border">
              {(b.revisiones ?? []).map((v) => {
                const st = ESTADO_REVISION[v.resultado] ?? ESTADO_REVISION.revisado;
                return (
                  <li key={v.id} className="flex gap-3 px-5 py-4">
                    <IconMessage size={18} className="mt-0.5 shrink-0 text-muted" />
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                        <span className="font-semibold text-ink">{v.revisor}</span>
                        {ROL[v.rol] ?? v.rol} · {fechaHora(v.created_at)}
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </p>
                      <p className="whitespace-pre-line text-[14px] text-ink">{v.nota}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="px-5 py-4 text-[14px] text-muted">Todavía no tiene revisión. Hasta entonces, tomalo como un borrador para conversar.</p>
          )}
          {ctx.can("forraje.revisar") && (
            <div className="border-t border-border">
              <RevisionForm brief={b.id} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/** Detalle de un brief guardado (TPA-71): resultado inmutable + revisiones del asesor. */
export default function BriefPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-hidden="true">
          <div className="h-[72px] rounded-[10px] border border-border bg-surface" />
          <div className="h-[320px] rounded-[var(--radius-card)] border border-border bg-surface" />
        </div>
      }
    >
      <Contenido params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
