import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, CardHeader, EmptyState, FilterTabs, KpiCard, Notice, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconClock, IconShieldCheck, IconTruck } from "@/components/icons";
import { ConciergeTabs, SoloStaff } from "@/components/panel/fletes/concierge-tabs";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";
import { ESPECIE, ESTADO_PEDIDO, dinero, ventana, type EstadoPedido, type PedidoConcierge } from "@/lib/fletes";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Mesa de fletes" };

const FILTROS = [
  { v: "abiertos", label: "Abiertos" },
  { v: "pendiente", label: "Sin tomar" },
  { v: "propuesto", label: "Esperando al productor" },
  { v: "contactado", label: "En contacto" },
  { v: "cerrados", label: "Cerrados" },
] as const;

async function Contenido({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const [ctx, sp] = await Promise.all([requireContexto(), searchParams]);
  if (!ctx.me.usuario.es_staff) return <SoloStaff />;
  const filtro = FILTROS.find((x) => x.v === sp.estado)?.v ?? "abiertos";
  let r: S<"FleteConciergeResumen">;
  let pedidos: PedidoConcierge[];
  try {
    [r, pedidos] = await Promise.all([
      api<One<S<"FleteConciergeResumen">>>("/fletes/concierge/resumen").then((x) => x.data),
      api<Many<PedidoConcierge>>(`/fletes/concierge/pedidos?estado=${filtro}`).then((x) => x.data),
    ]);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState icon={<IconTruck size={24} />} title="No pudimos abrir la mesa" description={e.unreachable ? "No pudimos conectar con TROPILLA." : e.message} action={<Button href="/fletes/concierge">Reintentar</Button>} />
      </Card>
    );
  }
  const m = r.metricas;
  const porEstado = m?.pedidos_por_estado ?? {};

  return (
    <div className="space-y-4">
      {r.revision_legal === "pendiente" && (
        <Notice tone="warning" title="Revisión legal pendiente">
          Rol de TROPILLA (intermediario), seguro y responsabilidades todavía sin dictamen: operar el piloto en el corredor acotado, sin cobrar comisión y dejando todo registrado.
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={`pedidos · ${(porEstado.pendiente ?? 0) + (porEstado.en_gestion ?? 0)} sin propuesta`} value={m?.pedidos_total ?? 0} icon={<IconTruck size={20} />} />
        <KpiCard label="mediana hasta la primera propuesta" value={m?.horas_hasta_primera_propuesta != null ? `${m.horas_hasta_primera_propuesta} h` : "—"} icon={<IconClock size={20} />} />
        <KpiCard
          label={`acuerdos sobre cerrados · ${m?.cabezas_acordadas ?? 0} cabezas`}
          value={m?.tasa_acuerdo_pct != null ? `${m.tasa_acuerdo_pct} %` : "—"}
          icon={<IconCheckCircle size={20} />}
        />
        <KpiCard
          label={`transportistas documentados de ${m?.transportistas_activos ?? 0} · ${m?.disponibilidades_vigentes ?? 0} jaulas vigentes`}
          value={m?.transportistas_documentados ?? 0}
          icon={<IconShieldCheck size={20} />}
        />
      </div>
      <p className="text-[12.5px] text-muted">
        Costo medio acordado: {m?.costo_por_km ? `${dinero(m.costo_por_km)} por km (${m.acuerdos_con_costo} acuerdos con costo)` : "sin datos todavía"} · Pedidos fuera del corredor: {m?.pedidos_fuera_corredor ?? 0}
        {m?.rechazos_por_motivo?.length ? ` · Rechazos: ${m.rechazos_por_motivo.map((x) => `${x.motivo} (${x.n})`).join(", ")}` : ""}
      </p>

      <Card>
        <CardHeader title="Cola de pedidos" description="Los abiertos, por fecha de carga más próxima." />
        <div className="border-b border-border px-5 py-3">
          <FilterTabs
            label="Estado"
            items={FILTROS.map((x) => ({
              href: x.v === "abiertos" ? "/fletes/concierge" : `/fletes/concierge?estado=${x.v}`,
              label: x.label,
              count: x.v === "pendiente" || x.v === "propuesto" || x.v === "contactado" ? porEstado[x.v] || undefined : undefined,
              active: filtro === x.v,
            }))}
          />
        </div>
        {pedidos.length ? (
          <Table minWidth={900}>
            <thead>
              <tr>
                <Th>Establecimiento</Th>
                <Th>Ruta</Th>
                <Th>Carga</Th>
                <Th>Hacienda</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const st = ESTADO_PEDIDO[p.estado as EstadoPedido];
                return (
                  <Tr key={p.id}>
                    <Td className="font-medium">
                      <Link href={`/fletes/concierge/pedidos/${p.id}`} className="text-campo hover:underline">
                        {p.establecimiento?.nombre}
                      </Link>
                      <span className="block text-[12px] font-normal text-muted">
                        {p.contacto?.nombre} · {fechaHora(p.created_at)}
                      </span>
                    </Td>
                    <Td>
                      {p.origen.departamento_nombre} → {p.destino.localidad}
                      <span className="block text-[12px] text-muted">{p.destino.provincia_nombre}</span>
                    </Td>
                    <Td className="tabular-nums">{ventana(p.fecha_desde, p.fecha_hasta)}</Td>
                    <Td>
                      <span className="tabular-nums">{p.cabezas}</span> {ESPECIE[p.especie_codigo]?.toLowerCase()}
                      {p.categoria && <span className="block text-[12px] text-muted">{p.categoria}</span>}
                    </Td>
                    <Td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {!p.en_corredor && <span className="mt-1 block text-[12px] text-muted">Fuera del corredor</span>}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<IconTruck size={24} />} title="No hay pedidos en esta vista" description="Cuando un productor pida un flete, aparece acá." />
        )}
      </Card>
    </div>
  );
}

/** Mesa del concierge de fletes (TPA-73): cola de pedidos y métricas del piloto. Solo staff. */
export default function ConciergePage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  return (
    <>
      <PageHeader
        title="Mesa de fletes"
        subtitle="Piloto concierge de camiones jaula: pedidos, propuestas y resultados."
        actions={
          <Button href="/fletes" variant="outline" icon={<IconArrowLeft size={16} />}>
            Fletes
          </Button>
        }
      />
      <ConciergeTabs actual="pedidos" />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  );
}
