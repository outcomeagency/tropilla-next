import type { ReactNode } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { IconCheckCircle, IconClock } from "@/components/icons";

/**
 * Página de módulo todavía sin API: encabezado real, estado vacío con
 * explicación y salida, y el alcance del módulo para que la pantalla no quede
 * vacía. Las acciones quedan deshabilitadas hasta conectar los endpoints.
 */
export function ModulePlaceholder({
  title,
  subtitle,
  icon,
  emptyTitle,
  emptyDescription,
  actions,
  scopeTitle = "Lo que vas a poder hacer acá",
  scope,
  notice,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  emptyTitle: string;
  emptyDescription: ReactNode;
  actions: Array<{ label: string; variant?: "primary" | "outline" }>;
  scopeTitle?: string;
  scope: string[];
  notice?: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Badge tone="neutral" icon={<IconClock size={14} />}>
            Módulo en preparación
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <EmptyState
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
            action={actions.map((a) => (
              <Button key={a.label} variant={a.variant ?? "primary"} disabled aria-describedby="modulo-pendiente">
                {a.label}
              </Button>
            ))}
          >
            {notice}
          </EmptyState>
          <p id="modulo-pendiente" className="border-t border-border px-6 py-3 text-[12.5px] text-muted sm:px-8">
            Las acciones se habilitan cuando este módulo quede conectado con la API de TROPILLA.
          </p>
        </Card>

        <Card>
          <CardHeader title={scopeTitle} />
          <ul className="space-y-3 px-5 py-4">
            {scope.map((item) => (
              <li key={item} className="flex gap-3 text-[14px] text-ink">
                <IconCheckCircle size={18} className="mt-0.5 shrink-0 text-campo" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
