import { FilterTabs } from "@/components/ui";

/** Sub-navegación de Hacienda: animales identificados y lotes de manejo (estado en la URL). */
export function HaciendaTabs({ activo }: { activo: "animales" | "lotes" }) {
  return (
    <div className="mb-5">
      <FilterTabs
        label="Secciones de hacienda"
        items={[
          { href: "/hacienda", label: "Animales", active: activo === "animales" },
          { href: "/hacienda/lotes", label: "Lotes", active: activo === "lotes" },
        ]}
      />
    </div>
  );
}
