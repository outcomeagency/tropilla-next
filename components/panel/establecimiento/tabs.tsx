import { FilterTabs } from "@/components/ui";

/** Sub-navegación de «Mi establecimiento» (estado en la URL). */
export function EstablecimientoTabs({ activo }: { activo: "datos" | "potreros" }) {
  return (
    <div className="mb-5">
      <FilterTabs
        label="Secciones del establecimiento"
        items={[
          { href: "/establecimiento", label: "Datos y zonas sanitarias", active: activo === "datos" },
          { href: "/establecimiento/potreros", label: "Potreros", active: activo === "potreros" },
        ]}
      />
    </div>
  );
}
