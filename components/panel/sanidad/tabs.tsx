import type { ReactNode } from "react";
import { FilterTabs } from "@/components/ui";

/** Sub-navegación de Sanidad (estado en la URL). */
export function SanidadTabs({ activo, children }: { activo: "resumen" | "plan" | "productos"; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <FilterTabs
        label="Secciones de sanidad"
        items={[
          { href: "/sanidad", label: "Resumen", active: activo === "resumen" },
          { href: "/sanidad/productos", label: "Productos", active: activo === "productos" },
        ]}
      />
      {children}
    </div>
  );
}
