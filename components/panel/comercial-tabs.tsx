import { FilterTabs } from "@/components/ui";

/** Secciones de Comercialización. */
export function ComercialTabs({ actual }: { actual: "ofertas" | "contratos" }) {
  return (
    <div className="mb-4">
      <FilterTabs
        label="Comercialización"
        items={[
          { href: "/comercializacion", label: "Ofertas", active: actual === "ofertas" },
          { href: "/comercializacion/contratos", label: "Contratos a futuro", active: actual === "contratos" },
        ]}
      />
    </div>
  );
}
