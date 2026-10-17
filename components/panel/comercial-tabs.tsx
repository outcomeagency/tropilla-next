import { Suspense } from "react";
import { FilterTabs } from "@/components/ui";
import { requireContexto } from "@/lib/establecimiento";
import { listConsultas } from "@/lib/data/consultas";

type Seccion = "ofertas" | "consultas" | "contratos" | "demandas" | "simulador" | "ventas" | "faena" | "precios" | "contrapartes";

function Tabs({ actual, consultas, precios = false, contrapartes = false }: { actual: Seccion; consultas: number | null | false; precios?: boolean; contrapartes?: boolean }) {
  return (
    <div className="mb-4">
      <FilterTabs
        label="Comercialización"
        items={[
          { href: "/comercializacion", label: "Ofertas", active: actual === "ofertas" },
          ...(consultas !== false ? [{ href: "/comercializacion/consultas", label: "Consultas", count: consultas || undefined, active: actual === "consultas" }] : []),
          { href: "/comercializacion/contratos", label: "Contratos a futuro", active: actual === "contratos" },
          { href: "/comercializacion/demandas", label: "Demandas que calzan", active: actual === "demandas" },
          ...(precios ? [{ href: "/comercializacion/simulador", label: "Simulador", active: actual === "simulador" }] : []),
          ...(precios ? [{ href: "/comercializacion/ventas", label: "Ventas", active: actual === "ventas" }] : []),
          ...(precios ? [{ href: "/comercializacion/faena", label: "Faena", active: actual === "faena" }] : []),
          ...(precios ? [{ href: "/comercializacion/precios", label: "Mis precios", active: actual === "precios" }] : []),
          ...(contrapartes ? [{ href: "/comercializacion/contrapartes", label: "Chequeo por CUIT", active: actual === "contrapartes" }] : []),
        ]}
      />
    </div>
  );
}

/** Consultas sólo para quien puede verlas (pueden traer precios: Claude Design, duda 21), con el número de nuevas. */
async function TabsConConsultas({ actual }: { actual: Seccion }) {
  const ctx = await requireContexto();
  const precios = ctx.can("comercial.precios");
  const contrapartes = ctx.can("contrapartes.consultar");
  if (!ctx.can("consultas.ver")) return <Tabs actual={actual} consultas={false} precios={precios} contrapartes={contrapartes} />;
  const nuevas = await listConsultas(ctx.activa.establecimiento_id, "nueva")
    .then((r) => r.data.length)
    .catch(() => null);
  return <Tabs actual={actual} consultas={nuevas} precios={precios} contrapartes={contrapartes} />;
}

/** Secciones de Comercialización. */
export function ComercialTabs({ actual }: { actual: Seccion }) {
  return (
    <Suspense fallback={<Tabs actual={actual} consultas={false} />}>
      <TabsConConsultas actual={actual} />
    </Suspense>
  );
}
