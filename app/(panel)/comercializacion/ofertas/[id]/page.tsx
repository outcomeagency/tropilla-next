import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Card, CardBody, CardHeader, MockNotice, Notice, PageHeader, SpeciesChip, TrustBadge, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconCheckCircle, IconExternal, IconFile, IconMessage, IconWhatsapp } from "@/components/icons";
import { CopyButton } from "@/components/copy-button";
import { Qr } from "@/components/qr";
import { EstadoOfertaBadge, PasosOferta } from "@/components/panel/ofertas/estado";
import { OfertaEditor } from "@/components/panel/ofertas/editor";
import { PublishForm } from "@/components/panel/ofertas/publish-form";
import { requireContexto } from "@/lib/establecimiento";
import { getAvisos, getOferta } from "@/lib/data/ofertas";
import { cambiarEstadoOfertaAction } from "@/lib/oferta-actions";
import { mockLote } from "@/lib/mock/ofertas-panel";
import { categoriaNombre, razaNombre } from "@/lib/catalogo";
import { especieDe } from "@/lib/types";
import { SITE_URL } from "@/lib/site";
import type { S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Oferta" };

type Sanidad = { evento: string; detalle: string; fecha: string; confianza: "declarado" | "integridad_registrada" };
const fmt = (iso?: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

function Registrado({ o }: { o: S<"Oferta"> }) {
  const lote = o.lote_id ? mockLote(o.lote_id) : null;
  const pre = (o.precarga ?? {}) as { peso_promedio_kg?: string; peso_fecha?: string; edad_min?: number; edad_max?: number; sanidad?: Sanidad[] };
  const peso = pre.peso_promedio_kg ?? lote?.peso_promedio_kg;
  const pesoFecha = pre.peso_fecha ?? lote?.peso_promedio_fecha;
  const sanidad = pre.sanidad ?? lote?.extra.sanidad ?? [];
  const edad = pre.edad_min ? { min: pre.edad_min, max: pre.edad_max } : lote?.extra.edad;
  return (
    <Card>
      <CardHeader title="Lo que viene del registro" description="Sale de los eventos del lote. Para cambiarlo, cargá un pesaje o evento nuevo." />
      <CardBody className="space-y-4 text-[14px]">
        <div className="flex flex-wrap items-center gap-2">
          <SpeciesChip especie={especieDe(o.especie)} withIcon />
          {o.categorias?.map((c) => <Badge key={c}>{categoriaNombre(c)}</Badge>)}
          {o.razas?.map((r) => <Badge key={r}>{razaNombre(r)}</Badge>)}
        </div>
        {lote && <p className="text-muted">Lote: <span className="font-medium text-ink">{lote.nombre}</span></p>}
        {peso && (
          <div>
            <p className="font-semibold text-ink">{peso} kg promedio</p>
            <div className="mt-1">
              <TrustBadge nivel="integridad_registrada" detail={`Balanza ${fmt(pesoFecha)}`} />
            </div>
          </div>
        )}
        {edad && <p className="text-ink">{edad.min}–{edad.max} meses</p>}
        {sanidad.length > 0 && (
          <ul className="space-y-2 border-t border-border pt-3">
            {sanidad.map((s) => (
              <li key={`${s.evento}${s.fecha}`} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium text-ink">{s.evento}</span> <span className="text-muted">· {s.detalle} · {fmt(s.fecha)}</span>
                </span>
                <TrustBadge nivel={s.confianza} />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

async function Detalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paso?: string; publicada?: string }> }) {
  const ctx = await requireContexto();
  const { id } = await params;
  const { paso, publicada } = await searchParams;
  const res = await getOferta(ctx.activa.establecimiento_id, id);
  if (!res) notFound();
  const o = res.data;
  const titulo = String(o.textos?.titulo ?? categoriaNombre(o.categorias?.[0] ?? ""));
  const mock = res.source === "mock" && <div className="mb-4"><MockNotice what="Las ofertas" /></div>;

  /* ── Borrador: datos y qué se muestra ── */
  if (o.estado === "borrador" && paso !== "publicar") {
    const cond = (o.condiciones ?? {}) as EditorCond;
    const lote = o.lote_id ? mockLote(o.lote_id) : null;
    return (
      <>
        <PageHeader title={titulo} subtitle="Borrador · todavía no lo ve nadie." actions={<EstadoOfertaBadge estado={o.estado} />} />
        <PasosOferta actual={1} />
        {mock}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <OfertaEditor
            id={o.id ?? id}
            rowVersion={o.row_version ?? 0}
            titulo={titulo}
            cantidad={o.cantidad ?? 1}
            maxCantidad={lote ? (lote.cabezas_individuales ?? 0) + (lote.cabezas_anonimas ?? 0) : undefined}
            sistema={String(o.textos?.sistema ?? "")}
            descripcion={String(o.textos?.descripcion ?? "")}
            mostrar={(o.mostrar ?? {}) as Record<string, boolean>}
            condiciones={cond}
            puedePrecio={ctx.can("comercial.precios")}
          />
          <div className="space-y-4 xl:sticky xl:top-8 xl:self-start">
            <Registrado o={o} />
          </div>
        </div>
      </>
    );
  }

  /* ── Borrador: revisar avisos y publicar ── */
  if (o.estado === "borrador") {
    const avisos = await getAvisos(ctx.activa.establecimiento_id, o, res.source);
    return (
      <>
        <PageHeader title={titulo} subtitle="Revisá los avisos y cómo la va a ver el comprador." actions={<EstadoOfertaBadge estado={o.estado} />} />
        <PasosOferta actual={2} />
        {mock}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <Card>
              <CardHeader title="Avisos antes de publicar" description="Advierten, no bloquean: decidís vos." />
              {avisos.length ? (
                <ul className="divide-y divide-border">
                  {avisos.map((a) => (
                    <li key={a.codigo} className="flex items-start gap-3 px-5 py-4">
                      <IconAlert size={20} className="mt-0.5 shrink-0 text-warning" />
                      <p className="flex-1 text-[14px] text-ink">{a.mensaje}</p>
                      {a.corregir && (
                        <Link href={a.corregir} className={buttonClass("outline", "sm")}>
                          Corregir
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 px-5 py-4 text-[14px] text-success">
                  <IconCheckCircle size={18} /> Sin avisos: no hay retiros vigentes, reactores, documentos vencidos ni pesajes viejos.
                </p>
              )}
            </Card>
            <Registrado o={o} />
            <Link href={`/comercializacion/ofertas/${o.id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
              <IconArrowLeft size={16} /> Volver a editar
            </Link>
          </div>
          <Card className="xl:sticky xl:top-8 xl:self-start">
            <CardHeader title="Publicar" />
            <CardBody>
              <PublishForm id={o.id ?? id} hayAvisos={avisos.length > 0} puede={ctx.can("ofertas.publicar")} />
            </CardBody>
          </Card>
        </div>
      </>
    );
  }

  /* ── Publicada / reservada / vendida / retirada: compartir ── */
  const codigo = o.codigo_publico ?? "";
  const url = `${SITE_URL}/es/ofertas/${codigo}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${titulo} — mirá la ficha completa: ${url}`)}`;
  const estados: Array<{ v: S<"EstadoOfertaInput">["estado"]; l: string }> =
    o.estado === "publicada"
      ? [
          { v: "reservada", l: "Marcar reservada" },
          { v: "vendida", l: "Marcar vendida" },
          { v: "retirada", l: "Retirar del portal" },
        ]
      : [{ v: "publicada", l: "Volver a publicar" }, ...(o.estado !== "vendida" ? [{ v: "vendida" as const, l: "Marcar vendida" }] : [])];

  return (
    <>
      <PageHeader
        title={titulo}
        subtitle={`Código ${codigo} · Publicación v${o.publicacion_vigente ?? 1}`}
        actions={<EstadoOfertaBadge estado={o.estado} />}
      />
      <PasosOferta actual={3} />
      {mock}
      {publicada && (
        <div className="mb-4">
          <Notice tone="success" title="Tu oferta está publicada">
            Ya tiene enlace, QR y ficha. Compartila por WhatsApp: el comprador no necesita cuenta para consultar.
          </Notice>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Compartí tu oferta" description="Mismo enlace en español, inglés y portugués: cada comprador la ve en su idioma." />
            <CardBody className="space-y-4">
              <label htmlFor="url-publica" className="sr-only">Enlace público</label>
              <input id="url-publica" readOnly value={url} className="h-11 w-full rounded-[var(--radius-control)] border border-border bg-base px-3 font-mono text-[13.5px] text-ink" />
              <div className="flex flex-wrap gap-2">
                <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
                  <IconWhatsapp size={18} /> Compartir por WhatsApp
                </a>
                <CopyButton value={url} />
                <Link href={`/es/ofertas/${codigo}`} target="_blank" className={buttonClass("ghost", "md")}>
                  <IconExternal size={18} /> Ver como comprador
                </Link>
                {o.pdf?.url && (
                  <a href={o.pdf.url} className={buttonClass("ghost", "md")}>
                    <IconFile size={18} /> Ficha PDF
                  </a>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Estado de la oferta" description="Reservada y vendida se muestran en el portal; retirada deja de verse." />
            <CardBody className="flex flex-wrap gap-2">
              {estados.map((e) => (
                <form key={e.v} action={cambiarEstadoOfertaAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="estado" value={e.v} />
                  <button type="submit" className={buttonClass(e.v === "retirada" ? "danger" : "outline", "sm")}>
                    {e.l}
                  </button>
                </form>
              ))}
            </CardBody>
          </Card>
          <Card>
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-campo-50 text-monte">
                <IconMessage size={22} />
              </span>
              <div className="flex-1">
                <p className="text-[22px] font-bold tabular-nums text-ink">{o.consultas_count ?? 0}</p>
                <p className="text-[13px] text-muted">consultas de compradores por esta oferta</p>
              </div>
            </div>
          </Card>
        </div>
        <Card className="xl:self-start">
          <CardHeader title="QR de la oferta" description="Para imprimir en el remate, la tranquera o el camión." />
          <CardBody className="flex flex-col items-center gap-3">
            <div className="rounded-[12px] border border-border p-4">
              <Qr value={url} size={200} label={`QR de ${titulo}`} />
            </div>
            <p className="break-all text-center font-mono text-[12px] text-muted">{url}</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

type EditorCond = { modalidad?: string; lugar_carga?: string; disponible_desde?: string; precio_monto?: string; precio_unidad?: string };

export default function OfertaDetallePage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ paso?: string; publicada?: string }> }) {
  return (
    <>
      <Link href="/comercializacion" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Comercialización
      </Link>
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Detalle params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
