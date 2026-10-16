import { FilterTabs } from "@/components/ui";

/** Sub-navegación de Hacienda: animales identificados, lotes de manejo y registro de eventos (estado en la URL). */
export function HaciendaTabs({ activo }: { activo: "animales" | "lotes" | "pesajes" | "eventos" }) {
  return (
    <div className="mb-5">
      <FilterTabs
        label="Secciones de hacienda"
        items={[
          { href: "/hacienda", label: "Animales", active: activo === "animales" },
          { href: "/hacienda/lotes", label: "Lotes", active: activo === "lotes" },
          { href: "/hacienda/pesajes", label: "Pesajes", active: activo === "pesajes" },
          { href: "/hacienda/eventos", label: "Eventos", active: activo === "eventos" },
        ]}
      />
    </div>
  );
}
