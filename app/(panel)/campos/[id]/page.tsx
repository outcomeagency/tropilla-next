import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, DataList, EmptyState, Notice, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconFence, IconPin } from "@/components/icons";
import { CompatibilidadResumen, Especies, EstadoAvisoBadge, EstadoConsultaBadge, LimitesCampos, VerificacionBadge, precioTexto, temporadaTexto, zonaTexto } from "@/components/panel/campos/comun";
import { ConsultaForm, ReporteForm } from "@/components/panel/campos/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { getAvisoMercado, getCondicionesCampos } from "@/lib/data/campos";
import { getCatalogos } from "@/lib/data/catalogos";
import { fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Aviso de campo" };

const ESPECIE_NOMBRE: Record<string, string> = { BOV: "Bovinos", BUB: "Búfalos" };

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const [ctx, { id }] = await Promise.all([requireContexto(), params]);
  const est = ctx.can("campos.ver") ? ctx.activa.establecimiento_id : undefined;
  const [r, cond, cat] = await Promise.all([getAvisoMercado(id, est), getCondicionesCampos(), getCatalogos()]);
  if (r.estado === "no_encontrado") notFound();
  if (r.estado !== "ok" || cond.estado !== "ok") {
    return (
      <Card>
        <EmptyState icon={<IconFence size={24} />} title="No pudimos abrir el aviso" description={r.estado === "error" ? r.mensaje : "Probá de nuevo en unos minutos."} action={<Button href="/campos">Volver al mercado</Button>} />
      </Card>
    );
  }
  const a = r.data;
  const c = cond.data;
  const opc = (lista: Array<{ codigo: string; nombre: string }>, codigos?: string[]) =>
    (codigos ?? []).map((x) => lista.find((o) => o.codigo === x)?.nombre ?? x).join(", ") || "Sin indicar";
  const catNombre = new Map(cat.categorias.map((x) => [x.codigo, x.nombre ?? x.codigo]));
  const mia = a.mi_consulta;
  const consultaAbierta = mia && ["enviada", "respondida", "visita_coordinada"].includes(mia.estado);
  const puedeConsultar = ctx.can("campos.consultar") && !a.propio && a.estado === "publicado";

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{a.modalidad_nombre}</Badge>
              <Especies codigos={a.especies} />
              <VerificacionBadge v={a.verificacion} />
              {a.estado !== "publicado" && <EstadoAvisoBadge estado={a.estado} />}
            </div>
            <h2 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-ink">{a.titulo}</h2>
            <p className="flex items-center gap-1.5 text-[14px] text-muted">
              <IconPin size={15} className="shrink-0" />
              {zonaTexto(a.zona)}
            </p>
            <p className="text-[13.5px] text-muted">
              Publicado por <span className="font-semibold text-ink">{a.publicado_por?.establecimiento}</span>
              {a.publicado_por?.perfil_slug && (
                <>
                  {" · "}
                  <Link href={`/es/p/${a.publicado_por.perfil_slug}`} className="text-campo underline">
                    ver perfil público
                  </Link>
                </>
              )}
              {a.publicado_en && ` · ${fechaHora(a.publicado_en)}`}
            </p>
            <p className="text-[13px] text-muted">{a.verificacion?.detalle}</p>
            {a.descripcion && <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{a.descripcion}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Datos del campo" description="Declarados por quien publica. Confirmalos en la visita." />
          <CardBody>
            <DataList
              items={[
                { label: "Capacidad declarada", value: <span className="tabular-nums">{nf.format(a.capacidad_cabezas)} cabezas</span> },
                { label: "Superficie", value: a.superficie_ha ? <span className="tabular-nums">{nf.format(Number(a.superficie_ha))} ha</span> : "Sin indicar" },
                { label: "Temporada", value: temporadaTexto(a) },
                { label: "Plazo mínimo", value: a.plazo_minimo_meses ? `${a.plazo_minimo_meses} meses` : "Sin indicar" },
                { label: "Precio", value: precioTexto(a.precio) },
                { label: "Especies", value: a.especies.map((e) => ESPECIE_NOMBRE[e] ?? e).join(" y ") },
                { label: "Categorías", value: a.categorias?.length ? a.categorias.map((x) => catNombre.get(x) ?? x).join(", ") : "Cualquiera" },
                { label: "Agua", value: opc(c.agua, a.agua) },
                { label: "Alambrado", value: opc(c.alambrado, a.alambrado ? [a.alambrado] : []) },
                { label: "Instalaciones", value: opc(c.instalaciones, a.instalaciones) },
                { label: "Accesos", value: a.accesos ?? "Sin indicar" },
              ]}
            />
            {a.condiciones && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-[12px] font-medium text-muted">Otras condiciones</p>
                <p className="mt-1 whitespace-pre-line text-[14.5px] text-ink">{a.condiciones}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Checklist antes de mandar hacienda" description="Diligencias a cargo de las partes. TROPILLA no es parte del contrato." />
          <CardBody>
            <ol className="space-y-2 text-[14px] text-ink">
              {(a.checklist ?? c.checklist).map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-campo-50 text-[12px] font-semibold text-monte tabular-nums">{i + 1}</span>
                  <span className="pt-0.5">{t}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>

      <aside className="space-y-4">
        {a.compatibilidad && (
          <Card>
            <CardHeader title="Con tu rodeo" />
            <CardBody>
              <CompatibilidadResumen c={a.compatibilidad} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title={mia ? "Tu consulta" : "Consultar por este campo"} />
          <CardBody className="space-y-4">
            {a.propio ? (
              <p className="text-[14px] text-muted">
                Es un aviso de tu establecimiento. <Link href={`/campos/mis-avisos/${a.id}`} className="font-semibold text-campo underline">Gestionarlo</Link>
              </p>
            ) : mia ? (
              <div className="space-y-2 text-[14px]">
                <EstadoConsultaBadge estado={mia.estado} label={mia.estado_nombre} />
                <p className="text-muted">
                  Enviada el {fechaHora(mia.created_at)} por {nf.format(mia.cabezas)} cabezas.
                </p>
                {mia.respuesta && <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-ink">{mia.respuesta}</p>}
                {mia.contacto && (
                  <p className="text-ink">
                    Contacto: <span className="font-semibold">{mia.contacto.nombre}</span>
                    {mia.contacto.telefono && ` · ${mia.contacto.telefono}`}
                    {mia.contacto.email && ` · ${mia.contacto.email}`}
                  </p>
                )}
                <Button href="/campos/consultas?lado=enviadas" variant="outline" size="sm">
                  Ver mis consultas
                </Button>
              </div>
            ) : null}
            {puedeConsultar && !consultaAbierta && (
              <ConsultaForm
                aviso={a.id}
                especies={a.especies.map((e) => ({ codigo: e, nombre: ESPECIE_NOMBRE[e] ?? e }))}
                especieSugerida={a.compatibilidad?.especie ?? undefined}
                cabezasSugeridas={a.compatibilidad?.cabezas_requeridas || undefined}
              />
            )}
            {!puedeConsultar && !a.propio && !mia && (
              <p className="text-[14px] text-muted">
                {a.estado !== "publicado" ? "Este aviso no está publicado." : "Consultar campos lo hacen el dueño o la administración del establecimiento."}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <LimitesCampos avisos={a.avisos ?? c.avisos} />
            {!a.propio && (
              <div className="border-t border-border pt-3">
                {a.reportado ? (
                  <Badge tone="info" icon={<IconCheckCircle size={14} />}>
                    Ya reportaste este aviso: está en revisión
                  </Badge>
                ) : (
                  <ReporteForm aviso={a.id} motivos={c.motivos_disputa} consultaId={mia?.id} />
                )}
              </div>
            )}
          </CardBody>
        </Card>
        {a.estado === "en_revision" && <Notice tone="warning" title="Aviso en revisión">El equipo de TROPILLA está revisando reportes sobre este aviso.</Notice>}
      </aside>
    </div>
  );
}

export default function AvisoMercadoPage(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader
        title="Campos y pastajes"
        actions={
          <Button href="/campos" variant="ghost" icon={<IconArrowLeft size={18} />}>
            Volver al mercado
          </Button>
        }
      />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido params={props.params} />
      </Suspense>
    </>
  );
}
