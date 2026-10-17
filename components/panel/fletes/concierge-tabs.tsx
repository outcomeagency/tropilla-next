import { Card, EmptyState, FilterTabs } from "@/components/ui";
import { IconLock } from "@/components/icons";

export function ConciergeTabs({ actual }: { actual: "pedidos" | "transportistas" }) {
  return (
    <div className="mb-4">
      <FilterTabs
        label="Mesa de fletes"
        items={[
          { href: "/fletes/concierge", label: "Pedidos y métricas", active: actual === "pedidos" },
          { href: "/fletes/concierge/transportistas", label: "Transportistas", active: actual === "transportistas" },
        ]}
      />
    </div>
  );
}

export function SoloStaff() {
  return (
    <Card>
      <EmptyState icon={<IconLock size={24} />} title="La mesa de fletes es del equipo de TROPILLA" description="Acá se gestionan los pedidos de todos los establecimientos. Tus pedidos están en Fletes." />
    </Card>
  );
}
