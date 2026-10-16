import { Badge } from "@/components/ui";
import { IconAlert, IconExternal, IconInfo } from "@/components/icons";
import type { Tone } from "@/lib/status";
import { fecha, fechaHora } from "@/lib/format";
import type { ClimaAlerta } from "@/lib/data/clima";

export const SEVERIDAD: Record<string, { label: string; tone: Tone }> = {
  alta: { label: "Riesgo alto", tone: "danger" },
  moderada: { label: "Atención", tone: "warning" },
  info: { label: "Informativo", tone: "info" },
};

export const TIPO_CLIMA: Record<string, string> = {
  lluvia: "Lluvia extrema",
  sequia: "Sequía",
  helada: "Helada",
  calor: "Estrés térmico",
  incendio: "Incendio",
  enso: "ENSO",
};

export function SeveridadBadge({ severidad }: { severidad: string }) {
  const s = SEVERIDAD[severidad] ?? SEVERIDAD.info;
  const Icon = s.tone === "info" ? IconInfo : IconAlert;
  return (
    <Badge tone={s.tone} icon={<Icon size={14} />}>
      {s.label}
    </Badge>
  );
}

function periodo(a: ClimaAlerta): string {
  return a.desde === a.hasta ? fecha(a.desde) : `${fecha(a.desde, true)} al ${fecha(a.hasta)}`;
}

/** Una alerta climática: qué, cuándo, dónde, umbral, fuente y qué revisar. `compacta` para la tarjeta del inicio. */
export function AlertaClima({ a, compacta = false }: { a: ClimaAlerta; compacta?: boolean }) {
  return (
    <article className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeveridadBadge severidad={a.severidad ?? "info"} />
        <span className="text-[12.5px] font-medium text-muted">{TIPO_CLIMA[a.tipo ?? ""] ?? a.tipo}</span>
        <span className="text-[12.5px] tabular-nums text-muted">· {periodo(a)}</span>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold text-ink">{a.titulo}</h3>
      {compacta ? (
        <p className="mt-1 line-clamp-2 text-[13.5px] text-muted">{a.recomendacion}</p>
      ) : (
        <>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">{a.detalle}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink">{a.recomendacion}</p>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[12.5px] text-muted sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Zona: </dt>
              <dd className="inline">{a.zona}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Horizonte: </dt>
              <dd className="inline tabular-nums">{a.horizonte_dias} días</dd>
            </div>
            {a.umbral != null && (
              <div>
                <dt className="inline font-medium">Umbral: </dt>
                <dd className="inline tabular-nums">
                  {a.umbral} {a.unidad} (valor {a.valor} {a.unidad})
                </dd>
              </div>
            )}
            <div>
              <dt className="inline font-medium">Datos de la fuente: </dt>
              <dd className="inline tabular-nums">{fechaHora(a.emitida_en)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline font-medium">Fuente: </dt>
              <dd className="inline">
                <a href={a.fuente_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-campo hover:underline">
                  {a.fuente} <IconExternal size={13} />
                </a>
              </dd>
            </div>
          </dl>
        </>
      )}
    </article>
  );
}
