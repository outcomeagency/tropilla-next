import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardHeader, DataList, EmptyState, Notice, PageHeader } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconPhone, IconShieldCheck, IconTruck } from "@/components/icons";
import { AccionForm } from "@/components/panel/fletes/accion-form";
import { ProponerForm } from "@/components/panel/fletes/concierge-forms";
import { SoloStaff } from "@/components/panel/fletes/concierge-tabs";
import { Criterios, Historial, PropuestaCard } from "@/components/panel/fletes/piezas";
import { ResultadoForm } from "@/components/panel/fletes/resultado-form";
import { resultadoConciergeAction, retirarPropuestaAction, tomarPedidoAction } from "@/lib/fletes-actions";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { Many, One } from "@/lib/schemas";
import { ESPECIE, ESTADO_PEDIDO, dinero, ventana, type PedidoConcierge, type Transportista } from "@/lib/fletes";
import { fecha, fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Pedido · mesa de fletes" };

const ABIERTOS = ["pendiente", "en_gestion", "propuesto", "contactado"];

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const [ctx, { id }] = await Promise.all([requireContexto(), params]);
  if (!ctx.me.usuario.es_staff) return <SoloStaff />;
  let p: PedidoConcierge;
  let transportistas: Transportista[];
  try {
    [p, transportistas] = await Promise.all([
      api<One<PedidoConcierge>>(`/fletes/concierge/pedidos/${id}`).then((r) => r.data),
      api<Many<Transportista>>("/fletes/concierge/transportistas").then((r) => r.data),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState icon={<IconTruck size={24} />} title="No pudimos abrir el pedido" description={e.unreachable ? "No pudimos conectar con TROPILLA." : e.message} action={<Button href="/fletes/concierge">Volver</Button>} />
      </Card>
    );
  }
  const st = ESTADO_PEDIDO[p.estado];
  const abierto = ABIERTOS.includes(p.estado);
  const puedeProponer = ["pendiente", "en_gestion", "propuesto"].includes(p.estado);
  const propuestas = p.propuestas ?? [];
  const yaPropuestos = new Set(propuestas.filter((x) => x.estado === "propuesta").map((x) => x.transportista.id));
  const documentados = transportistas.filter((t) => t.activo && t.documentacion_completa && !yaPropuestos.has(t.id));
  const sugerencias = p.sugerencias ?? [];

  return (
    <>
      <PageHeader
        title={`${p.origen.departamento_nombre} → ${p.destino.localidad}`}
        subtitle={
          <span>
            {p.establecimiento?.nombre} · {nf.format(p.cabezas)} {ESPECIE[p.especie_codigo]?.toLowerCase()} · {ventana(p.fecha_desde, p.fecha_hasta)}
          </span>
        }
        actions={
          <Button href="/fletes/concierge" variant="outline" icon={<IconArrowLeft size={16} />}>
            Mesa
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-5 py-4">
            <Badge tone={st.tone}>{st.label}</Badge>
            <p className="flex-1 text-[14px] text-muted">{p.estado === "pendiente" ? "Nadie lo tomó todavía." : st.ayuda}</p>
            {!p.en_corredor && <Badge tone="neutral">Fuera del corredor</Badge>}
            {p.estado === "pendiente" && <AccionForm action={tomarPedidoAction} campos={{ pedido: p.id }} label="Tomar pedido" variant="primary" />}
          </div>

          {puedeProponer && (
            <Card>
              <CardHeader title="Sugerencias de matching" description="Disponibilidades abiertas con fechas en común, misma especie, salida dentro del radio y destino compatible. Ordenadas por puntaje; solo se proponen con documentación completa." />
              {sugerencias.length ? (
                <ul className="divide-y divide-border">
                  {sugerencias.map((s) => (
                    <li key={s.disponibilidad_id} className="space-y-3 px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link href={`/fletes/concierge/transportistas/${s.transportista_id}`} className="text-[15px] font-semibold text-ink hover:underline">
                            {s.transportista_nombre}
                          </Link>
                          <p className="text-[13px] text-muted tabular-nums">
                            {s.capacidad_cabezas} cabezas · {s.distancia_salida_km != null ? `sale a ~${s.distancia_salida_km} km` : "sin distancia"} · {ventana(s.fechas_en_comun?.desde ?? "", s.fechas_en_comun?.hasta ?? "")}
                            {s.tarifa_km ? ` · ${dinero(s.tarifa_km)}/km` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.es_retorno && <Badge tone="primary">Retorno</Badge>}
                          <Badge tone={s.proponible ? "success" : "warning"}>{s.puntaje} / 100</Badge>
                        </div>
                      </div>
                      <Criterios c={s} />
                      {yaPropuestos.has(s.transportista_id ?? "") ? (
                        <p className="text-[13px] text-muted">Ya tiene una propuesta pendiente en este pedido.</p>
                      ) : s.proponible ? (
                        <ProponerForm pedido={p.id} transportistaId={s.transportista_id} disponibilidadId={s.disponibilidad_id} min={p.fecha_desde} max={p.fecha_hasta} sugerida={s.fechas_en_comun?.desde ?? p.fecha_desde} />
                      ) : (
                        <p className="flex items-center gap-1.5 text-[13px] text-warning">
                          <IconAlert size={14} /> Completá la verificación de documentos antes de proponerlo.{" "}
                          <Link href={`/fletes/concierge/transportistas/${s.transportista_id}`} className="font-medium underline">
                            Ir al transportista
                          </Link>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<IconTruck size={24} />} title="Sin disponibilidades compatibles" description="Llamá a transportistas del corredor y cargá su disponibilidad, o proponé uno coordinado por teléfono." />
              )}
            </Card>
          )}

          {puedeProponer && (
            <Card>
              <CardHeader title="Propuesta coordinada por teléfono" description="Para un transportista sin disponibilidad cargada. Ruta, fecha y capacidad las confirmaste vos por contacto directo." />
              <div className="px-5 py-4">
                {documentados.length ? (
                  <ProponerForm pedido={p.id} min={p.fecha_desde} max={p.fecha_hasta} sugerida={p.fecha_desde} transportistas={documentados.map((t) => ({ id: t.id, nombre: t.nombre }))} />
                ) : (
                  <p className="text-[14px] text-muted">
                    No hay transportistas activos con documentación completa.{" "}
                    <Link href="/fletes/concierge/transportistas" className="font-medium text-campo hover:underline">
                      Cargar o verificar transportistas
                    </Link>
                  </p>
                )}
              </div>
            </Card>
          )}

          {propuestas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[16px] font-semibold text-ink">Propuestas enviadas</h2>
              {propuestas.map((x) => (
                <PropuestaCard
                  key={x.id}
                  p={x}
                  concierge
                  acciones={x.estado === "propuesta" ? <AccionForm action={retirarPropuestaAction} campos={{ propuesta: x.id, pedido: p.id }} label="Retirar propuesta" variant="ghost" confirmar="¿Retirar esta propuesta?" /> : undefined}
                />
              ))}
            </section>
          )}

          {abierto && (
            <Card>
              <CardHeader title="Registrar resultado" description="Si el productor te lo contó por teléfono, cerralo vos. Queda a tu nombre." />
              <ResultadoForm action={resultadoConciergeAction} pedido={p.id} puedeAcordar={propuestas.some((x) => x.estado === "aceptada")} />
            </Card>
          )}
          {p.resultado && (
            <Notice tone={p.resultado.resultado === "acordado" ? "success" : "info"} title={p.resultado.resultado === "acordado" ? "Acordado" : "Sin acuerdo"}>
              {[p.resultado.costo ? dinero(p.resultado.costo) : null, p.resultado.km ? `${p.resultado.km} km` : null, p.resultado.costo_por_km ? `${dinero(p.resultado.costo_por_km)}/km` : null, p.resultado.nota].filter(Boolean).join(" · ")}
            </Notice>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Productor" />
            <div className="space-y-3 px-5 py-4">
              <DataList
                className="sm:grid-cols-1"
                items={[
                  { label: "Establecimiento", value: `${p.establecimiento?.nombre}${p.establecimiento?.localidad ? ` · ${p.establecimiento.localidad}` : ""}` },
                  { label: "Contacto", value: `${p.contacto?.nombre} · ${p.contacto?.email}` },
                ]}
              />
              <a href={`tel:${(p.contacto?.telefono ?? "").replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-campo hover:underline">
                <IconPhone size={15} /> {p.contacto?.telefono}
              </a>
              <p className="flex gap-2 text-[12.5px] text-muted">
                <IconShieldCheck size={14} className="mt-0.5 shrink-0" />
                Consintió compartir datos mínimos con los transportistas que evalúes (v. {String(p.consentimiento?.version ?? "")}). Su contacto pasa al transportista solo si acepta la propuesta.
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Pedido" />
            <div className="px-5 py-4">
              <DataList
                className="sm:grid-cols-1"
                items={[
                  { label: "Motivo", value: p.motivo_nombre },
                  { label: "Zona de carga", value: p.origen.departamento_nombre ?? p.origen.departamento_codigo },
                  { label: "Destino", value: `${p.destino.localidad}, ${p.destino.provincia_nombre}` },
                  { label: "Ventana", value: `${fecha(p.fecha_desde)} al ${fecha(p.fecha_hasta)}` },
                  { label: "Hacienda", value: `${nf.format(p.cabezas)} ${ESPECIE[p.especie_codigo]?.toLowerCase()}${p.categoria ? ` · ${p.categoria}` : ""}${p.kg_promedio ? ` · ~${p.kg_promedio} kg` : ""}` },
                  ...(p.jaula_preferida ? [{ label: "Jaula preferida", value: p.jaula_preferida }] : []),
                  ...(p.observaciones ? [{ label: "Observaciones", value: p.observaciones }] : []),
                  { label: "Recibido", value: fechaHora(p.created_at) },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Bitácora" description="Registro inalterable de cada acción." />
            <Historial items={p.historial} />
          </Card>
        </div>
      </div>
    </>
  );
}

export default function ConciergePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido params={params} />
    </Suspense>
  );
}
