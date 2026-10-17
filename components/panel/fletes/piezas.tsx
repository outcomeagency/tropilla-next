import type { ReactNode } from "react";
import { Badge, cx } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClock, IconPhone, IconShieldCheck, IconWhatsapp } from "@/components/icons";
import { ACCION_HISTORIAL, CRITERIO, ESTADO_DOCUMENTO, ESTADO_PROPUESTA, dinero, type Compatibilidad, type Propuesta } from "@/lib/fletes";
import { fecha, fechaHora } from "@/lib/format";
import type { S } from "@/lib/schemas";

/** Piezas de presentación del matching de fletes (TPA-73), compartidas por productor y concierge. */

export function Criterios({ c }: { c?: Compatibilidad | null }) {
  if (!c?.criterios?.length) return null;
  return (
    <ul className="grid grid-cols-1 gap-x-5 gap-y-1.5 text-[13px] sm:grid-cols-2">
      {c.criterios.map((k) => (
        <li key={k.criterio} className="flex gap-2">
          {k.cumple ? <IconCheckCircle size={15} className="mt-0.5 shrink-0 text-success" /> : <IconAlert size={15} className="mt-0.5 shrink-0 text-warning" />}
          <span>
            <span className="font-medium text-ink">{CRITERIO[k.criterio ?? ""] ?? k.criterio}.</span> <span className="text-muted">{k.detalle}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Documentos({ docs, compacto = false }: { docs?: S<"FleteDocumento">[]; compacto?: boolean }) {
  if (!docs?.length) return null;
  return (
    <ul className={cx("grid gap-1.5 text-[13px]", compacto ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
      {docs.map((d) => {
        const st = ESTADO_DOCUMENTO[d.estado];
        return (
          <li key={d.item} className="flex items-start justify-between gap-3">
            <span className="text-ink">{d.texto}</span>
            <span className="shrink-0">
              <Badge tone={st.tone}>{st.label}</Badge>
              {d.vence_el && d.estado === "verificado" && <span className="mt-0.5 block text-right text-[11.5px] text-muted tabular-nums">vence {fecha(d.vence_el, true)}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function telefonoWa(t: string) {
  const d = t.replace(/\D/g, "");
  return d.startsWith("54") ? d : `54${d.replace(/^0/, "")}`;
}

/** Tarjeta de una propuesta del concierge: transportista, camión, criterios de compatibilidad y documentación verificada. */
export function PropuestaCard({ p, acciones, concierge = false }: { p: Propuesta; acciones?: ReactNode; concierge?: boolean }) {
  const st = ESTADO_PROPUESTA[p.estado];
  const c = p.transportista.contacto;
  return (
    <article className={cx("space-y-4 rounded-[var(--radius-card)] border bg-surface p-5", p.estado === "aceptada" ? "border-campo" : "border-border", ["rechazada", "retirada"].includes(p.estado) && "opacity-75")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-ink">{p.transportista.nombre}</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            {[p.jaula_nombre, p.capacidad_cabezas ? `hasta ${p.capacidad_cabezas} cabezas` : null, p.es_retorno ? "viaje de retorno" : null].filter(Boolean).join(" · ") || "Coordinado por el equipo"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.transportista.documentacion_completa ? (
            <Badge tone="success" icon={<IconShieldCheck size={13} />}>
              Documentación verificada
            </Badge>
          ) : (
            <Badge tone="danger" icon={<IconAlert size={13} />}>
              Documentación a revisar
            </Badge>
          )}
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[12px] font-medium text-muted">Fecha propuesta</dt>
          <dd className="mt-0.5 text-[14.5px] text-ink tabular-nums">{fecha(p.fecha_propuesta)}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-medium text-muted">Tarifa estimada</dt>
          <dd className="mt-0.5 text-[14.5px] text-ink tabular-nums">{dinero(p.tarifa_estimada)}</dd>
        </div>
        {p.compatibilidad?.puntaje != null && (
          <div>
            <dt className="text-[12px] font-medium text-muted">Compatibilidad</dt>
            <dd className="mt-0.5 text-[14.5px] text-ink tabular-nums">{p.compatibilidad.puntaje} / 100</dd>
          </div>
        )}
        {p.compatibilidad?.distancia_salida_km != null && (
          <div>
            <dt className="text-[12px] font-medium text-muted">Sale a</dt>
            <dd className="mt-0.5 text-[14.5px] text-ink tabular-nums">~{p.compatibilidad.distancia_salida_km} km</dd>
          </div>
        )}
      </dl>

      {p.nota && <p className="rounded-[10px] bg-surface-2 px-4 py-3 text-[14px] text-ink">{p.nota}</p>}

      <details className="group">
        <summary className="cursor-pointer text-[13px] font-medium text-campo hover:underline">Por qué es compatible y qué se verificó</summary>
        <div className="mt-3 space-y-4">
          <Criterios c={p.compatibilidad} />
          <div className="rounded-[10px] border border-border p-3">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Documentación verificada a mano por el equipo</p>
            <Documentos docs={p.transportista.documentos} compacto />
          </div>
        </div>
      </details>

      {c && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] border border-campo-50 bg-campo-50 px-4 py-3 text-[14px]">
          <span className="font-semibold text-monte">{c.nombre}</span>
          <a href={`tel:${c.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-ink hover:underline">
            <IconPhone size={15} /> {c.telefono}
          </a>
          <a href={`https://wa.me/${telefonoWa(c.telefono)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-ink hover:underline">
            <IconWhatsapp size={15} /> WhatsApp
          </a>
          {c.email && <span className="text-muted">{c.email}</span>}
          {!concierge && <span className="basis-full text-[12.5px] text-muted">El transportista también recibió tu contacto. Precio y condiciones los acuerdan entre ustedes.</span>}
        </div>
      )}

      {p.motivo_rechazo && <p className="text-[13px] text-muted">Motivo: {p.motivo_rechazo}</p>}
      {acciones}
      <p className="flex items-center gap-1.5 text-[12px] text-muted">
        <IconClock size={13} /> Propuesta {fechaHora(p.created_at)}
        {p.respondida_en && ` · respondida ${fechaHora(p.respondida_en)}`}
      </p>
    </article>
  );
}

export function Historial({ items }: { items?: { accion?: string; quien?: string; en?: string; detalle?: Record<string, unknown> }[] }) {
  if (!items?.length) return <p className="px-5 py-4 text-[14px] text-muted">Sin movimientos.</p>;
  return (
    <ol className="space-y-3 px-5 py-4">
      {items.map((h, i) => (
        <li key={`${h.en}-${i}`} className="flex gap-3 text-[13.5px]">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-campo" aria-hidden />
          <span>
            <span className="font-medium text-ink">{ACCION_HISTORIAL[h.accion ?? ""] ?? h.accion}</span>
            {typeof h.detalle?.transportista === "string" && <span className="text-muted"> · {h.detalle.transportista}</span>}
            {typeof h.detalle?.motivo === "string" && h.detalle.motivo && <span className="text-muted"> · {h.detalle.motivo}</span>}
            <span className="block text-[12px] text-muted">
              {h.quien} · {fechaHora(h.en)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
