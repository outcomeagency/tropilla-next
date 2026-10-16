import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr, Badge } from "@/components/ui";
import { IconLock } from "@/components/icons";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { Simulador } from "@/components/panel/simulador";
import { requireContexto } from "@/lib/establecimiento";
import { getCatalogos } from "@/lib/data/catalogos";
import { api } from "@/lib/api";
import type { Many, S } from "@/lib/schemas";
import type { SimEntradasForm } from "@/lib/simulador-actions";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Simulador de liquidación" };

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function param(cat: Awaited<ReturnType<typeof getCatalogos>>, clave: string, especie: string | null, def: string) {
  const p = cat.parametros.find((x) => x.clave === clave && (x.especie ?? null) === especie) ?? cat.parametros.find((x) => x.clave === clave);
  return p ? String(p.valor) : def;
}

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Los precios son del dueño y la administración" description="El simulador trabaja con precios de venta, que tu rol no ve. Pedile al dueño que haga la cuenta o que te dé acceso." />
      </Card>
    );
  }
  const [cat, guardadas] = await Promise.all([
    getCatalogos(),
    api<Many<S<"Simulacion">>>(`/establecimientos/${ctx.activa.establecimiento_id}/simulaciones?limit=10`).then((r) => r.data).catch(() => []),
  ]);
  const defaults = {
    BOV: { rendimiento: param(cat, "rendimiento_gancho_ref_pct", "BOV", "55"), desbaste: param(cat, "desbaste_max_pct", "BOV", "8") },
    BUB: { rendimiento: param(cat, "rendimiento_gancho_ref_pct", "BUB", "53"), desbaste: param(cat, "desbaste_max_pct", "BUB", "8") },
  };
  const inicial: SimEntradasForm = {
    especie: "BUB",
    cabezas: "30",
    pesoProm: "468",
    desbaste: defaults.BUB.desbaste,
    precioPie: "",
    rendimiento: defaults.BUB.rendimiento,
    precioGancho: "",
    iva: param(cat, "iva_hacienda_pct", null, "10.5"),
    flete: "",
    arranque: "",
    seguro: "",
    comision: "3",
  };
  return (
    <>
      <Simulador inicial={inicial} defaults={defaults} />
      {guardadas.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Simulaciones guardadas" />
          <Table minWidth={720}>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Fecha</Th>
                <Th numeric>Neto en pie</Th>
                <Th numeric>Neto al gancho</Th>
                <Th>Conviene</Th>
              </tr>
            </thead>
            <tbody>
              {guardadas.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium">{s.nombre ?? `${s.entradas?.cantidad ?? ""} cab. ${s.entradas?.especie === "BUB" ? "búfalos" : "bovinos"}`}</Td>
                  <Td className="text-[13px] text-muted">{fechaHora(s.created_at)}</Td>
                  <Td numeric>{s.resultado?.en_pie ? money.format(Number(s.resultado.en_pie.neto_total)) : "—"}</Td>
                  <Td numeric>{s.resultado?.al_gancho ? money.format(Number(s.resultado.al_gancho.neto_total)) : "—"}</Td>
                  <Td>{s.resultado?.conviene && s.resultado.conviene !== "igual" ? <Badge tone="success">{s.resultado.conviene === "al_gancho" ? "Al gancho" : "En pie"}</Badge> : <Badge>Igual</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}

/** Simulador en pie vs al gancho con la fórmula a la vista (TPA-45). Se usa sin registrar una venta. */
export default function SimuladorPage() {
  return (
    <>
      <PageHeader title="Comercialización" subtitle="Simulá cuánto te queda vendiendo en pie o al gancho, antes de negociar." />
      <ComercialTabs actual="simulador" />
      <Suspense fallback={<div className="h-[620px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
