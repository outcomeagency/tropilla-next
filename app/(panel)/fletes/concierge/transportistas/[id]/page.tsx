import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardHeader, DataList, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconShieldCheck, IconTruck } from "@/components/icons";
import { AccionForm } from "@/components/panel/fletes/accion-form";
import { DisponibilidadForm, DocumentoForm } from "@/components/panel/fletes/concierge-forms";
import { SoloStaff } from "@/components/panel/fletes/concierge-tabs";
import { Historial } from "@/components/panel/fletes/piezas";
import { activoTransportistaAction, cerrarDisponibilidadAction } from "@/lib/fletes-actions";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { One, S } from "@/lib/schemas";
import { dinero, ventana, type Transportista } from "@/lib/fletes";
import { fechaHora, hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Transportista · mesa de fletes" };

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const [ctx, { id }] = await Promise.all([requireContexto(), params]);
  if (!ctx.me.usuario.es_staff) return <SoloStaff />;
  let t: Transportista;
  let r: S<"FleteConciergeResumen">;
  try {
    [t, r] = await Promise.all([
      api<One<Transportista>>(`/fletes/concierge/transportistas/${id}`).then((x) => x.data),
      api<One<S<"FleteConciergeResumen">>>("/fletes/concierge/resumen").then((x) => x.data),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState icon={<IconTruck size={24} />} title="No pudimos abrir el transportista" description={e.unreachable ? "No pudimos conectar con TROPILLA." : e.message} action={<Button href="/fletes/concierge/transportistas">Volver</Button>} />
      </Card>
    );
  }
  const disp = t.disponibilidades ?? [];
  const docs = t.documentos ?? [];

  return (
    <>
      <PageHeader
        title={t.nombre}
        subtitle={`${t.contacto_nombre} · ${t.telefono}${t.cuit ? ` · CUIT ${t.cuit}` : ""}`}
        actions={
          <>
            <AccionForm
              action={activoTransportistaAction}
              campos={{ transportista: t.id, activo: t.activo ? "0" : "1" }}
              label={t.activo ? "Desactivar" : "Reactivar"}
              variant="ghost"
              size="md"
              confirmar={t.activo ? "Un transportista inactivo no aparece en las sugerencias ni se puede proponer. ¿Desactivar?" : undefined}
            />
            <Button href="/fletes/concierge/transportistas" variant="outline" icon={<IconArrowLeft size={16} />}>
              Transportistas
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Checklist documental"
              description="Verificación manual con el original a la vista o ante el organismo. No marques «verificado» por una foto ilegible."
              action={
                t.documentacion_completa ? (
                  <Badge tone="success" icon={<IconShieldCheck size={13} />}>
                    Completa y vigente
                  </Badge>
                ) : (
                  <Badge tone="warning" icon={<IconAlert size={13} />}>
                    Incompleta
                  </Badge>
                )
              }
            />
            <ul className="divide-y divide-border">
              {docs.map((d) => (
                <DocumentoForm key={`${d.item}-${d.actualizado_en ?? ""}`} transportista={t.id} doc={d} metodos={r.metodos_verificacion ?? []} />
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Disponibilidad de jaulas" description="Lo que alimenta las sugerencias de matching." />
            {disp.length ? (
              <Table minWidth={720}>
                <thead>
                  <tr>
                    <Th>Ruta</Th>
                    <Th>Fechas</Th>
                    <Th>Jaula</Th>
                    <Th>Tarifa</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {disp.map((d) => (
                    <Tr key={d.id}>
                      <Td>
                        {d.origen.departamento_nombre} → {d.destino_provincia_nombre ?? "cualquier destino"}
                        {d.es_retorno && <span className="block text-[12px] text-monte">Viaje de retorno</span>}
                      </Td>
                      <Td className="tabular-nums">{ventana(d.desde, d.hasta)}</Td>
                      <Td>
                        {d.jaula_nombre}
                        <span className="block text-[12px] text-muted tabular-nums">
                          {d.capacidad_cabezas} cab. · {d.especies.map((e) => (e === "BOV" ? "bovinos" : "búfalos")).join(" y ")}
                        </span>
                      </Td>
                      <Td className="tabular-nums">{d.tarifa_km ? `${dinero(d.tarifa_km)}/km` : "—"}</Td>
                      <Td>
                        {d.vigente ? (
                          <AccionForm action={cerrarDisponibilidadAction} campos={{ disponibilidad: d.id, transportista: t.id }} label="Cerrar" variant="ghost" />
                        ) : (
                          <Badge tone="neutral">{d.estado === "cerrada" ? "Cerrada" : "Vencida"}</Badge>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="px-5 py-4 text-[14px] text-muted">Sin disponibilidades cargadas.</p>
            )}
            <div className="border-t border-border">
              <DisponibilidadForm transportista={t.id} deptos={r.departamentos ?? []} provincias={r.provincias ?? []} jaulas={r.jaulas ?? []} base={t.base.departamento_codigo} hoy={hoyAR(new Date())} />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Datos" />
            <div className="px-5 py-4">
              <DataList
                className="sm:grid-cols-1"
                items={[
                  { label: "Base", value: t.base.departamento_nombre ?? t.base.departamento_codigo },
                  { label: "Contacto", value: `${t.contacto_nombre} · ${t.telefono}${t.email ? ` · ${t.email}` : ""}` },
                  { label: "Estado", value: t.activo ? "Activo" : "Inactivo" },
                  ...(t.notas ? [{ label: "Notas", value: t.notas }] : []),
                  { label: "Alta", value: fechaHora(t.created_at) },
                  { label: "Consentimiento", value: String(t.consentimiento?.texto ?? "—") },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Bitácora" description="Quién verificó qué y cuándo." />
            <Historial items={t.historial as { accion?: string; quien?: string; en?: string }[]} />
          </Card>
        </div>
      </div>
    </>
  );
}

export default function TransportistaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido params={params} />
    </Suspense>
  );
}
