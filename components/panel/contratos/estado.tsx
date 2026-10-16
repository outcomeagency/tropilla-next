import { Badge } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClock, IconClose, IconFile, IconGlobe, type IconProps } from "@/components/icons";
import type { ComponentType } from "react";
import type { Tone } from "@/lib/status";

const ESTADO: Record<string, { label: string; tone: Tone; Icon: ComponentType<IconProps> }> = {
  borrador: { label: "Borrador", tone: "neutral", Icon: IconFile },
  publicado: { label: "Publicado", tone: "success", Icon: IconGlobe },
  parcialmente_tomado: { label: "Parcialmente tomado", tone: "info", Icon: IconClock },
  completo: { label: "Completo", tone: "success", Icon: IconCheckCircle },
  entregado: { label: "Entregado", tone: "info", Icon: IconCheckCircle },
  liquidado: { label: "Liquidado", tone: "success", Icon: IconCheckCircle },
  cancelado: { label: "Cancelado", tone: "neutral", Icon: IconClose },
  incumplido: { label: "Incumplido", tone: "danger", Icon: IconAlert },
};

const TOMA: Record<string, { label: string; tone: Tone; Icon: ComponentType<IconProps> }> = {
  reservada: { label: "Reservada", tone: "warning", Icon: IconClock },
  pago_informado: { label: "Pagó · confirmá «recibí»", tone: "warning", Icon: IconAlert },
  confirmada: { label: "Confirmada", tone: "success", Icon: IconCheckCircle },
  liberada: { label: "Liberada", tone: "neutral", Icon: IconClose },
  devuelta_parcial: { label: "Recortada · devolver anticipo", tone: "info", Icon: IconAlert },
};

export function EstadoContratoBadge({ estado }: { estado?: string }) {
  const e = ESTADO[estado ?? "borrador"] ?? ESTADO.borrador;
  return (
    <Badge tone={e.tone} icon={<e.Icon size={14} />}>
      {e.label}
    </Badge>
  );
}

export function EstadoTomaBadge({ estado }: { estado?: string }) {
  const e = TOMA[estado ?? "reservada"] ?? TOMA.reservada;
  return (
    <Badge tone={e.tone} icon={<e.Icon size={14} />}>
      {e.label}
    </Badge>
  );
}
