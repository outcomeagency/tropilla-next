import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, CardHeader, EmptyState, FilterTabs, Notice, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconLock, IconPlus, IconTruck, IconUsers } from "@/components/icons";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";
import { ESPECIE, ESTADO_PEDIDO, ventana, type Pedido } from "@/lib/fletes";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Fletes" };

type Filtro = "abiertos" | "cerrados";

async function Contenido({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const [ctx, sp] = await Promise.all([requireContexto(), searchParams]);
  if (!ctx.can("fletes.ver")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Sin acceso a fletes" description="Tu rol no tiene acceso a los pedidos de flete de este establecimiento." />
      </Card>
    );
  }
  const filtro: Filtro = sp.estado === "cerrados" ? "cerrados" : "abiertos";
  const est = ctx.activa.establecimiento_id;
  const pedidosP = api<Many<Pedido>>(`/establecimientos/${est}/fletes/pedidos?estado=${filtro}&limit=50`).then((r) => r.data);
  let op: S<"FleteOpciones">;
  let pedidos: Pedido[];
  try {
    [op, pedidos] = await Promise.all([api<One<S<"FleteOpciones">>>(`/establecimientos/${est}/fletes/opciones`).then((r) => r.data), pedidosP]);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState
          icon={<IconTruck size={24} />}
          title={e.routeMissing ? "Los fletes todavía no están disponibles" : "No pudimos cargar los fletes"}
          description={e.routeMissing ? "La API de este entorno aún no los publica." : e.unreachable ? "No pudimos conectar con TROPILLA." : e.message}
          action={<Button href="/fletes">Reintentar</Button>}
        />
      </Card>
    );
  }
  const puedePedir = ctx.can("fletes.gestionar");
  const corredor = op.corredor?.provincias?.map((p) => p.nombre).join(", ");

  return (
    <div className="space-y-4">
      <Notice tone="info" title={`Piloto concierge${corredor ? ` · corredor ${corredor}` : ""}`}>
        Contanos qué hacienda movés, desde qué zona, hacia dónde y en qué fechas. Una persona del equipo busca camiones jaula compatibles, verifica la documentación del transportista y te
        propone opciones. Vos decidís. {op.avisos?.[0]}
        {!op.en_corredor && " Tu establecimiento está fuera del corredor del piloto: el pedido queda en lista de espera y te avisamos si podemos ayudarte."}
      </Notice>

      <Card>
        <CardHeader
          title="Mis pedidos"
          description="Seguimiento de cada pedido, propuestas y resultado."
          action={
            puedePedir && (
              <Button href="/fletes/nuevo" size="sm" icon={<IconPlus size={15} />}>
                Pedir flete
              </Button>
            )
          }
        />
        <div className="border-b border-border px-5 py-3">
          <FilterTabs
            label="Estado"
            items={[
              { href: "/fletes", label: "En curso", active: filtro === "abiertos" },
              { href: "/fletes?estado=cerrados", label: "Cerrados", active: filtro === "cerrados" },
            ]}
          />
        </div>
        {pedidos.length ? (
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Ruta</Th>
                <Th>Fechas</Th>
                <Th>Hacienda</Th>
                <Th>Estado</Th>
                <Th>Pedido</Th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const st = ESTADO_PEDIDO[p.estado];
                return (
                  <Tr key={p.id}>
                    <Td className="font-medium">
                      <Link href={`/fletes/${p.id}`} className="text-campo hover:underline">
                        {p.origen.departamento_nombre} → {p.destino.localidad}
                      </Link>
                      <span className="block text-[12px] font-normal text-muted">
                        {p.destino.provincia_nombre} · {p.motivo_nombre}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{ventana(p.fecha_desde, p.fecha_hasta)}</Td>
                    <Td>
                      <span className="tabular-nums">{p.cabezas}</span> {ESPECIE[p.especie_codigo]?.toLowerCase()}
                      {p.categoria && <span className="block text-[12px] text-muted">{p.categoria}</span>}
                    </Td>
                    <Td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {!!p.propuestas_pendientes && (
                        <span className="mt-1 block text-[12px] font-medium text-warning">
                          {p.propuestas_pendientes === 1 ? "1 propuesta para revisar" : `${p.propuestas_pendientes} propuestas para revisar`}
                        </span>
                      )}
                      {!p.en_corredor && <span className="mt-1 block text-[12px] text-muted">Lista de espera</span>}
                    </Td>
                    <Td className="text-muted">
                      {p.creado_por}
                      <span className="block text-[12px]">{fechaHora(p.created_at)}</span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<IconTruck size={24} />}
            title={filtro === "abiertos" ? "No tenés pedidos en curso" : "Todavía no hay pedidos cerrados"}
            description="Cuando tengas que mover hacienda, pedí el flete con unos días de margen: cuanto más amplia la ventana de fechas, más opciones aparecen."
            action={
              puedePedir && filtro === "abiertos" ? (
                <Button href="/fletes/nuevo" icon={<IconPlus size={16} />}>
                  Pedir flete
                </Button>
              ) : undefined
            }
          />
        )}
      </Card>

      {ctx.me.usuario.es_staff && (
        <Card>
          <CardHeader
            title="Mesa del concierge"
            description="Sos parte del equipo de TROPILLA: gestioná los pedidos de todos los establecimientos, transportistas y documentación."
            action={
              <Button href="/fletes/concierge" size="sm" variant="outline" icon={<IconUsers size={15} />}>
                Abrir mesa
              </Button>
            }
          />
        </Card>
      )}
    </div>
  );
}

/** Matching de camiones jaula (TPA-73): pedidos del productor. */
export default function FletesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  return (
    <>
      <PageHeader title="Fletes" subtitle="Camiones jaula compatibles con tu ruta, carga y fecha, con la documentación del transportista verificada." />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  );
}
