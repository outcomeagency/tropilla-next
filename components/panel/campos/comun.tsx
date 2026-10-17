import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, FilterTabs, SpeciesChip } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClock, IconDeclared, IconPin, IconShieldCheck } from "@/components/icons";
import type { Tone } from "@/lib/status";
import type { AvisoMercado, CampoAviso, CampoCompatibilidad } from "@/lib/data/campos";
import { fecha, nf } from "@/lib/format";
import { departamentoNombre } from "@/lib/geo";

type Seccion = "buscar" | "mis-avisos" | "consultas" | "moderacion";

/** Secciones del mercado de campos. */
export function CamposTabs({ actual, staff = false, gestiona = true }: { actual: Seccion; staff?: boolean; gestiona?: boolean }) {
  return (
    <div className="mb-5">
      <FilterTabs
        label="Campos y pastajes"
        items={[
          { href: "/campos", label: "Buscar campos", active: actual === "buscar" },
          ...(gestiona ? [{ href: "/campos/mis-avisos", label: "Mis avisos", active: actual === "mis-avisos" }] : []),
          { href: "/campos/consultas", label: "Consultas", active: actual === "consultas" },
          ...(staff ? [{ href: "/campos/moderacion", label: "Moderación", active: actual === "moderacion" }] : []),
        ]}
      />
    </div>
  );
}

const VERIFICACION: Record<string, { tone: Tone; icon: ReactNode }> = {
  declarado: { tone: "neutral", icon: <IconDeclared size={14} /> },
  contacto_verificado: { tone: "info", icon: <IconCheckCircle size={14} /> },
  documentacion_revisada: { tone: "primary", icon: <IconShieldCheck size={14} /> },
};

/** Nivel real de comprobación de TROPILLA: nunca «certificado» ni «inspeccionado». */
export function VerificacionBadge({ v }: { v: CampoAviso["verificacion"] }) {
  const nivel = v?.nivel ?? "declarado";
  const m = VERIFICACION[nivel] ?? VERIFICACION.declarado;
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {v?.nombre ?? "Datos declarados"}
    </Badge>
  );
}

const ESTADO_AVISO: Record<string, { label: string; tone: Tone }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  publicado: { label: "Publicado", tone: "success" },
  pausado: { label: "Pausado", tone: "warning" },
  en_revision: { label: "En revisión", tone: "danger" },
  cerrado: { label: "Cerrado", tone: "neutral" },
};

export function EstadoAvisoBadge({ estado }: { estado?: string }) {
  const e = ESTADO_AVISO[estado ?? ""] ?? { label: estado ?? "—", tone: "neutral" as Tone };
  const icon = estado === "publicado" ? <IconCheckCircle size={14} /> : estado === "en_revision" ? <IconAlert size={14} /> : <IconClock size={14} />;
  return (
    <Badge tone={e.tone} icon={icon}>
      {e.label}
    </Badge>
  );
}

const ESTADO_CONSULTA: Record<string, Tone> = {
  enviada: "info",
  respondida: "primary",
  visita_coordinada: "primary",
  acuerdo: "success",
  sin_acuerdo: "neutral",
  descartada: "neutral",
  retirada: "neutral",
};

export function EstadoConsultaBadge({ estado, label }: { estado: string; label?: string }) {
  const tone = ESTADO_CONSULTA[estado] ?? "neutral";
  return (
    <Badge tone={tone} icon={estado === "acuerdo" ? <IconCheckCircle size={14} /> : <IconClock size={14} />}>
      {label ?? estado}
    </Badge>
  );
}

export function precioTexto(p: CampoAviso["precio"]): string {
  if (!p || p.unidad === "a_convenir" || !p.valor) return "A convenir";
  const v = nf.format(Number(p.valor));
  if (p.unidad === "porcentaje_ganancia") return `${v} % de los kilos ganados`;
  if (p.unidad === "kg_carne_ha_anio") return `${v} kg de carne por ha por año`;
  return `$ ${v} ${p.unidad_nombre ?? ""}`.trim();
}

export function temporadaTexto(a: Pick<CampoAviso, "temporada_desde" | "temporada_hasta">): string {
  return a.temporada_hasta ? `${fecha(a.temporada_desde, true)} al ${fecha(a.temporada_hasta, true)}` : `Desde ${fecha(a.temporada_desde, true)}, sin fecha de fin`;
}

/** Zona publicable: departamento y provincia (localidad solo si el anunciante la mostró). */
export type Zona = CampoAviso["zona"];

export function zonaTexto(z: Zona): string {
  const depto = z?.departamento ?? (departamentoNombre(z?.departamento_codigo) || null);
  return [z?.localidad, depto ? `Depto. ${depto}` : null, z?.provincia].filter(Boolean).join(", ");
}

const ESPECIE: Record<string, "bovino" | "bubalino"> = { BOV: "bovino", BUB: "bubalino" };

export function Especies({ codigos }: { codigos?: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {(codigos ?? []).map((c) => (ESPECIE[c] ? <SpeciesChip key={c} especie={ESPECIE[c]} withIcon /> : <Badge key={c}>{c}</Badge>))}
    </span>
  );
}

const CAPACIDAD: Record<string, string> = { suficiente: "Capacidad suficiente", parcial: "Capacidad parcial", insuficiente: "No alcanza la capacidad", sin_dato: "Capacidad declarada" };

/** Compatibilidad con el rodeo: puntaje + motivos en texto (nunca solo color). */
export function CompatibilidadResumen({ c, compacto = false }: { c: CampoCompatibilidad; compacto?: boolean }) {
  const tone: Tone = c.compatible ? "success" : (c.puntaje ?? 0) >= 40 ? "warning" : "neutral";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={tone} icon={c.compatible ? <IconCheckCircle size={14} /> : <IconAlert size={14} />}>
          {c.compatible ? "Compatible con tu rodeo" : c.especie ? "Compatible en parte" : "No recibe tu especie"} · {c.puntaje}/100
        </Badge>
        {c.especie && <Badge>{CAPACIDAD[c.capacidad ?? "sin_dato"]}</Badge>}
        {c.distancia_km != null && (
          <Badge icon={<IconPin size={14} />}>
            ≈ {nf.format(c.distancia_km)} km
          </Badge>
        )}
      </div>
      {!compacto && (
        <ul className="space-y-1 text-[13.5px] text-muted">
          {(c.motivos ?? []).map((m) => (
            <li key={m}>· {m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Fila del listado del mercado. */
export function AvisoFila({ a }: { a: AvisoMercado }) {
  return (
    <article className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{a.modalidad_nombre}</Badge>
          <Especies codigos={a.especies} />
          <VerificacionBadge v={a.verificacion} />
          {a.propio && <Badge tone="info">Tu aviso</Badge>}
        </div>
        <h3 className="text-[16.5px] font-semibold leading-6 text-ink">
          <Link href={`/campos/${a.id}`} className="hover:text-campo hover:underline">
            {a.titulo}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-[13.5px] text-muted">
          <IconPin size={14} className="shrink-0" />
          {zonaTexto(a.zona)} · Publicado por {a.publicado_por?.establecimiento}
        </p>
        {a.compatibilidad && <CompatibilidadResumen c={a.compatibilidad} compacto />}
      </div>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-1 rounded-[10px] bg-surface-2 px-3 py-2.5 text-[13px] lg:grid-cols-2">
        <div>
          <dt className="text-muted">Capacidad</dt>
          <dd className="font-semibold tabular-nums text-ink">{nf.format(a.capacidad_cabezas)} cab.</dd>
        </div>
        <div>
          <dt className="text-muted">Superficie</dt>
          <dd className="font-semibold tabular-nums text-ink">{a.superficie_ha ? `${nf.format(Number(a.superficie_ha))} ha` : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Precio</dt>
          <dd className="font-semibold text-ink">{precioTexto(a.precio)}</dd>
        </div>
        <div className="col-span-3 lg:col-span-1">
          <dt className="text-muted">Temporada</dt>
          <dd className="font-medium text-ink">{temporadaTexto(a)}</dd>
        </div>
      </dl>
    </article>
  );
}

/** Aviso fijo de límites del mercado (sin garantía del inmueble). */
export function LimitesCampos({ avisos }: { avisos: string[] }) {
  return (
    <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-muted">
      {avisos.map((t) => (
        <li key={t} className="flex gap-2">
          <IconDeclared size={15} className="mt-0.5 shrink-0 text-campo" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
