import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Card, CardBody, CardHeader, MockNotice, Notice, PageHeader, Progress, buttonClass } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClock, IconExternal, IconEye, IconGlobe, IconLock } from "@/components/icons";
import { CopyButton } from "@/components/copy-button";
import { PerfilEditor } from "@/components/panel/perfil-editor";
import { requireContexto } from "@/lib/establecimiento";
import { getPerfilConfig } from "@/lib/data/perfil";
import { congelarSeccionAction, publicarPerfilAction } from "@/lib/perfil-actions";
import { DERIVADAS } from "@/lib/mock/perfil-panel";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Perfil público" };

const NOMBRE_SECCION: Record<string, string> = { rodeo: "Rodeo en números", sanidad: "Sanidad resumida", trazabilidad: "Trazabilidad" };
const fmt = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso)) : "";

async function Contenido({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  const nombre = ctx.activa.establecimiento_nombre ?? "Establecimiento";
  const { data: p, source } = await getPerfilConfig(ctx.activa.establecimiento_id, nombre);
  const url = `${SITE_URL}/es/p/${p.slug}`;
  const secciones = (p.secciones ?? {}) as Record<string, { activa?: boolean; congelada_en?: string | null }>;
  const contacto = (p.contacto_visible ?? {}) as Record<string, boolean>;
  const puedePublicar = ctx.can("perfil.publicar");
  const necesitaPreview = !p.preview_aceptada_en;

  return (
    <>
      <PageHeader
        title="Perfil público"
        subtitle="Cómo te ven los compradores en el directorio. Vos elegís qué se muestra."
        actions={
          p.publicado ? (
            <Badge tone="success" icon={<IconGlobe size={14} />}>
              Publicado
            </Badge>
          ) : (
            <Badge tone="neutral" icon={<IconLock size={14} />}>
              Sin publicar
            </Badge>
          )
        }
      />
      {source === "mock" && (
        <div className="mb-4">
          <MockNotice what="la configuración del perfil" />
        </div>
      )}
      {sp.publicado && <div className="mb-4"><Notice tone="success" title="Tu perfil está publicado">Ya aparece en el directorio y se puede compartir.</Notice></div>}
      {sp.despublicado && <div className="mb-4"><Notice tone="info" title="Perfil despublicado">Ya no se ve en el portal. Tus datos siguen en el panel.</Notice></div>}
      {sp.preview && <div className="mb-4"><Notice tone="success" title="Vista previa aceptada">Ya podés publicar tu perfil.</Notice></div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PerfilEditor
          slugBase="tropilla.ar/p/"
          perfil={{
            slug: p.slug ?? "",
            rowVersion: p.row_version ?? 0,
            enDirectorio: p.en_directorio !== false,
            secciones,
            historia: String(p.textos?.historia ?? ""),
            idiomas: p.idiomas ?? ["es"],
            contacto,
            ubicacion: p.ubicacion_publica ?? "departamento",
          }}
        />

        <div className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <Card>
            <CardHeader title={p.publicado ? "Tu perfil está en línea" : "Publicar"} />
            <CardBody className="space-y-4">
              {p.publicado && (
                <>
                  <input readOnly value={url} aria-label="Enlace del perfil" className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-base px-3 font-mono text-[12.5px] text-ink" />
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={url} />
                    <Link href={`/es/p/${p.slug}`} target="_blank" className={buttonClass("ghost", "md")}>
                      <IconExternal size={18} /> Abrir
                    </Link>
                  </div>
                </>
              )}
              <Link href="/perfil-publico/vista-previa" className={buttonClass(necesitaPreview && !p.publicado ? "primary" : "outline", "md", "w-full")}>
                <IconEye size={18} /> Ver vista previa como comprador
              </Link>
              {!p.publicado &&
                (necesitaPreview ? (
                  <p className="flex gap-2 text-[13px] text-muted">
                    <IconClock size={16} className="mt-0.5 shrink-0" /> Antes de la primera publicación tenés que mirar la vista previa y aceptarla.
                  </p>
                ) : null)}
              {puedePublicar ? (
                <form action={publicarPerfilAction}>
                  <input type="hidden" name="accion" value={p.publicado ? "despublicar" : "publicar"} />
                  <input type="hidden" name="slug" value={p.slug} />
                  <button
                    type="submit"
                    disabled={!p.publicado && necesitaPreview}
                    className={buttonClass(p.publicado ? "danger" : "primary", "md", "w-full")}
                  >
                    {p.publicado ? "Despublicar" : "Publicar perfil"}
                  </button>
                </form>
              ) : (
                <p className="text-[13px] text-muted">Publica el dueño o un administrador.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Completitud" description="Un perfil completo aparece más arriba en el directorio." />
            <CardBody className="space-y-3">
              <p className="flex items-baseline justify-between text-[13px] text-muted">
                Perfil completo <span className="text-[20px] font-bold tabular-nums text-ink">{p.completitud ?? 0} %</span>
              </p>
              <Progress value={p.completitud ?? 0} label="Completitud del perfil" />
              {!!p.faltantes?.length && (
                <ul className="space-y-2 pt-1">
                  {p.faltantes.map((x) => (
                    <li key={x} className="flex gap-2 text-[13.5px] text-ink">
                      <IconAlert size={16} className="mt-0.5 shrink-0 text-warning" /> {x}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Datos que se calculan solos" description="Se actualizan con lo que cargás. Congelá una sección para que muestre lo de hoy." />
            <ul className="divide-y divide-border">
              {DERIVADAS.map((s) => {
                const congelada = secciones[s]?.congelada_en;
                return (
                  <li key={s} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink">{NOMBRE_SECCION[s]}</p>
                      <p className="flex items-center gap-1 text-[12.5px] text-muted">
                        {congelada ? (
                          <>
                            <IconLock size={13} /> Congelada el {fmt(congelada)}
                          </>
                        ) : (
                          <>
                            <IconCheckCircle size={13} className="text-campo" /> Se actualiza sola
                          </>
                        )}
                      </p>
                    </div>
                    <form action={congelarSeccionAction}>
                      <input type="hidden" name="seccion" value={s} />
                      <input type="hidden" name="accion" value={congelada ? "descongelar" : "congelar"} />
                      <button type="submit" className={buttonClass("ghost", "sm")}>
                        {congelada ? "Descongelar" : "Congelar"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Configuración del perfil público (flujo 13, TPA-50). */
export default function PerfilPublicoPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<div className="h-[480px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido searchParams={props.searchParams} />
    </Suspense>
  );
}
