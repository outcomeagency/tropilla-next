import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Button, Card, CardHeader, EmptyState, FilterTabs, PageHeader, Table, Td, Th, Tr, TrustInline, buttonClass, inputClass } from "@/components/ui";
import { IconAlert, IconChevronRight, IconFile, IconSearch, IconShare, IconUpload } from "@/components/icons";
import { PRIVACIDAD, VenceBadge, VisibilidadBadge } from "@/components/panel/documentos/badges";
import { requireContexto } from "@/lib/establecimiento";
import { diasHasta, listDocumentos, listVencimientos, type FiltrosDocumentos } from "@/lib/data/documentos";
import { fecha, hoyAR, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Documentos" };

type SP = { q?: string; vista?: string; privacidad?: string; cursor?: string };

function href(sp: SP, c: Partial<SP>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, cursor: undefined, ...c })) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/documentos?${s}` : "/documentos";
}

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  await connection();
  const est = ctx.activa.establecimiento_id;
  const hoy = hoyAR(new Date());
  const f: FiltrosDocumentos = { q: sp.q?.slice(0, 80), privacidad: sp.privacidad, cursor: sp.cursor };
  if (sp.vista === "vencidos") f.estado = "vencido";
  if (sp.vista === "por_vencer") {
    f.estado = "vigente";
    f.vence_antes = sumarDias(hoy, 30);
  }
  if (sp.vista === "perfil") f.visibilidad = "perfil";
  if (sp.vista === "revocados") f.estado = "revocado";
  const [lista, venc] = await Promise.all([listDocumentos(est, f), listVencimientos(est, 30).catch(() => [])]);
  const docs = lista.data;
  const vencidos = venc.filter((d) => (diasHasta(d.vence_en, hoy) ?? 0) < 0);
  const porVencer = venc.filter((d) => (diasHasta(d.vence_en, hoy) ?? 0) >= 0);
  const puedeCrear = ctx.can("documentos.crear");
  const filtrado = !!(sp.q || sp.vista || sp.privacidad);

  return (
    <>
      {venc.length > 0 && !sp.vista && (
        <Card className="mb-4 overflow-hidden border-warning-border">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <IconAlert size={18} className="text-warning" />
                {vencidos.length ? `${vencidos.length} ${vencidos.length === 1 ? "vencido" : "vencidos"}` : ""}
                {vencidos.length && porVencer.length ? " · " : ""}
                {porVencer.length ? `${porVencer.length} por vencer en 30 días` : ""}
              </span>
            }
            description="Pedí la nueva constancia a quien la emite y subila como versión nueva: la anterior queda en la historia."
          />
          <ul className="divide-y divide-border">
            {venc.slice(0, 6).map((d) => (
              <li key={d.id}>
                <Link href={`/documentos/${d.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{d.titulo}</span>
                    <span className="block text-[12.5px] text-muted">
                      {d.tipo_nombre}
                      {d.emisor_nombre ? ` · ${d.emisor_nombre}` : ""}
                    </span>
                  </span>
                  <VenceBadge vence={d.vence_en} dias={diasHasta(d.vence_en, hoy)} estado={d.estado} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <FilterTabs
            label="Vista"
            items={[
              { href: href(sp, { vista: undefined }), label: "Todos", active: !sp.vista },
              { href: href(sp, { vista: "por_vencer" }), label: "Por vencer", active: sp.vista === "por_vencer", count: porVencer.length || undefined },
              { href: href(sp, { vista: "vencidos" }), label: "Vencidos", active: sp.vista === "vencidos", count: vencidos.length || undefined },
              { href: href(sp, { vista: "perfil" }), label: "En el perfil", active: sp.vista === "perfil" },
              { href: href(sp, { vista: "revocados" }), label: "Revocados", active: sp.vista === "revocados" },
            ]}
          />
          <form action="/documentos" role="search" className="relative ml-auto w-full sm:w-[280px]">
            {sp.vista && <input type="hidden" name="vista" value={sp.vista} />}
            <label htmlFor="doc-q" className="sr-only">
              Buscar documentos
            </label>
            <IconSearch size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input id="doc-q" name="q" type="search" defaultValue={sp.q} placeholder="Título, emisor o tipo" className={`${inputClass} h-10 pl-9 text-[14px]`} />
          </form>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-border px-5 py-2.5">
          {[undefined, "sanitario", "comercial", ...(ctx.can("documentos.fiscal") ? ["fiscal"] : []), "general"].map((p) => (
            <Link
              key={p ?? "todas"}
              href={href(sp, { privacidad: p })}
              className={`rounded-full border px-3 py-1 text-[12.5px] font-medium ${sp.privacidad === p ? "border-monte bg-monte text-blanco" : "border-border bg-surface text-muted hover:text-ink"}`}
            >
              {p ? PRIVACIDAD[p] : "Todas las categorías"}
            </Link>
          ))}
        </div>

        {docs.length === 0 ? (
          filtrado ? (
            <EmptyState
              icon={<IconSearch size={24} />}
              title="Ningún documento coincide"
              description="Probá con otra vista o sacá la búsqueda."
              action={
                <Button href="/documentos" variant="outline">
                  Ver todos
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<IconFile size={24} />}
              title="Tu carpeta de documentos está vacía"
              description="Subí el PDF o la foto del acta de aftosa, la constancia de RENSPA o el informe del laboratorio: elegís el tipo, el vencimiento y a qué lote o animal corresponde. Cada versión queda con su huella; nada se pisa ni se borra. Desde la app podés sacarle foto en el campo, aunque no haya señal."
              action={
                puedeCrear ? (
                  <Button href="/documentos/nuevo" icon={<IconUpload size={18} />}>
                    Subir el primero
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <Table minWidth={1000}>
            <thead>
              <tr>
                <Th>Documento</Th>
                <Th>Vinculado a</Th>
                <Th>Emitido</Th>
                <Th>Vencimiento</Th>
                <Th>Confianza</Th>
                <Th>Visibilidad</Th>
                <Th>
                  <span className="sr-only">Abrir</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <Tr key={d.id}>
                  <Td className="min-w-[240px]">
                    <Link href={`/documentos/${d.id}`} className={`font-semibold hover:text-campo hover:underline ${d.estado === "revocado" ? "text-muted line-through" : "text-ink"}`}>
                      {d.titulo}
                    </Link>
                    <span className="block text-[12.5px] text-muted">
                      {d.tipo_nombre} · {PRIVACIDAD[d.privacidad ?? ""] ?? d.privacidad}
                      {(d.version_vigente ?? 1) > 1 && ` · v${d.version_vigente}`}
                    </span>
                  </Td>
                  <Td className="max-w-[220px] text-[13px]">
                    {(d.vinculos ?? []).filter((v) => v.tipo !== "establecimiento").length ? (
                      <span className="flex flex-wrap gap-1">
                        {(d.vinculos ?? [])
                          .filter((v) => v.tipo !== "establecimiento")
                          .slice(0, 3)
                          .map((v) => (
                            <span key={`${v.tipo}${v.id}`} className="rounded-[6px] border border-border bg-base px-1.5 py-0.5 text-[12px] text-ink">
                              {v.etiqueta ?? v.tipo}
                            </span>
                          ))}
                      </span>
                    ) : (
                      <span className="text-muted">Establecimiento</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[13.5px] tabular-nums">
                    {fecha(d.emitido_en) || <span className="text-subtle">—</span>}
                    {d.emisor_nombre && <span className="block max-w-[160px] truncate text-[12px] text-muted">{d.emisor_nombre}</span>}
                  </Td>
                  <Td>
                    <VenceBadge vence={d.vence_en} dias={diasHasta(d.vence_en, hoy)} estado={d.estado} />
                  </Td>
                  <Td>
                    <TrustInline nivel={d.confianza ?? "declarado"} />
                  </Td>
                  <Td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <VisibilidadBadge visibilidad={d.visibilidad} />
                      {(d.enlaces_activos ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-muted" title="Enlaces compartidos activos">
                          <IconShare size={13} /> {nf.format(d.enlaces_activos ?? 0)}
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td className="w-10">
                    <Link href={`/documentos/${d.id}`} aria-label={`Abrir ${d.titulo}`} className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-surface-2">
                      <IconChevronRight size={18} />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        {lista.meta?.next_cursor && (
          <div className="border-t border-border px-5 py-3">
            <Link href={`${href(sp, {})}${href(sp, {}).includes("?") ? "&" : "?"}cursor=${encodeURIComponent(lista.meta.next_cursor)}`} className={buttonClass("ghost", "sm")}>
              Ver más documentos
            </Link>
          </div>
        )}
      </Card>
    </>
  );
}

/** Carpeta documental con versiones y vencimientos (TPA-36). */
export default function DocumentosPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle="Actas, constancias, informes y comprobantes, con sus versiones y vencimientos."
        actions={
          <Suspense fallback={null}>
            <Accion />
          </Suspense>
        }
      />
      <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Accion() {
  const ctx = await requireContexto();
  if (!ctx.can("documentos.crear")) return null;
  return (
    <Button href="/documentos/nuevo" icon={<IconUpload size={18} />}>
      Subir documento
    </Button>
  );
}
