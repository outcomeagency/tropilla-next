import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, DataList, EmptyState, KpiCard, Notice, PageHeader, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconDownload, IconFile, IconScale, IconSparkle } from "@/components/icons";
import { Adjuntar, AnularResultado, LiquidacionDialog, VincularVenta } from "@/components/panel/faena/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { getResultadoFaena, ventasParaFaena } from "@/lib/data/faena";
import { fecha, fechaHora } from "@/lib/format";
import { categoriaNombre } from "@/lib/catalogo";
import { dinero, ESTADO_ANIMAL, kg, ORIGEN, pct } from "@/lib/faena";

export const metadata: Metadata = { title: "Resultado de faena" };

type Venta = { id: string; fecha: string; contraparte?: string | null; modalidad?: string; cantidad?: number; precio_kg?: string | null; moneda?: string; kg_vivo?: string | null; neto_total?: string | null };

const OK: Record<string, string> = {
  registrado: "Resultado de faena registrado. Abajo ves la conciliación con la venta.",
  anulado: "Resultado anulado: queda en el historial con su motivo.",
};

function DocLink({ id, label }: { id?: string | null; label: string }) {
  if (!id) return <span className="text-muted">Sin adjuntar</span>;
  return (
    <Link href={`/documentos/${id}`} className="inline-flex items-center gap-1.5 font-medium text-link hover:underline">
      <IconFile size={15} /> {label}
    </Link>
  );
}

async function Contenido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const [ctx, { id }, sp] = await Promise.all([requireContexto(), params, searchParams]);
  if (!ctx.can("comercial.precios")) {
    return (
      <Card>
        <EmptyState title="Precios privados" description="Los romaneos y liquidaciones son visibles sólo para el dueño y la administración." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const [r, ventas] = await Promise.all([getResultadoFaena(est, id), ventasParaFaena(est)]);
  if (r.estado === "no_encontrado") notFound();
  if (r.estado !== "ok") {
    return (
      <Card>
        <EmptyState
          icon={<IconScale size={24} />}
          title="No pudimos abrir el resultado de faena"
          description={r.estado === "error" ? r.mensaje : "La API de este entorno todavía no publica el resultado de faena."}
          action={<Button href="/comercializacion/faena">Volver</Button>}
        />
      </Card>
    );
  }
  const d = r.data;
  const o = d.oficial;
  const c = d.conciliacion;
  const liq = d.liquidacion;
  const venta = c.venta as Venta | null | undefined;
  const vigente = d.estado === "vigente";
  const moneda = c.importe?.moneda ?? "ARS";
  const opciones = ventas.map((v) => ({
    id: v.id ?? "",
    etiqueta: `${fecha(v.fecha)} · ${v.contraparte ?? "Sin comprador"} · ${v.cantidad ?? "?"} ${categoriaNombre(v.categoria ?? "").toLowerCase()}${v.modalidad === "al_gancho" ? " · al gancho" : ""}`,
  }));
  const animalPorRes = new Map((c.animales ?? []).filter((a) => a.garron).map((a) => [a.garron as string, a]));
  const cab = c.cabezas;

  return (
    <>
      <PageHeader
        title={`${o.tropa_numero ? `Tropa ${o.tropa_numero}` : "Faena"} · ${o.frigorifico}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {!vigente && <Badge tone="danger">Anulado</Badge>}
            Faena del {fecha(o.fecha_faena)}
            {o.romaneo_numero && <> · romaneo {o.romaneo_numero}</>}
            {o.dte_numero && <> · DT-e {o.dte_numero}</>}
          </span>
        }
        actions={
          <>
            <a href={`/comercializacion/faena/${d.id}/exportar?formato=csv`} className={buttonClass("outline", "md")} download>
              <IconDownload size={16} /> CSV
            </a>
            <a href={`/comercializacion/faena/${d.id}/exportar?formato=pdf`} className={buttonClass("outline", "md")} download>
              <IconDownload size={16} /> PDF para el contador
            </a>
            {vigente && <AnularResultado id={d.id} />}
          </>
        }
      />
      <div className="space-y-6">
        {sp.ok && OK[sp.ok] && <Notice tone="success" title={OK[sp.ok]} />}
        {!vigente && (
          <Notice tone="danger" title={`Anulado el ${fechaHora(d.anulado_en)}`}>
            {d.anulado_motivo}
          </Notice>
        )}

        {/* ── Cálculo propio: conciliación ── */}
        <section aria-labelledby="conciliacion" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="conciliacion" className="text-[17px] font-semibold text-ink">
              Conciliación de la venta
            </h2>
            <Badge tone="info" icon={<IconSparkle size={13} />}>
              Cálculo de TROPILLA
            </Badge>
          </div>
          <p className="-mt-2 text-[13.5px] text-muted">{c.leyenda}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label={cab?.enviadas != null ? `reses de ${cab.enviadas} enviadas` : "reses informadas"} value={cab?.reses ?? 0} icon={<IconScale size={20} />} />
            <KpiCard label="enviados sin res en el romaneo" value={cab?.faltantes ?? 0} icon={<IconAlert size={20} />} />
            <KpiCard label={c.kg?.vivo ? `de reses sobre ${kg(c.kg.vivo)} vivos` : "kg de reses"} value={kg(c.kg?.reses)} />
            <KpiCard label={c.rinde_promedio_individual_pct ? `rinde de la tropa · ${pct(c.rinde_promedio_individual_pct)} promedio por animal` : "rinde de la tropa"} value={pct(c.rinde_pct)} />
          </div>
          {!!c.avisos?.length && (
            <Notice tone="warning" title="Diferencias para revisar">
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {c.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Notice>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="overflow-hidden">
              <CardHeader title="Animales enviados y reses" description="Cada animal de la venta con su garrón, el último peso vivo registrado y el rinde. Los faltantes no aparecen en el romaneo o su caravana no se leyó." />
              {c.animales?.length ? (
                <Table minWidth={640}>
                  <thead>
                    <tr>
                      <Th>Animal</Th>
                      <Th>Garrón</Th>
                      <Th numeric>Peso vivo</Th>
                      <Th numeric>Res</Th>
                      <Th numeric>Rinde</Th>
                      <Th>Estado</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.animales.map((a) => {
                      const st = !venta && a.estado === "conciliado" ? { label: "Asociado", tone: "info" as const } : (ESTADO_ANIMAL[a.estado ?? ""] ?? ESTADO_ANIMAL.conciliado);
                      return (
                        <Tr key={a.animal_id}>
                          <Td>
                            <Link href={`/hacienda/${a.animal_id}`} className="font-medium text-ink hover:text-campo hover:underline">
                              {a.identificacion ?? "Sin caravana"}
                            </Link>
                            {a.categoria && <span className="block text-[12.5px] text-muted">{categoriaNombre(a.categoria)}</span>}
                          </Td>
                          <Td className="tabular-nums">{a.garron ?? "—"}</Td>
                          <Td numeric className="whitespace-nowrap">
                            {kg(a.peso_vivo_kg)}
                            {a.peso_vivo_fecha && <span className="block text-[12px] text-muted">{fecha(a.peso_vivo_fecha)}</span>}
                          </Td>
                          <Td numeric className="whitespace-nowrap">{kg(a.peso_res_kg)}</Td>
                          <Td numeric className="whitespace-nowrap">{pct(a.rinde_pct)}</Td>
                          <Td>
                            <Badge tone={st.tone} icon={a.estado === "faltante" ? <IconAlert size={13} /> : undefined}>
                              {st.label}
                            </Badge>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : (
                <EmptyState
                  title={venta ? "La venta no tiene animales individuales" : "Vinculá la venta para conciliar"}
                  description={
                    venta
                      ? "La venta se registró por cantidad, sin caravanas: se compara la cantidad de cabezas y los kilos."
                      : "Elegí la venta de esta tropa: TROPILLA compara los animales que mandaste con las reses que informa el frigorífico."
                  }
                />
              )}
              {(cab?.sin_asociar ?? 0) > 0 && (
                <p className="border-t border-border px-5 py-3 text-[13px] text-muted">
                  {cab?.sin_asociar === 1 ? "1 res no está asociada" : `${cab?.sin_asociar} reses no están asociadas`} a ningún animal tuyo (sin caravana en el romaneo o con una que no coincide).
                </p>
              )}
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Venta" description={venta ? "Condiciones registradas en Ventas." : "Sin venta vinculada."} />
                <CardBody className="space-y-4">
                  {venta && (
                    <DataList
                      className="sm:grid-cols-2"
                      items={[
                        { label: "Comprador", value: venta.contraparte ?? "—" },
                        { label: "Fecha", value: fecha(venta.fecha) },
                        { label: "Modalidad", value: venta.modalidad === "al_gancho" ? "Al gancho" : "En pie" },
                        { label: "Precio pactado", value: venta.precio_kg ? `${dinero(venta.precio_kg, venta.moneda)}/kg` : "—" },
                        { label: "Cabezas", value: venta.cantidad ?? "—" },
                        { label: "Kg vivos", value: kg(venta.kg_vivo) },
                      ]}
                    />
                  )}
                  {vigente && <VincularVenta id={d.id} rowVersion={d.row_version} ventas={opciones} actual={d.operacion_id} />}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Importes" description="Lo pactado contra lo que liquidó el frigorífico." />
                <CardBody>
                  <dl className="space-y-2.5 text-[14px]">
                    {[
                      ["Esperado al gancho", dinero(c.importe?.esperado_al_gancho, moneda), venta?.modalidad === "al_gancho" ? "kg de reses × precio pactado" : "Sólo para ventas al gancho"],
                      ["Bruto liquidado", dinero(c.importe?.liquidado_bruto, moneda), null],
                      ["Deducciones", dinero(c.importe?.deducciones, moneda), null],
                      ["Neto liquidado", dinero(c.importe?.liquidado_neto, moneda), null],
                    ].map(([l, v, h]) => (
                      <div key={l} className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted">
                          {l}
                          {h && <span className="block text-[12px] text-subtle">{h}</span>}
                        </dt>
                        <dd className="font-semibold tabular-nums text-ink">{v}</dd>
                      </div>
                    ))}
                    {c.importe?.diferencia_bruto_vs_esperado != null && (
                      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
                        <dt className="font-semibold text-ink">Diferencia del bruto</dt>
                        <dd className={Number(c.importe.diferencia_bruto_vs_esperado) < 0 ? "font-bold tabular-nums text-danger" : "font-bold tabular-nums text-success"}>
                          {dinero(c.importe.diferencia_bruto_vs_esperado, moneda)}
                        </dd>
                      </div>
                    )}
                    {c.kg?.diferencia_liquidados_vs_reses != null && (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted">Kg liquidados − kg de reses</dt>
                        <dd className="font-semibold tabular-nums text-ink">{kg(c.kg.diferencia_liquidados_vs_reses)}</dd>
                      </div>
                    )}
                  </dl>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        {/* ── Dato oficial del frigorífico ── */}
        <section aria-labelledby="oficial" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="oficial" className="text-[17px] font-semibold text-ink">
              Dato del frigorífico
            </h2>
            <Badge tone="neutral" icon={<IconFile size={13} />}>
              {ORIGEN[d.origen] ?? d.origen}
            </Badge>
          </div>
          <p className="-mt-2 text-[13.5px] text-muted">
            {o.leyenda} {d.origen_leyenda}.
          </p>
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader
                title="Romaneo"
                description="Una fila por res, como la informó el frigorífico. No se edita: si hay un error, se anula y se vuelve a cargar."
                action={
                  <span className="text-[13px] tabular-nums text-muted">
                    {o.totales?.reses ?? 0} reses · {kg(o.totales?.kg)}
                  </span>
                }
              />
              <Table minWidth={860}>
                <thead>
                  <tr>
                    <Th>Garrón</Th>
                    <Th>RFID / caravana</Th>
                    <Th numeric>Media A</Th>
                    <Th numeric>Media B</Th>
                    <Th numeric>Res</Th>
                    <Th>Categoría</Th>
                    <Th>Tipificación</Th>
                    <Th>Decomiso</Th>
                  </tr>
                </thead>
                <tbody>
                  {(o.reses ?? []).map((x) => {
                    const a = x.garron ? animalPorRes.get(x.garron) : undefined;
                    return (
                      <Tr key={x.orden ?? x.garron}>
                        <Td className="font-medium tabular-nums">{x.garron}</Td>
                        <Td>
                          <span className="tabular-nums">{x.identificacion ?? "—"}</span>
                          {x.animal_id ? (
                            <Link href={`/hacienda/${x.animal_id}`} className="block text-[12.5px] text-link hover:underline">
                              {a?.identificacion && a.identificacion !== x.identificacion ? `Animal ${a.identificacion}` : "Ver animal"}
                            </Link>
                          ) : (
                            x.identificacion && <span className="block text-[12.5px] text-warning">Sin asociar</span>
                          )}
                        </Td>
                        <Td numeric className="whitespace-nowrap">{kg(x.media_a_kg)}</Td>
                        <Td numeric className="whitespace-nowrap">{kg(x.media_b_kg)}</Td>
                        <Td numeric className="whitespace-nowrap font-semibold">
                          {kg(x.peso_kg)}
                        </Td>
                        <Td>{x.categoria ?? "—"}</Td>
                        <Td>{x.tipificacion ?? "—"}</Td>
                        <Td>{x.decomiso ?? "—"}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Tropa" />
                <CardBody>
                  <DataList
                    items={[
                      { label: "Frigorífico", value: o.frigorifico },
                      { label: "CUIT", value: o.frigorifico_cuit ?? "—" },
                      { label: "Establecimiento faenador", value: o.faenador_numero ?? "—" },
                      { label: "Cabezas declaradas", value: o.cabezas_declaradas ?? "—" },
                      { label: "Tipificador", value: o.tipificador ?? "—" },
                      { label: "Original", value: <DocLink id={d.documento_id} label="Romaneo" /> },
                    ]}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Liquidación y factura" description="Tal como las emitió el frigorífico o la consignataria." />
                <CardBody className="space-y-4">
                  {liq ? (
                    <dl className="space-y-2 text-[14px]">
                      {[
                        ["N.º / fecha", `${liq.numero ?? "—"}${liq.fecha ? ` · ${fecha(liq.fecha)}` : ""}`],
                        ["Kg × precio", `${kg(liq.kg)} × ${liq.precio_kg ? dinero(liq.precio_kg, liq.moneda ?? "ARS") : "—"}`],
                        ["Bruto", dinero(liq.bruto, liq.moneda ?? "ARS")],
                        ...(liq.deducciones ?? []).map((x) => [`− ${x.concepto}`, dinero(x.importe, liq.moneda ?? "ARS")]),
                        ["Neto", dinero(liq.neto, liq.moneda ?? "ARS")],
                      ].map(([l, v]) => (
                        <div key={l} className="flex items-baseline justify-between gap-3">
                          <dt className="text-muted">{l}</dt>
                          <dd className="tabular-nums text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-[14px] text-muted">Todavía no cargaste la liquidación. Suele llegar unos días después del romaneo.</p>
                  )}
                  <DataList
                    items={[
                      { label: "Liquidación (archivo)", value: <DocLink id={d.liquidacion_documento_id} label="Liquidación" /> },
                      { label: "Factura", value: <DocLink id={d.factura_documento_id} label="Factura" /> },
                    ]}
                  />
                  {vigente && (
                    <div className="flex flex-wrap gap-2">
                      <LiquidacionDialog id={d.id} rowVersion={d.row_version} valores={liq ?? null} emisorSugerido={o.frigorifico} />
                      <Adjuntar id={d.id} rowVersion={d.row_version} cual="liquidacion" reemplaza={!!d.liquidacion_documento_id} />
                      {ctx.can("documentos.fiscal") && <Adjuntar id={d.id} rowVersion={d.row_version} cual="factura" reemplaza={!!d.factura_documento_id} />}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/** Detalle del resultado de faena (TPA-67): conciliación (cálculo propio) separada del dato oficial del frigorífico. */
export default function ResultadoFaenaPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  return (
    <>
      <Link href="/comercializacion/faena" className={buttonClass("ghost", "sm", "mb-3")}>
        <IconArrowLeft size={16} /> Faena
      </Link>
      <Suspense
        fallback={
          <div className="space-y-4" aria-hidden="true">
            <div className="h-[72px] rounded-[10px] border border-border bg-surface" />
            <div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />
          </div>
        }
      >
        <Contenido params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
