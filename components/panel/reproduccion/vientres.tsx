import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, FilterTabs, SpeciesChip, cx } from "@/components/ui";
import { IconAlert, IconCalendar, IconCheckCircle, IconClock } from "@/components/icons";
import type { PartoCalendario, TableroVientres } from "@/lib/data/reproduccion";
import { mesNombre, sumarMes } from "@/lib/data/reproduccion";
import { especieDe } from "@/lib/types";
import { nf } from "@/lib/format";

/** Sub-navegación de Reproducción (estado en la URL). */
export function ReproduccionTabs({ activo, children }: { activo: "tablero" | "partos"; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <FilterTabs
        label="Secciones de reproducción"
        items={[
          { href: "/reproduccion", label: "Tablero de vientres", active: activo === "tablero" },
          { href: "/reproduccion/partos", label: "Calendario de partos", active: activo === "partos" },
        ]}
      />
      {children}
    </div>
  );
}

/** Estados de un vientre, en el orden del ciclo, con su serie de color (tokens chart-*). */
export const ESTADOS_VIENTRE = [
  { key: "vacias", filtro: "vacia", label: "Vacías", bg: "bg-chart-4" },
  { key: "servidas", filtro: "servida", label: "Servidas", bg: "bg-chart-3" },
  { key: "prenadas", filtro: "prenada", label: "Preñadas", bg: "bg-chart-1" },
  { key: "paridas", filtro: "parida", label: "Paridas", bg: "bg-chart-2" },
  { key: "sin_estado", filtro: undefined, label: "Sin datos", bg: "bg-ghost" },
] as const;

export type EstadoKey = (typeof ESTADOS_VIENTRE)[number]["key"];

export const ESPECIE_PLURAL: Record<string, string> = { BOV: "Bovinos", BUB: "Bubalinos" };

const pf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** Barra apilada de vientres por estado de una especie, con leyenda numérica clickeable. */
export function VientresEspecie({ t }: { t: TableroVientres }) {
  const total = t.total_vientres ?? 0;
  const esp = t.especie ?? "BOV";
  const prenez = total ? ((t.prenadas ?? 0) / total) * 100 : 0;
  return (
    <div className="py-4 first:pt-1 last:pb-1">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <SpeciesChip especie={especieDe(esp)} withIcon label={ESPECIE_PLURAL[esp]} />
          <span className="text-[14px] text-muted">
            <span className="font-semibold tabular-nums text-ink">{nf.format(total)}</span> vientres
          </span>
        </span>
        <span className="text-[13px] text-muted">
          Preñez <span className="font-semibold tabular-nums text-ink">{pf.format(prenez)} %</span>
        </span>
      </div>
      {total > 0 ? (
        <div className="flex h-7 w-full overflow-hidden rounded-[6px]" aria-hidden="true">
          {ESTADOS_VIENTRE.map((e, i) => {
            const n = t[e.key] ?? 0;
            if (!n) return null;
            return <div key={e.key} className={cx(e.bg, i > 0 && "border-l-2 border-surface")} style={{ width: `${(n / total) * 100}%` }} />;
          })}
        </div>
      ) : (
        <div className="h-7 w-full rounded-[6px] bg-surface-2" aria-hidden="true" />
      )}
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {ESTADOS_VIENTRE.map((e) => {
          const n = t[e.key] ?? 0;
          if (e.key === "sin_estado" && !n) return null;
          const contenido = (
            <>
              <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", e.bg, e.key === "sin_estado" && "ring-1 ring-border-strong")} aria-hidden="true" />
              {e.label}
              <span className="font-semibold tabular-nums text-ink">{nf.format(n)}</span>
            </>
          );
          return (
            <li key={e.key} className="text-[13px] text-muted">
              {e.filtro && n > 0 ? (
                <Link href={`/hacienda?especie=${esp}&estado_reproductivo=${e.filtro}`} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                  {contenido}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5">{contenido}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Partos esperados por mes (preñadas por mes de parto), barras apiladas por especie.
 * Los meses ya pasados (partos atrasados) se marcan; los huecos se completan con cero.
 */
export function PartosPorMes({ tablero, mesActual }: { tablero: TableroVientres[]; mesActual: string }) {
  const porMes = new Map<string, { BOV: number; BUB: number }>();
  for (const t of tablero)
    for (const m of t.prenadas_por_mes_parto ?? []) {
      if (!m.mes) continue;
      const v = porMes.get(m.mes) ?? { BOV: 0, BUB: 0 };
      v[(t.especie ?? "BOV") as "BOV" | "BUB"] += m.cabezas ?? 0;
      porMes.set(m.mes, v);
    }
  const claves = [...porMes.keys()].sort();
  if (!claves.length) return null;
  const desde = claves[0] < mesActual ? claves[0] : mesActual;
  const hasta = claves[claves.length - 1] > sumarMes(mesActual, 5) ? claves[claves.length - 1] : sumarMes(mesActual, 5);
  const meses: string[] = [];
  for (let m = desde; m <= hasta && meses.length < 15; m = sumarMes(m, 1)) meses.push(m);
  const max = Math.max(1, ...meses.map((m) => (porMes.get(m)?.BOV ?? 0) + (porMes.get(m)?.BUB ?? 0)));
  const hayBov = tablero.some((t) => t.especie === "BOV" && (t.prenadas ?? 0) > 0);
  const hayBub = tablero.some((t) => t.especie === "BUB" && (t.prenadas ?? 0) > 0);

  const enRango = (a: string, b: string) => claves.filter((m) => m >= a && m <= b).reduce((s, m) => s + (porMes.get(m)!.BOV + porMes.get(m)!.BUB), 0);
  const resumen = [
    { label: "Este mes", n: enRango(mesActual, mesActual) },
    { label: "Próximos 3 meses", n: enRango(sumarMes(mesActual, 1), sumarMes(mesActual, 3)) },
    { label: "Más adelante", n: enRango(sumarMes(mesActual, 4), "9999-12") },
    { label: "Meses pasados", n: enRango("0000-01", sumarMes(mesActual, -1)), danger: true },
  ];
  return (
    <figure>
      <dl className="mb-6 grid grid-cols-2 gap-3 2xl:grid-cols-4">
        {resumen.map((r) => (
          <div key={r.label} className="rounded-[10px] border border-border bg-base px-3 py-2.5">
            <dt className="text-[12px] text-muted">{r.label}</dt>
            <dd className={cx("text-[20px] font-bold tabular-nums", r.danger && r.n > 0 ? "text-danger" : "text-ink")}>{nf.format(r.n)}</dd>
          </div>
        ))}
      </dl>
      <div className="flex h-[208px] items-end gap-1.5 border-b border-border-strong sm:gap-2.5" role="img" aria-label="Partos esperados por mes">
        {meses.map((m) => {
          const v = porMes.get(m) ?? { BOV: 0, BUB: 0 };
          const tot = v.BOV + v.BUB;
          const pasado = m < mesActual;
          return (
            <Link
              key={m}
              href={`/reproduccion/partos?mes=${m}`}
              title={`${mesNombre(m)}: ${tot} ${tot === 1 ? "parto" : "partos"}`}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className={cx("mb-1 text-[12px] font-semibold tabular-nums", tot ? (pasado ? "text-danger" : "text-ink") : "text-transparent")}>{tot || "0"}</span>
              <span className="flex w-full max-w-[38px] flex-col justify-end overflow-hidden rounded-t-[4px] group-hover:opacity-85" style={{ height: `${(tot / max) * 170}px` }}>
                {v.BUB > 0 && <span className={cx("w-full", pasado ? "bg-danger" : "bg-chart-1")} style={{ height: `${(v.BUB / tot) * 100}%` }} />}
                {v.BOV > 0 && <span className={cx("w-full border-t border-surface", pasado ? "bg-danger" : "bg-chart-3")} style={{ height: `${(v.BOV / tot) * 100}%` }} />}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-2.5">
        {meses.map((m) => (
          <span key={m} className={cx("min-w-0 flex-1 text-center text-[11.5px] capitalize", m === mesActual ? "font-semibold text-ink" : "text-muted")}>
            {mesNombre(m, true)}
            {m.endsWith("-01") || m === meses[0] ? <span className="block text-[10.5px] text-subtle">{m.slice(0, 4)}</span> : <span className="block text-[10.5px]">&nbsp;</span>}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
        {hayBub && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-chart-1" aria-hidden="true" /> Bubalinos
          </span>
        )}
        {hayBov && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-chart-3" aria-hidden="true" /> Bovinos
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-danger" aria-hidden="true" /> Meses pasados sin parto registrado
        </span>
      </figcaption>
    </figure>
  );
}

const PRECISION: Record<string, string> = { tacto: "Por tacto", ecografia: "Por ecografía", servicio: "Por servicio", inseminacion: "Por inseminación" };

export function precisionLabel(p?: string | null): string {
  if (!p) return "Estimada";
  return PRECISION[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

/** Cuándo es el parto, con tono: vencido (rojo), atrasado dentro de la tolerancia (amarillo), próximo (info). */
export function CuandoBadge({ p }: { p: PartoCalendario }) {
  const d = p.dias_para_parto ?? 0;
  if (p.vencido)
    return (
      <Badge tone="danger" icon={<IconAlert size={14} />}>
        Vencido hace {nf.format(-d)} {-d === 1 ? "día" : "días"}
      </Badge>
    );
  if (d < 0)
    return (
      <Badge tone="warning" icon={<IconClock size={14} />}>
        Atrasado {nf.format(-d)} {-d === 1 ? "día" : "días"}
      </Badge>
    );
  if (d === 0)
    return (
      <Badge tone="warning" icon={<IconCalendar size={14} />}>
        Hoy
      </Badge>
    );
  if (d <= 15)
    return (
      <Badge tone="info" icon={<IconCalendar size={14} />}>
        En {nf.format(d)} {d === 1 ? "día" : "días"}
      </Badge>
    );
  return (
    <Badge tone="neutral" icon={<IconCheckCircle size={14} />}>
      En {nf.format(d)} días
    </Badge>
  );
}
