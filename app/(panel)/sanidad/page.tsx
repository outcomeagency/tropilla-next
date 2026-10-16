import Link from "next/link";
import type { Metadata } from "next";
import { IconShield } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Sanidad" };

export default function SanidadPage() {
  return (
    <>
    <ModulePlaceholder
      title="Sanidad"
      subtitle="Plan sanitario, aplicaciones, retiros y controles."
      icon={<IconShield size={24} />}
      emptyTitle="Todavía no armaste el plan sanitario"
      emptyDescription="Partí de una plantilla (aftosa en dos campañas, rabia, tuberculina, parasitario bubalino NEA) y ajustala a tu establecimiento. Después registrás una vacunación a un lote completo en un solo paso."
      actions={[{ label: "Armar plan desde plantilla", variant: "primary" }, { label: "Registrar aplicación", variant: "outline" }]}
      scope={[
        "Calendario de tareas sanitarias con vencimientos",
        "Animales con retiro vigente antes de vender",
        "Tuberculina: lectura a 0 h y 72 h con resultado calculado",
        "Reactores siempre privados: nunca se publican",
      ]}
      notice={
        <Notice tone="warning" title="Validá este plan con tu veterinario">
          Las plantillas son sugerencias editables: TROPILLA no prescribe productos ni dosis.
        </Notice>
      }
    />
      <p className="mt-4 text-[14px] text-muted">
        El catálogo de productos ya está disponible:{" "}
        <Link href="/sanidad/productos" className="font-medium text-campo hover:underline">
          ver productos sanitarios
        </Link>
        .
      </p>
    </>
  );
}
