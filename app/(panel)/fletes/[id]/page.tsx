import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardHeader, DataList, EmptyState, Notice, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconInfo, IconLock, IconTruck } from "@/components/icons";
import { AccionForm } from "@/components/panel/fletes/accion-form";
import { ChecklistFlete } from "@/components/panel/fletes/checklist-flete";
import { Historial, PropuestaCard } from "@/components/panel/fletes/piezas";
import { PropuestaRespuesta } from "@/components/panel/fletes/propuesta-respuesta";
import { ResultadoForm } from "@/components/panel/fletes/resultado-form";
import { cancelarPedidoAction, resultadoPedidoAction } from "@/lib/fletes-actions";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { One, S } from "@/lib/schemas";
import { ESPECIE, ESTADO_PEDIDO, dinero, ventana, type Pedido } from "@/lib/fletes";
import { fecha, fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Pedido de flete" };

const ABIERTOS = ["pendiente", "en_gestion", "propuesto", "contactado"];

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const [ctx, { id }] = await Promise.all([requireContexto(), params]);
  if (!ctx.can("fletes.ver")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Sin acceso" description="Tu rol no tiene acceso a los fletes de este establecimiento." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  let p: Pedido;
  let op: S<"FleteOpciones">;
  try {
    [p, op] = await Promise.all([
      api<One<Pedido>>(`/establecimientos/${est}/fletes/pedidos/${id}`).then((r) => r.data),
      api<One<S<"FleteOpciones">>>(`/establecimientos/${est}/fletes/opciones`).then((r) => r.data),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState icon={<IconTruck size={24} />} title="No pudimos abrir el pedido" description={e.unreachable ? "No pudimos conectar con TROPILLA." : e.message} action={<Button href="/fletes">Volver</Button>} />
      </Card>
    );
  }
  const st = ESTADO_PEDIDO[p.estado];
  const gestiona = ctx.can("fletes.gestionar");
  const abierto = ABIERTOS.includes(p.estado);
  const propuestas = p.propuestas ?? [];
  const pendientes = propuestas.filter((x) => x.estado === "propuesta");
  const otras = propuestas.filter((x) => x.estado !== "propuesta");
  const hayAceptada = propuestas.some((x) => x.estado === "aceptada");

  return (
    <>
      <PageHeader
        title={`${p.origen.departamento_nombre} → ${p.destino.localidad}`}
        subtitle={
          <span>
            {nf.format(p.cabezas)} {ESPECIE[p.especie_codigo]?.toLowerCase()}
            {p.categoria ? ` (${p.categoria})` : ""} · {ventana(p.fecha_desde, p.fecha_hasta)} · {p.motivo_nombre}
          </span>
        }
        actions={
          <Button href="/fletes" variant="outline" icon={<IconArrowLeft size={16} />}>
            Fletes
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-5 py-4">
            <Badge tone={st.tone}>{st.label}</Badge>
            <p className="flex-1 text-[14px] text-muted">{st.ayuda}</p>
            {!p.en_corredor && <Badge tone="neutral">Lista de espera · fuera del corredor</Badge>}
          </div>

          {p.resultado && (
            <Notice tone={p.resultado.resultado === "acordado" ? "success" : "info"} title={p.resultado.resultado === "acordado" ? "Flete acordado" : "Cerrado sin acuerdo"}>
              {[
                p.resultado.costo ? `Costo ${dinero(p.resultado.costo)}` : null,
                p.resultado.km ? `${nf.format(p.resultado.km)} km` : null,
                p.resultado.costo_por_km ? `${dinero(p.resultado.costo_por_km)} por km` : null,
                p.resultado.nota,
              ]
                .filter(Boolean)
                .join(" · ")}{" "}
              Registrado {fechaHora(p.resultado.registrado_en)}.
            </Notice>
          )}

          {pendientes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[16px] font-semibold text-ink">Propuestas para decidir</h2>
              {pendientes.map((x) => (
                <PropuestaCard
                  key={x.id}
                  p={x}
                  acciones={gestiona ? <PropuestaRespuesta pedido={p.id} propuesta={x.id} transportista={x.transportista.nombre} motivos={op.motivos_rechazo ?? []} /> : undefined}
                />
              ))}
            </section>
          )}

          {otras.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[16px] font-semibold text-ink">{hayAceptada ? "Transportista elegido" : "Propuestas anteriores"}</h2>
              {otras
                .toSorted((a, b) => Number(b.estado === "aceptada") - Number(a.estado === "aceptada"))
                .map((x) => (
                  <PropuestaCard key={x.id} p={x} />
                ))}
            </section>
          )}

          {!propuestas.length && abierto && (
            <Card>
              <EmptyState
                icon={<IconTruck size={24} />}
                title="Todavía no hay propuestas"
                description="El equipo está buscando camiones que salgan cerca, vayan hacia tu destino y tengan lugar en tus fechas. Cuando haya una opción con la documentación verificada, te avisamos."
              />
            </Card>
          )}

          {gestiona && abierto && (
            <Card>
              <CardHeader title="Resultado" description="Cuando cierres con el transportista (o si no hubo acuerdo), registralo. Sirve para medir el piloto." />
              <ResultadoForm action={resultadoPedidoAction} pedido={p.id} puedeAcordar={hayAceptada} />
            </Card>
          )}

          <Card>
            <CardHeader title="Checklist del viaje" description="Diligencias a tu cargo. TROPILLA no emite el DT-e ni controla la carga." />
            <ul className="divide-y divide-border">
              {(p.checklist ?? []).map((it, i) => (
                <ChecklistFlete key={it.item} pedido={p.id} item={it} n={i + 1} editable={gestiona && p.estado !== "cancelado"} />
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Datos del pedido" />
            <div className="px-5 py-4">
              <DataList
                className="sm:grid-cols-1"
                items={[
                  { label: "Zona de carga", value: p.origen.departamento_nombre ?? p.origen.departamento_codigo },
                  { label: "Destino", value: `${p.destino.localidad}, ${p.destino.provincia_nombre}` },
                  { label: "Ventana de carga", value: `${fecha(p.fecha_desde)} al ${fecha(p.fecha_hasta)}` },
                  { label: "Hacienda", value: `${nf.format(p.cabezas)} ${ESPECIE[p.especie_codigo]?.toLowerCase()}${p.kg_promedio ? ` · ~${p.kg_promedio} kg` : ""}` },
                  { label: "Contacto", value: p.telefono_contacto },
                  ...(p.observaciones ? [{ label: "Observaciones", value: p.observaciones }] : []),
                  { label: "Pedido por", value: `${p.creado_por} · ${fechaHora(p.created_at)}` },
                ]}
              />
            </div>
            {p.consentimiento && (
              <p className="flex gap-2 border-t border-border px-5 py-3 text-[12.5px] text-muted">
                <IconInfo size={14} className="mt-0.5 shrink-0" />
                Aceptaste compartir datos mínimos (versión {String(p.consentimiento.version ?? "")}). Tu contacto solo llega al transportista cuya propuesta aceptes.
              </p>
            )}
            {gestiona && abierto && (
              <div className="border-t border-border px-5 py-3">
                <AccionForm action={cancelarPedidoAction} campos={{ pedido: p.id }} label="Cancelar pedido" variant="ghost" confirmar="¿Cancelar el pedido? Se retiran las propuestas pendientes." />
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Historial" description="Quién hizo qué y cuándo." />
            <Historial items={p.historial} />
          </Card>
        </div>
      </div>
    </>
  );
}

export default function PedidoFletePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido params={params} />
    </Suspense>
  );
}
