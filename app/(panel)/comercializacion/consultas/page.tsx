import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Card, DataList, EmptyState, FilterTabs, PageHeader, cx } from "@/components/ui";
import { IconArrowLeft, IconLanguage, IconLock, IconMessage, IconTag } from "@/components/icons";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { AccionesConsulta } from "@/components/panel/consultas/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { listConsultas, type Consulta } from "@/lib/data/consultas";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Consultas" };

type SP = { estado?: string; id?: string };

const ESTADOS = [
  { v: "nueva", l: "Nuevas" },
  { v: "respondida", l: "Respondidas" },
  { v: "cerrada", l: "Cerradas" },
  { v: "spam", l: "Spam" },
] as const;

const ESTADO_BADGE: Record<string, { l: string; tone: "info" | "success" | "neutral" | "danger" }> = {
  nueva: { l: "Nueva", tone: "info" },
  respondida: { l: "Respondida", tone: "success" },
  cerrada: { l: "Cerrada", tone: "neutral" },
  spam: { l: "Spam", tone: "danger" },
};

const TIPO_COMPRADOR: Record<string, string> = {
  frigorifico: "Frigorífico",
  exportador: "Exportador",
  invernador: "Invernador",
  criador: "Criador",
  consignatario: "Consignatario",
  feedlot: "Feedlot",
  particular: "Particular",
  otro: "Otro",
};
const IDIOMA: Record<string, string> = { es: "español", en: "inglés", pt: "portugués" };
const paises = new Intl.DisplayNames(["es"], { type: "region" });
const pais = (c?: string | null) => {
  if (!c) return null;
  try {
    return paises.of(c.toUpperCase()) ?? c;
  } catch {
    return c;
  }
};

function hace(iso: string | undefined, ahora: number) {
  if (!iso) return "";
  const min = Math.round((ahora - Date.parse(iso)) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

async function Bandeja({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  if (!ctx.can("consultas.ver")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Las consultas las ve el dueño o la administración" description="Pueden traer precios y datos de contacto de compradores." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const estado = ESTADOS.some((e) => e.v === sp.estado) ? sp.estado : sp.estado === "todas" ? undefined : "nueva";
  const [res, todas] = await Promise.all([listConsultas(est, estado), listConsultas(est)]);
  await connection();
  const ahora = new Date().getTime();
  const lista = res.data;
  const sel: Consulta | undefined = todas.data.find((c) => c.id === sp.id) ?? lista[0];
  const conteo = (v?: string) => todas.data.filter((c) => !v || c.estado === v).length;
  const href = (cambios: Partial<SP>) => {
    const q = new URLSearchParams(Object.entries({ estado: sp.estado, id: sp.id, ...cambios }).filter(([, v]) => v) as [string, string][]);
    return `/comercializacion/consultas${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
      <Card className={cx("overflow-hidden", sp.id && "hidden lg:block")}>
        <div className="border-b border-border px-4 py-3">
          <FilterTabs
            label="Estado"
            items={[
              ...ESTADOS.slice(0, 3).map((e) => ({ href: href({ estado: e.v, id: undefined }), label: e.l, count: conteo(e.v) || undefined, active: estado === e.v })),
              { href: href({ estado: "todas", id: undefined }), label: "Todas", active: !estado },
            ]}
          />
        </div>
        {lista.length ? (
          <ul className="divide-y divide-border">
            {lista.map((c) => {
              const activa = c.id === sel?.id;
              return (
                <li key={c.id}>
                  <Link href={href({ id: c.id })} aria-current={activa ? "true" : undefined} className={cx("block px-4 py-3 hover:bg-surface-2", activa && "bg-campo-50 hover:bg-campo-50")}>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        {c.estado === "nueva" && <span aria-label="Sin leer" className="h-2 w-2 shrink-0 rounded-full bg-campo" />}
                        <span className={cx("truncate text-[14.5px] text-ink", c.estado === "nueva" ? "font-semibold" : "font-medium")}>{c.nombre}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-muted">{hace(c.created_at, ahora)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-muted">{[c.empresa, pais(c.pais), c.oferta?.titulo].filter(Boolean).join(" · ")}</span>
                    <span className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-ink/80">{c.mensaje}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<IconMessage size={24} />}
            title={estado === "nueva" ? "No hay consultas nuevas" : "No hay consultas acá"}
            description={estado === "nueva" ? "Cuando un comprador te escriba desde una oferta o tu perfil público, llega acá y te avisamos por email." : "Probá con otro filtro."}
          />
        )}
      </Card>

      {sel ? (
        <Card className={cx("overflow-hidden", !sp.id && "hidden lg:block")}>
          <div className="border-b border-border px-5 py-4">
            {sp.id && (
              <Link href={href({ id: undefined })} className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink lg:hidden">
                <IconArrowLeft size={16} /> Bandeja
              </Link>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[20px] font-semibold leading-tight text-ink">{sel.nombre}</h2>
                <p className="mt-0.5 text-[14px] text-muted">{[sel.empresa, pais(sel.pais)].filter(Boolean).join(" · ") || "Sin empresa"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sel.idioma && sel.idioma !== "es" && (
                  <Badge tone="info" icon={<IconLanguage size={14} />}>
                    Escribió en {IDIOMA[sel.idioma]}
                  </Badge>
                )}
                <Badge tone={ESTADO_BADGE[sel.estado ?? "nueva"].tone}>{ESTADO_BADGE[sel.estado ?? "nueva"].l}</Badge>
                <Badge tone={sel.validacion_cuit_estado === "validado" ? "success" : sel.validacion_cuit_estado === "inconsistente" ? "warning" : "info"}>{sel.validacion_cuit_estado === "validado" ? "CUIT validado" : sel.validacion_cuit_estado === "inconsistente" ? "Datos inconsistentes" : "Validación pendiente"}</Badge>
              </div>
            </div>
          </div>
          <div className="space-y-5 px-5 py-5">
            {sel.oferta && (
              <Link href={`/comercializacion/ofertas/${sel.oferta.id}`} className="flex items-center gap-2 rounded-[10px] border border-border bg-base px-3.5 py-2.5 text-[14px] hover:border-campo">
                <IconTag size={16} className="text-monte" />
                <span className="text-muted">Sobre la oferta</span>
                <span className="font-semibold text-ink">{sel.oferta.titulo}</span>
              </Link>
            )}
            <blockquote className="whitespace-pre-line rounded-[10px] border-l-4 border-campo bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-ink">{sel.mensaje}</blockquote>
            <DataList
              items={[
                { label: "Tipo de comprador", value: TIPO_COMPRADOR[sel.tipo_comprador ?? ""] ?? sel.tipo_comprador ?? "—" },
                { label: "Volumen", value: sel.volumen ?? "—" },
                { label: "Teléfono", value: sel.telefono ?? "—" },
                { label: "Email", value: sel.email ?? "—" },
                { label: "Recibida", value: fechaHora(sel.created_at) },
                ...(sel.respondida_en ? [{ label: "Respondida", value: `${fechaHora(sel.respondida_en)}${sel.canal_respuesta ? ` · por ${sel.canal_respuesta}` : ""}` }] : []),
              ]}
            />
            <AccionesConsulta key={`${sel.id}${sel.estado}`} id={sel.id ?? ""} estado={sel.estado ?? "nueva"} whatsapp={sel.whatsapp_url} mailto={sel.mailto_url} telefono={sel.telefono} puede={ctx.can("consultas.gestionar")} />
            <p className="text-[12.5px] leading-snug text-muted">
              Esta consulta pública no está vinculada a un perfil comprador y no incluye CUIT validado. La respuesta sale de tu WhatsApp o tu correo, con un saludo ya escrito en el idioma del comprador. Precios y condiciones los acordás vos: TROPILLA no intermedia.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="hidden lg:block">
          <EmptyState icon={<IconMessage size={24} />} title="Elegí una consulta" description="El detalle y los botones para responder aparecen acá." />
        </Card>
      )}
    </div>
  );
}

/** Bandeja de consultas de compradores (TPA-49). */
export default function ConsultasPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Comercialización" subtitle="Consultas de compradores desde tus ofertas y tu perfil público. Cada una llega con el idioma del comprador y un saludo listo para responder." />
      <ComercialTabs actual="consultas" />
      <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Bandeja searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
