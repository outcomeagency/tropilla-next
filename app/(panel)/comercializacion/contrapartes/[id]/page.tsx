import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Notice, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconCheckCircle, IconClock, IconExternal, IconInfo, IconLock, IconSearch } from "@/components/icons";
import { ChecklistItem } from "@/components/panel/contrapartes/checklist-item";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { One, S } from "@/lib/schemas";
import type { Tone } from "@/lib/status";
import { fecha, fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Consulta de contraparte" };

type Consulta = S<"ConsultaContraparte">;

const ESTADO_FUENTE: Record<string, { label: string; tone: Tone; icon: React.ReactNode }> = {
  ok: { label: "Consultada", tone: "success", icon: <IconCheckCircle size={13} /> },
  sin_datos: { label: "Sin registros", tone: "info", icon: <IconInfo size={13} /> },
  no_configurada: { label: "Consulta manual", tone: "neutral", icon: <IconInfo size={13} /> },
  error: { label: "No respondió", tone: "warning", icon: <IconAlert size={13} /> },
};

const miles = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

/** Situación como texto + tono neutral/atención (nunca rojo "malo"): la persona interpreta con contexto. */
function Situacion({ n, texto }: { n: number | null | undefined; texto?: string }) {
  if (n == null) return <span className="text-muted">—</span>;
  return <Badge tone={n >= 2 ? "warning" : "neutral"}>{texto ?? `Situación ${n}`}</Badge>;
}

function periodoLargo(p: string) {
  const [y, m] = p.split("-");
  const mes = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][Number(m) - 1];
  return mes ? `${mes} ${y}` : p;
}

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const [ctx, { id }] = await Promise.all([requireContexto(), params]);
  if (!ctx.can("contrapartes.consultar")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Sin acceso" description="El chequeo por CUIT es del dueño y la administración." />
      </Card>
    );
  }
  let c: Consulta;
  try {
    c = (await api<One<Consulta>>(`/establecimientos/${ctx.activa.establecimiento_id}/contrapartes/consultas/${id}`)).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState icon={<IconSearch size={24} />} title="No pudimos abrir la consulta" description={e.unreachable ? "No pudimos conectar con TROPILLA." : e.message} action={<Button href="/comercializacion/contrapartes">Volver</Button>} />
      </Card>
    );
  }
  const i = c.informe;
  const b = i?.bcra;

  return (
    <>
      <PageHeader
        title={c.denominacion ?? (c.depurada_en ? "Consulta depurada" : "Sin denominación informada")}
        subtitle={
          <span className="tabular-nums">
            CUIT {c.cuit} · {c.tipo_persona === "humana" ? "Persona humana" : "Persona jurídica"} · {c.finalidad_nombre}
            {c.finalidad_detalle ? ` (${c.finalidad_detalle})` : ""} · consultó {c.consultado_por} el {fechaHora(c.created_at)}
          </span>
        }
        actions={
          <Button href="/comercializacion/contrapartes" variant="outline" icon={<IconArrowLeft size={16} />}>
            Consultas
          </Button>
        }
      />
      <div className="space-y-4">
        {!i ? (
          <Notice tone="info" title="El detalle de esta consulta ya se borró">
            Pasó el plazo de retención ({c.depurada_en ? `depurada el ${fechaHora(c.depurada_en)}` : ""}). Queda el registro de quién consultó, cuándo y para qué. Si la necesitás, hacé una consulta nueva.
          </Notice>
        ) : (
          <>
            <Notice tone="info" title="Datos informados por terceros, a la fecha de cada fuente">
              {i.avisos[0]} Verificá que la denominación coincida con tu contraparte.
            </Notice>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {i.fuentes.map((f) => {
                const st = ESTADO_FUENTE[f.estado] ?? ESTADO_FUENTE.error;
                return (
                  <div key={f.codigo} className="space-y-2 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-[14px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                        {f.nombre} <IconExternal size={13} />
                      </a>
                      <Badge tone={st.tone} icon={st.icon}>
                        {st.label}
                      </Badge>
                    </div>
                    <p className="text-muted">{f.mensaje}</p>
                    {f.consultado_en && (
                      <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
                        <IconClock size={13} /> Consultado {fechaHora(f.consultado_en)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <Card>
              <CardHeader title="Qué dicen las fuentes" description="Frases textuales a partir de lo informado. No califican a la contraparte." />
              <ul className="divide-y divide-border">
                {i.lectura.map((l) => (
                  <li key={l} className="px-5 py-3 text-[14px] text-ink">
                    {l}
                  </li>
                ))}
              </ul>
            </Card>

            {b?.actual && (
              <Card>
                <CardHeader title={`Deudas informadas · ${periodoLargo(b.actual.periodo)}`} description="BCRA, Central de Deudores. Montos en miles de pesos, como los publica el BCRA." />
                <Table minWidth={720}>
                  <thead>
                    <tr>
                      <Th>Entidad</Th>
                      <Th>Situación</Th>
                      <Th numeric>Monto (miles $)</Th>
                      <Th numeric>Días de atraso</Th>
                      <Th>Observaciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.actual.entidades.map((e) => (
                      <Tr key={e.entidad}>
                        <Td className="font-medium">{e.entidad}</Td>
                        <Td>
                          <Situacion n={e.situacion} texto={e.situacion_descripcion} />
                        </Td>
                        <Td numeric>{miles.format(e.monto_miles)}</Td>
                        <Td numeric>{e.dias_atraso ?? "—"}</Td>
                        <Td className="text-[13px] text-muted">
                          {[e.refinanciaciones && "Refinanciada", e.situacion_juridica && "Situación jurídica", e.proceso_judicial && "Proceso judicial", e.en_revision && "En revisión"].filter(Boolean).join(" · ") || "—"}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {b?.historial && (
                <Card>
                  <CardHeader title="Historial" description={`${b.historial.periodos.length} períodos publicados · situación más alta por mes`} />
                  <div className="max-h-[360px] overflow-y-auto">
                    <Table minWidth={420}>
                      <thead>
                        <tr>
                          <Th>Período</Th>
                          <Th>Situación más alta</Th>
                          <Th numeric>Entidades</Th>
                          <Th numeric>Total (miles $)</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.historial.periodos.map((p) => (
                          <Tr key={p.periodo}>
                            <Td className="tabular-nums">{periodoLargo(p.periodo)}</Td>
                            <Td>
                              <Situacion n={p.peor_situacion} />
                            </Td>
                            <Td numeric>{p.entidades}</Td>
                            <Td numeric>{miles.format(p.monto_total_miles)}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              )}
              {b && (
                <Card>
                  <CardHeader title="Cheques rechazados" description="Informados al BCRA. Rechazado no es lo mismo que denunciado (robo o extravío)." />
                  {b.cheques && b.cheques.total > 0 ? (
                    <Table minWidth={520}>
                      <thead>
                        <tr>
                          <Th>Causal</Th>
                          <Th>Rechazo</Th>
                          <Th numeric>Monto</Th>
                          <Th>Pago informado</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.cheques.causales.flatMap((k) =>
                          k.detalle.map((d) => (
                            <Tr key={`${k.causal}-${d.entidad}-${d.numero}`}>
                              <Td className="text-[13px]">{k.causal}</Td>
                              <Td className="tabular-nums">{fecha(d.fecha_rechazo)}</Td>
                              <Td numeric>{pesos.format(d.monto)}</Td>
                              <Td>{d.fecha_pago ? <span className="tabular-nums">{fecha(d.fecha_pago)}</span> : <Badge tone="warning">Sin pago informado</Badge>}</Td>
                            </Tr>
                          )),
                        )}
                      </tbody>
                    </Table>
                  ) : (
                    <CardBody>
                      <p className="text-[14px] text-muted">No figuran cheques rechazados informados.</p>
                    </CardBody>
                  )}
                </Card>
              )}
            </div>
          </>
        )}

        <Card>
          <CardHeader title="Checklist de la operación" description={`${c.checklist_hechos} de ${c.checklist_total} resueltos. Lo marcás vos: TROPILLA no verifica estos pasos.`} />
          <ol className="divide-y divide-border">
            {(c.checklist ?? []).map((it, n) => (
              <ChecklistItem key={it.item} consulta={c.id} item={it} n={n + 1} />
            ))}
          </ol>
        </Card>

        {i && (
          <Card>
            <CardHeader title="Para tener en cuenta" />
            <CardBody className="space-y-2 text-[14px] text-muted">
              {i.avisos.slice(1).map((a) => (
                <p key={a}>{a}</p>
              ))}
              {i.senales_desactivadas.map((s) => (
                <p key={s}>{s}</p>
              ))}
              <p>
                Consentimiento registrado (versión {c.consentimiento?.version}){c.consentimiento?.titular_autorizo ? ", con autorización del titular" : ""}.
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

/** Informe de una consulta de contraparte (TPA-72). */
export default function ConsultaContrapartePage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido params={props.params} />
    </Suspense>
  );
}
