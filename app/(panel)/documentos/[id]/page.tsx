import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Card, CardBody, CardHeader, DataList, Notice, TrustBadge, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconExternal, IconEye, IconFile, IconGlobe, IconHash, IconLock } from "@/components/icons";
import { AccionesDocumento } from "@/components/panel/documentos/acciones";
import { PRIVACIDAD, VenceBadge, VisibilidadBadge } from "@/components/panel/documentos/badges";
import { requireContexto } from "@/lib/establecimiento";
import { ApiError } from "@/lib/api";
import { diasHasta, getDocumento, type DocumentoVersion } from "@/lib/data/documentos";
import { visibilidadDocumentoAction } from "@/lib/documento-actions";
import { ROL_LABEL } from "@/lib/auth";
import { fecha, fechaHora, hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Documento" };

type Params = { id: string };
type SP = { ok?: string };

const ACCION: Record<string, string> = { alta: "Alta", nueva_version: "Versión nueva", correccion_metadatos: "Corrección de datos", revocacion: "Revocación" };
const VINCULO_HREF: Record<string, (id: string) => string> = {
  animal: (id) => `/hacienda/${id}?tab=documentos`,
  lote: (id) => `/hacienda/lotes/${id}`,
  potrero: (id) => `/establecimiento/potreros/${id}`,
  evento: (id) => `/hacienda/eventos/${id}`,
};

const kb = (n?: number) => (!n ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** La huella es la evidencia; el enlace público sólo prueba integridad, no veracidad. */
function rutaVerificacion(url?: string | null, huella?: string | null) {
  if (url) {
    const m = url.match(/\/v\/([a-f0-9]{64})/);
    if (m) return `/es/v/${m[1]}`;
  }
  return huella ? `/es/v/${huella}` : null;
}

function Version({ v, ultima }: { v: DocumentoVersion; ultima: boolean }) {
  const autor = v.autor as { nombre?: string; rol?: string } | undefined;
  const archivo = v.archivos?.[0];
  return (
    <li className="relative pb-6 pl-8 last:pb-0">
      <span className={`absolute left-[7px] top-1.5 h-3 w-3 rounded-full border-2 ${v.accion === "revocacion" ? "border-danger bg-danger-bg" : ultima ? "border-monte bg-monte" : "border-border-strong bg-surface"}`} aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14.5px] font-semibold text-ink">
          v{v.version} · {ACCION[v.accion ?? ""] ?? v.accion}
        </span>
        {ultima && v.accion !== "revocacion" && <Badge tone="success">Vigente</Badge>}
        <TrustBadge nivel={v.confianza ?? "declarado"} />
      </div>
      <p className="mt-0.5 text-[12.5px] text-muted">
        {fechaHora(v.registrado_en ?? v.creado_en)}
        {autor?.nombre ? ` · ${autor.nombre}` : ""}
        {autor?.rol ? ` (${ROL_LABEL[autor.rol as keyof typeof ROL_LABEL] ?? autor.rol})` : ""}
      </p>
      {v.motivo && <p className="mt-1.5 rounded-[8px] border border-border bg-base px-3 py-2 text-[13.5px] text-ink">«{v.motivo}»</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
        {archivo?.sha256 && (
          <a href={`/documentos/archivo/${archivo.sha256}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-campo hover:underline">
            <IconFile size={14} /> {archivo.mime === "application/pdf" ? "PDF" : "Foto"} {kb(archivo.bytes)}
          </a>
        )}
        {v.huella && (
          <Link href={`/es/v/${v.huella}`} target="_blank" className="inline-flex items-center gap-1 font-mono text-muted hover:text-ink">
            <IconHash size={13} /> {v.huella.slice(0, 16)}…
          </Link>
        )}
        {v.vence_en && <span className="text-muted">Vence {fecha(v.vence_en)}</span>}
      </div>
    </li>
  );
}

async function Contenido({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await connection();
  let d;
  try {
    d = await getDocumento(ctx.activa.establecimiento_id, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  const hoy = hoyAR(new Date());
  const versiones = [...(d.versiones ?? [])].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const vigente = versiones[0];
  const archivo = vigente?.archivos?.[0];
  const esImagen = archivo?.mime?.startsWith("image/");
  const revocado = d.estado === "revocado";
  const fiscal = d.privacidad === "fiscal";
  const verif = rutaVerificacion(d.verificacion_url, vigente?.huella);
  const puedePublicar = ctx.can("documentos.publicar") && !fiscal && !revocado;

  return (
    <>
      <Link href="/documentos" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Documentos
      </Link>
      {sp.ok === "creado" && (
        <div className="mb-4">
          <Notice tone="success" title="Documento guardado.">
            Quedó como versión 1 con su huella. Si cambia, subí una versión nueva: la anterior queda en la historia.
          </Notice>
        </div>
      )}
      {revocado && (
        <div className="mb-4">
          <Notice tone="warning" title="Documento revocado">
            Ya no cuenta como vigente ni se muestra en el perfil. Su historia y su huella se conservan.
          </Notice>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
          <div className="flex min-w-0 gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border border-border bg-crema text-monte">
              <IconFile size={24} />
            </span>
            <div className="min-w-0">
              <h1 className={`text-[24px] font-bold leading-tight tracking-[-0.02em] ${revocado ? "text-muted line-through" : "text-ink"}`}>{d.titulo}</h1>
              <p className="mt-0.5 text-[14px] text-muted">
                {d.tipo_nombre} · {PRIVACIDAD[d.privacidad ?? ""] ?? d.privacidad} · versión {d.version_vigente ?? 1}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <VenceBadge vence={d.vence_en} dias={diasHasta(d.vence_en, hoy)} estado={d.estado} />
                <VisibilidadBadge visibilidad={d.visibilidad} />
                <TrustBadge nivel={d.confianza ?? "declarado"} />
              </div>
            </div>
          </div>
          <AccionesDocumento
            doc={{ id: d.id ?? "", titulo: d.titulo ?? "", emisor: d.emisor_nombre ?? null, emitido: d.emitido_en ?? null, vence: d.vence_en ?? null }}
            puedeVersionar={ctx.can("documentos.versionar")}
            revocado={revocado}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="Archivo vigente"
              action={
                archivo?.sha256 ? (
                  <a href={`/documentos/archivo/${archivo.sha256}`} target="_blank" rel="noopener" className={buttonClass("outline", "sm")}>
                    <IconExternal size={16} /> Abrir
                  </a>
                ) : undefined
              }
            />
            {archivo?.sha256 && esImagen ? (
              <div className="bg-base p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL prefirmada de 5 min: no pasa por el optimizador */}
                <img src={`/documentos/archivo/${archivo.sha256}`} alt={d.titulo ?? "Documento"} className="mx-auto max-h-[520px] rounded-[8px] border border-border object-contain" />
              </div>
            ) : archivo?.sha256 ? (
              <a href={`/documentos/archivo/${archivo.sha256}`} target="_blank" rel="noopener" className="flex items-center gap-4 px-5 py-5 hover:bg-surface-2">
                <span className="grid h-14 w-11 shrink-0 place-items-center rounded-[6px] border border-border-strong bg-surface text-[11px] font-bold text-danger">PDF</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">Abrir el PDF</span>
                  <span className="block text-[12.5px] text-muted">
                    {kb(archivo.bytes)} · se abre en otra pestaña con un enlace que dura 5 minutos
                    {archivo.estado === "pendiente" ? " · todavía subiendo desde el teléfono" : ""}
                  </span>
                </span>
              </a>
            ) : (
              <p className="px-5 py-5 text-[14px] text-muted">El archivo todavía no llegó: se está subiendo desde el teléfono.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Historia" description="Cada versión, corrección o revocación queda con su motivo, autor y huella. Nada se borra." />
            <CardBody>
              <ol className="relative before:absolute before:bottom-2 before:left-[12px] before:top-2 before:w-px before:bg-border">
                {versiones.map((v, i) => (
                  <Version key={v.id} v={v} ultima={i === 0} />
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Datos" />
            <CardBody>
              <DataList
                className="sm:grid-cols-1"
                items={[
                  { label: "Emitido por (declarado)", value: d.emisor_nombre ?? "—" },
                  { label: "Fecha de emisión", value: fecha(d.emitido_en) || "—" },
                  { label: "Vencimiento", value: fecha(d.vence_en) || "Sin vencimiento" },
                  {
                    label: "Vinculado a",
                    value: (d.vinculos ?? []).filter((v) => v.tipo !== "establecimiento").length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {(d.vinculos ?? [])
                          .filter((v) => v.tipo !== "establecimiento")
                          .map((v) =>
                            VINCULO_HREF[v.tipo ?? ""] && v.id ? (
                              <Link key={v.id} href={VINCULO_HREF[v.tipo ?? ""](v.id)} className="rounded-[6px] border border-border bg-base px-2 py-0.5 text-[13px] text-ink hover:border-campo">
                                {v.etiqueta ?? v.tipo}
                              </Link>
                            ) : (
                              <span key={v.id} className="rounded-[6px] border border-border bg-base px-2 py-0.5 text-[13px]">
                                {v.etiqueta ?? v.tipo}
                              </span>
                            ),
                          )}
                      </span>
                    ) : (
                      "Establecimiento"
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Integridad" description="Prueba que el archivo y sus datos no cambiaron desde que se registraron. No certifica su contenido." />
            <CardBody className="space-y-3">
              {vigente?.huella && <p className="break-all rounded-[8px] border border-border bg-base px-3 py-2 font-mono text-[12px] text-ink">{vigente.huella}</p>}
              {verif && (
                <Link href={verif} target="_blank" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-campo hover:underline">
                  <IconEye size={16} /> Ver la verificación pública
                </Link>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Visibilidad" />
            <CardBody className="space-y-3 text-[13.5px]">
              {fiscal ? (
                <p className="flex gap-2 text-muted">
                  <IconLock size={16} className="mt-0.5 shrink-0" /> Es fiscal: privado siempre. Nunca se muestra en el perfil ni en ofertas.
                </p>
              ) : (
                <>
                  <p className="text-muted">
                    {d.visibilidad === "perfil"
                      ? "Se muestra en tu perfil público con su nivel de confianza y el enlace a la verificación (sin el archivo)."
                      : "Sólo lo ve el equipo del establecimiento. Podés mostrarlo en el perfil público o compartirlo por un enlace que vence."}
                  </p>
                  {puedePublicar && (
                    <form action={visibilidadDocumentoAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="row_version" value={d.row_version ?? 1} />
                      <input type="hidden" name="visibilidad" value={d.visibilidad === "perfil" ? "privado" : "perfil"} />
                      <button type="submit" className={buttonClass(d.visibilidad === "perfil" ? "outline" : "secondary", "sm")}>
                        {d.visibilidad === "perfil" ? (
                          <>
                            <IconLock size={16} /> Volver a privado
                          </>
                        ) : (
                          <>
                            <IconGlobe size={16} /> Mostrar en el perfil
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Ficha de un documento: archivo vigente, historia de versiones, integridad y visibilidad (TPA-36). */
export default function DocumentoPage(props: { params: Promise<Params>; searchParams: Promise<SP> }) {
  return (
    <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
