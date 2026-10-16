import type { ComponentType } from "react";
import { Badge } from "@/components/ui";
import { IconCheckCircle, IconClock, IconClose, IconFile, IconGlobe, type IconProps } from "@/components/icons";
import type { Tone } from "@/lib/status";

export const ESTADO_OFERTA: Record<string, { label: string; tone: Tone; Icon: ComponentType<IconProps> }> = {
  borrador: { label: "Borrador", tone: "neutral", Icon: IconFile },
  publicada: { label: "Publicada", tone: "success", Icon: IconGlobe },
  reservada: { label: "Reservada", tone: "warning", Icon: IconClock },
  vendida: { label: "Vendida", tone: "info", Icon: IconCheckCircle },
  retirada: { label: "Retirada", tone: "neutral", Icon: IconClose },
};

export function EstadoOfertaBadge({ estado }: { estado?: string }) {
  const e = ESTADO_OFERTA[estado ?? "borrador"] ?? ESTADO_OFERTA.borrador;
  return (
    <Badge tone={e.tone} icon={<e.Icon size={14} />}>
      {e.label}
    </Badge>
  );
}

const PASOS = ["Lote", "Datos y qué se muestra", "Revisar y publicar", "Compartir"];

/** Pasos del flujo 11 (publicar una oferta). */
export function PasosOferta({ actual }: { actual: number }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]" aria-label="Pasos para publicar">
      {PASOS.map((p, i) => (
        <li key={p} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true" className="h-px w-6 bg-border-strong" />}
          <span
            className={
              i < actual
                ? "inline-flex items-center gap-1.5 font-medium text-campo"
                : i === actual
                  ? "inline-flex items-center gap-1.5 font-semibold text-ink"
                  : "inline-flex items-center gap-1.5 text-muted"
            }
            aria-current={i === actual ? "step" : undefined}
          >
            <span
              className={
                i < actual
                  ? "grid h-5 w-5 place-items-center rounded-full bg-campo text-[11px] text-blanco"
                  : i === actual
                    ? "grid h-5 w-5 place-items-center rounded-full bg-monte text-[11px] text-blanco"
                    : "grid h-5 w-5 place-items-center rounded-full border border-border-strong text-[11px]"
              }
            >
              {i + 1}
            </span>
            {p}
          </span>
        </li>
      ))}
    </ol>
  );
}
