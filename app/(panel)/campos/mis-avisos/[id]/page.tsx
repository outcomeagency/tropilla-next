import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, DataList, EmptyState, Notice, PageHeader } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconEye, IconFence } from "@/components/icons";
import { Especies, EstadoAvisoBadge, VerificacionBadge, precioTexto, temporadaTexto, zonaTexto } from "@/components/panel/campos/comun";
import { DescargoForm, EstadoAvisoForm, VerificarForm } from "@/components/panel/campos/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { getCondicionesCampos, getMiAviso } from "@/lib/data/campos";
import { fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Aviso de campo" };

const OK: Record<string, string> = { creado: "Aviso guardado como borrador. Publicalo cuando esté listo.", publicado: "Aviso publicado: ya aparece en el mercado de campos." };
const DISPUTA: Record<string, string> = { abierta: "Abierto", en_revision: "En revisión", resuelta: "Resuelto", desestimada: "Desestimado" };

async function Contenido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [ctx, { id }, sp] = await Promise.all([requireContexto(), params, searchParams]);
  if (!ctx.can("campos.ver")) notFound();
  const [r, cond] = await Promise.all([getMiAviso(ctx.activa.establecimiento_id, id), getCondicionesCampos()]);
  if (r.estado === "no_encontrado") notFound();
  if (r.estado !== "ok" || cond.estado !== "ok") {
    return (
      <Card>
        <EmptyState icon={<IconFence size={24} />} title="No pudimos abrir el aviso" description={r.estado === "error" ? r.mensaje : "Probá de nuevo en unos minutos."} action={<Button href="/campos/mis-avisos">Volver</Button>} />
      </Card>
    );
  }
  const a = r.data;
  const c = cond.data;
  const puede = ctx.can("campos.gestionar");
  const disputas = a.disputas ?? [];

  return (
    <div className="space-y-6">
      {sp.ok && OK[sp.ok] && <Notice tone="success" title={OK[sp.ok]} />}
      {sp.error && <Notice tone="danger" title={sp.error.slice(0, 200)} />}
      {a.estado === "en_revision" && (
        <Notice tone="warning" title="Tu aviso está en revisión">
          Recibió varios reportes y no se muestra en el mercado hasta que el equipo de TROPILLA resuelva. Dejá tu descargo abajo.
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <EstadoAvisoBadge estado={a.estado} />
              <Badge tone="primary">{a.modalidad_nombre}</Badge>
              <Especies codigos={a.especies} />
              <VerificacionBadge v={a.verificacion} />
            </div>
            <h2 className="text-[22px] font-bold leading-tight text-ink">{a.titulo}</h2>
            <p className="text-[13.5px] text-muted">{zonaTexto(a.zona)}{a.publicado_en ? ` · Publicado ${fechaHora(a.publicado_en)}` : ""}</p>
            {a.verificacion_nota && <p className="text-[13px] text-muted">Nota de verificación: {a.verificacion_nota}</p>}
            <DataList
              items={[
                { label: "Capacidad declarada", value: `${nf.format(a.capacidad_cabezas)} cabezas` },
                { label: "Superficie", value: a.superficie_ha ? `${nf.format(Number(a.superficie_ha))} ha` : "Sin indicar" },
                { label: "Temporada", value: temporadaTexto(a) },
                { label: "Precio", value: precioTexto(a.precio) },
                { label: "Consultas abiertas", value: <span className="tabular-nums">{a.consultas_abiertas ?? 0} de {a.consultas_total ?? 0}</span> },
                { label: "Localidad en el aviso", value: a.mostrar_localidad ? "Visible" : "Oculta" },
              ]}
            />
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {puede && a.estado !== "cerrado" && (
                <Button href={`/campos/mis-avisos/${a.id}/editar`} variant="outline">
                  Editar
                </Button>
              )}
              {a.estado === "publicado" && (
                <Button href={`/campos/${a.id}`} variant="ghost" icon={<IconEye size={18} />}>
                  Ver como lo ven los demás
                </Button>
              )}
              <Button href="/campos/consultas" variant="ghost">
                Ver consultas
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {puede && a.estado !== "cerrado" && (
            <Card>
              <CardHeader title="Estado del aviso" description={a.estado === "borrador" ? "Todavía no se ve en el mercado." : undefined} />
              <CardBody>
                <EstadoAvisoForm id={a.id} estado={a.estado} motivosCierre={c.motivos_cierre} />
              </CardBody>
            </Card>
          )}
          {a.estado === "cerrado" && (
            <Notice tone="info" title={`Aviso cerrado${a.cerrado_en ? ` el ${fechaHora(a.cerrado_en)}` : ""}`}>
              {c.motivos_cierre.find((m) => m.codigo === a.motivo_cierre)?.nombre ?? (a.motivo_cierre === "moderacion" ? "Cerrado por moderación." : "")}
            </Notice>
          )}
          {ctx.me.usuario.es_staff && (
            <Card>
              <CardHeader title="Verificación (equipo TROPILLA)" />
              <CardBody>
                <VerificarForm aviso={a.id} niveles={c.verificacion} actual={a.verificacion?.nivel ?? "declarado"} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="Reportes sobre este aviso" description="No mostramos quién reportó. Podés dejar tu versión; el equipo de TROPILLA resuelve y te avisa." />
        {disputas.length ? (
          <ul className="divide-y divide-border">
            {disputas.map((d) => (
              <li key={d.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={d.estado === "abierta" || d.estado === "en_revision" ? "warning" : "neutral"} icon={<IconAlert size={14} />}>
                    {DISPUTA[d.estado] ?? d.estado}
                  </Badge>
                  <span className="text-[14px] font-semibold text-ink">{d.motivo_nombre}</span>
                  <span className="text-[12.5px] text-muted">{fechaHora(d.created_at)}</span>
                </div>
                <p className="text-[14px] text-ink">{d.detalle}</p>
                {d.descargo && (
                  <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-[13.5px] text-ink">
                    <span className="font-semibold">Tu descargo:</span> {d.descargo}
                  </p>
                )}
                {d.resolucion && (
                  <p className="text-[13.5px] text-muted">
                    <span className="font-semibold text-ink">Resolución:</span> {d.resolucion}
                  </p>
                )}
                {puede && !d.descargo && (d.estado === "abierta" || d.estado === "en_revision") && <DescargoForm aviso={a.id} disputa={d.id} />}
              </li>
            ))}
          </ul>
        ) : (
          <CardBody>
            <p className="text-[14px] text-muted">Sin reportes. Si alguien reporta un problema, te avisamos y podés responder acá.</p>
          </CardBody>
        )}
      </Card>
    </div>
  );
}

export default function MiAvisoPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  return (
    <>
      <PageHeader
        title="Aviso de campo"
        actions={
          <Button href="/campos/mis-avisos" variant="ghost" icon={<IconArrowLeft size={18} />}>
            Mis avisos
          </Button>
        }
      />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
