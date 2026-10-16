import { Badge } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClock, IconGlobe, IconLock } from "@/components/icons";
import { fecha } from "@/lib/format";

export const PRIVACIDAD: Record<string, string> = { fiscal: "Fiscal", sanitario: "Sanitario", comercial: "Comercial", general: "General" };

/** Vencimiento con las alertas de 30, 7 y 0 días (TPA-36): vencido rojo, ≤ 7 días amarillo fuerte, ≤ 30 aviso. */
export function VenceBadge({ vence, dias, estado }: { vence?: string | null; dias: number | null; estado?: string }) {
  if (estado === "revocado") return <Badge tone="neutral">Revocado</Badge>;
  if (!vence || dias == null) return <span className="text-[13px] text-subtle">Sin vencimiento</span>;
  if (dias < 0)
    return (
      <Badge tone="danger" icon={<IconAlert size={14} />}>
        Venció el {fecha(vence)}
      </Badge>
    );
  if (dias === 0)
    return (
      <Badge tone="danger" icon={<IconAlert size={14} />}>
        Vence hoy
      </Badge>
    );
  if (dias <= 7)
    return (
      <Badge tone="warning" icon={<IconAlert size={14} />}>
        Vence en {dias} {dias === 1 ? "día" : "días"}
      </Badge>
    );
  if (dias <= 30)
    return (
      <Badge tone="warning" icon={<IconClock size={14} />}>
        Vence el {fecha(vence)}
      </Badge>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink">
      <IconCheckCircle size={14} className="text-success" /> {fecha(vence)}
    </span>
  );
}

export function VisibilidadBadge({ visibilidad }: { visibilidad?: string }) {
  return visibilidad === "perfil" ? (
    <Badge tone="info" icon={<IconGlobe size={14} />}>
      En el perfil
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<IconLock size={14} />}>
      Privado
    </Badge>
  );
}
