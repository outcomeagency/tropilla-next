import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardBody, CardHeader, DataList, MockNotice, Notice, PageHeader, Progress, Table, Td, Th, Tr, TrustBadge, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconCheckCircle, IconExternal, IconGlobe, IconLock } from "@/components/icons";
import { EstadoContratoBadge, EstadoTomaBadge } from "@/components/panel/contratos/estado";
import { AccionesContrato } from "@/components/panel/contratos/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { getContrato } from "@/lib/data/contratos";
import { confirmarPagoAction, publicarContratoAction } from "@/lib/contrato-actions";
import { ars, ars2 } from "@/lib/contratos-calc";
import { getCatalogos } from "@/lib/data/catalogos";
import { fecha, fechaHora, fechaLarga, nf } from "@/lib/format";
import type { S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Contrato a futuro" };

const OK: Record<string, string> = {
  pago: "Anticipo confirmado: la toma quedó firme.",
  cancelado: "Contrato cancelado. Quedó registrado con su motivo.",
  version: "Versión nueva guardada con su huella. Si hubo recorte, avisales a los compradores el anticipo a devolver.",
  entrega: "Entrega cargada. Revisá la liquidación y confirmala con cada comprador.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; publicado?: string }> };

async function Detalle({ params, searchParams }: Props) {
  const ctx = await requireContexto();
  const { id } = await params;
  const sp = await searchParams;
  const res = await getContrato(ctx.activa.establecimiento_id, id);
  if (!res) notFound();
  const c = res.data;
  const t = c.terminos ?? {};
  const precios = ctx.can("comercial.precios");
  const gestiona = ctx.can("contratos.gestionar");
  const total = t.tokens_totales ?? 0;
  const pct = total ? Math.round(((c.tokens_comprometidos ?? 0) / total) * 100) : 0;
  const cat = await getCatalogos();
  const categoria = cat.categorias.find((x) => x.codigo === t.categoria)?.nombre ?? t.categoria;
  const tomas = c.tomas ?? [];
  const entrega = c.entrega as (S<"Entrega"> & { cabezas_entregadas?: number }) | null | undefined;
  const activo = !["cancelado", "liquidado", "incumplido"].includes(c.estado ?? "");

  return (
    <>
      <PageHeader
        title={c.lote?.nombre ?? "Contrato a futuro"}
        subtitle={`${c.codigo_publico ? `Código ${c.codigo_publico} · ` : ""}Versión ${c.version ?? 1} · entrega ${fechaLarga(t.fecha_entrega)}`}
        actions={<EstadoContratoBadge estado={c.estado} />}
      />
      {res.source === "mock" && (
        <div className="mb-4">
          <MockNotice what="los contratos" />
        </div>
      )}
      {sp.publicado && <div className="mb-4"><Notice tone="success" title="Contrato publicado">Los compradores con cuenta ya pueden ver el precio especial y tomar tokens.</Notice></div>}
      {sp.ok && OK[sp.ok] && <div className="mb-4"><Notice tone="success" title={OK[sp.ok]} /></div>}
      {c.estado === "cancelado" && c.motivo_estado && <div className="mb-4"><Notice tone="warning" title="Cancelado">{c.motivo_estado}</Notice></div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Tokens" description={`${nf.format(t.kg_gancho_totales ?? 0)} kg al gancho en ${total} tokens de ${t.kg_por_token ?? 100} kg`} />
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
                <span>
                  <span className="text-[24px] font-bold tabular-nums text-ink">{c.tokens_comprometidos ?? 0}</span> <span className="text-muted">tomados de {total}</span>
                </span>
                <span className="tabular-nums text-muted">{c.tokens_libres ?? 0} libres · {pct} %</span>
              </div>
              <Progress value={pct} label="Tokens tomados" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tomas" description={precios ? "Quién tomó, cuánto y el estado del anticipo. Sólo lo ven las partes." : undefined} />
            {tomas.length ? (
              <Table minWidth={640}>
                <thead>
                  <tr>
                    <Th>Comprador</Th>
                    <Th numeric>Tokens</Th>
                    {precios && <Th numeric>Anticipo</Th>}
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {tomas.map((x) => (
                    <Tr key={x.id}>
                      <Td>
                        <span className="font-medium text-ink">{x.comprador?.empresa ?? x.comprador?.nombre}</span>
                        <span className="block text-[12.5px] text-muted">
                          {x.comprador?.nombre} · {fecha(x.created_at)}
                        </span>
                      </Td>
                      <Td numeric>
                        {x.estado === "devuelta_parcial" && x.tokens_vigentes != null && x.tokens_vigentes !== x.tokens ? (
                          <>
                            <span className="text-muted line-through">{x.tokens}</span> {x.tokens_vigentes}
                          </>
                        ) : (
                          x.tokens
                        )}
                      </Td>
                      {precios && (
                        <Td numeric>
                          {ars.format(Number(x.anticipo_monto ?? 0))}
                          {Number(x.anticipo_a_devolver ?? 0) > 0 && <span className="block text-[12px] text-warning">Devolver {ars.format(Number(x.anticipo_a_devolver))}</span>}
                        </Td>
                      )}
                      <Td>
                        <EstadoTomaBadge estado={x.estado} />
                        {x.estado === "pago_informado" && x.vence_en && <span className="mt-1 block text-[12px] text-muted">Se libera el {fechaHora(x.vence_en)}</span>}
                        {gestiona && (x.estado === "pago_informado" || x.estado === "reservada") && (
                          <form action={confirmarPagoAction} className="mt-2">
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="toma_id" value={x.id} />
                            <button type="submit" className={buttonClass("secondary", "sm")}>
                              <IconCheckCircle size={16} /> Recibí el anticipo
                            </button>
                          </form>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="px-5 py-4 text-[14px] text-muted">{c.estado === "borrador" ? "Publicá el contrato para que los compradores puedan tomar tokens." : "Todavía nadie tomó tokens. Compartí el enlace con tus compradores."}</p>
            )}
          </Card>

          {entrega && (
            <Card>
              <CardHeader title="Entrega y liquidación" />
              <CardBody className="space-y-4">
                {entrega.dentro_tolerancia === false && (
                  <Notice tone="warning" title="Fuera de la tolerancia pactada">
                    La diferencia supera ±{t.tolerancia_pct} %: la liquidación queda a resolver entre las partes. Dejá una nota y adjuntá el romaneo.
                  </Notice>
                )}
                <DataList
                  items={[
                    { label: "Cabezas entregadas", value: entrega.cabezas_entregadas },
                    { label: "Kg al gancho reales", value: nf.format(entrega.kg_gancho_reales ?? 0) },
                    { label: "Contratados", value: `${nf.format(total * (t.kg_por_token ?? 100))} kg` },
                    { label: "Factor", value: entrega.factor },
                  ]}
                />
                {precios && !!entrega.liquidacion?.length && (
                  <div className="overflow-x-auto rounded-[10px] border border-border">
                    <table className="w-full min-w-[560px] text-left text-[13.5px]">
                      <thead>
                        <tr className="text-[12px] uppercase tracking-[0.04em] text-muted">
                          <th className="px-4 py-2">Toma</th>
                          <th className="px-4 py-2 text-right">Kg efectivos</th>
                          <th className="px-4 py-2 text-right">Importe</th>
                          <th className="px-4 py-2 text-right">Anticipo</th>
                          <th className="px-4 py-2 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entrega.liquidacion.map((l) => (
                          <tr key={l.toma_id} className="border-t border-border tabular-nums">
                            <td className="px-4 py-2">{tomas.find((x) => x.id === l.toma_id)?.comprador?.empresa}</td>
                            <td className="px-4 py-2 text-right">{nf.format(Number(l.kg_efectivos))}</td>
                            <td className="px-4 py-2 text-right">{ars.format(Number(l.importe))}</td>
                            <td className="px-4 py-2 text-right">− {ars.format(Number(l.anticipo))}</td>
                            <td className="px-4 py-2 text-right font-semibold">{ars.format(Number(l.saldo))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[12.5px] text-muted">Al confirmar ambas partes se genera el PDF del trato en Documentos, con su huella.</p>
              </CardBody>
            </Card>
          )}

          {gestiona && activo && c.estado !== "borrador" && (
            <AccionesContrato id={c.id ?? id} cabezas={t.cabezas ?? 0} puedeEntrega={!entrega} puedeCancelar={!entrega} />
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <Card>
            <CardHeader title="Términos" />
            <CardBody>
              <DataList
                className="sm:grid-cols-1"
                items={[
                  { label: "Lote", value: `${t.cabezas} cab · ${categoria}` },
                  { label: "Peso vivo estimado", value: `${t.peso_vivo_estimado_kg} kg · rinde ${t.rendimiento_pct} %` },
                  ...(precios
                    ? [
                        { label: "Precio de referencia", value: `${ars2.format(Number(t.precio_referencia_kg))} / kg gancho` },
                        { label: "Precio especial", value: <span className="font-semibold">{`${ars2.format(Number(t.precio_especial_kg))} / kg (−${t.descuento_pct} %)`}</span> },
                        { label: "Anticipo", value: `${t.anticipo_pct} % · ${ars.format(Number(t.anticipo_por_token))} por token` },
                      ]
                    : [{ label: "Precios", value: <span className="inline-flex items-center gap-1 text-muted"><IconLock size={14} /> Sólo dueño y administradores</span> }]),
                  { label: "Tolerancia", value: `± ${t.tolerancia_pct} % sobre kg reales` },
                  { label: "Tomas sin pago se liberan a las", value: `${t.toma_vencimiento_horas} h` },
                ]}
              />
            </CardBody>
          </Card>

          {c.estado === "borrador" && gestiona && (
            <Card>
              <CardHeader title="Publicar" description="Se registra la huella de estos términos. Cambiarlos después crea una versión nueva." />
              <CardBody className="space-y-3">
                <div className="rounded-[10px] border border-dashed border-border-strong bg-base p-4 text-[13.5px]">
                  <p className="font-semibold text-ink">Así lo ve un comprador</p>
                  <p className="mt-1 text-muted">
                    {nf.format(t.kg_gancho_totales ?? 0)} kg al gancho de {categoria?.toLowerCase()} · entrega {fechaLarga(t.fecha_entrega)} · {total} tokens de {t.kg_por_token} kg
                  </p>
                  <p className="mt-1 text-muted">Precio especial y anticipo: sólo con cuenta de comprador.</p>
                </div>
                <form action={publicarContratoAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={buttonClass("primary", "md", "w-full")}>
                    <IconGlobe size={18} /> Publicar contrato
                  </button>
                </form>
              </CardBody>
            </Card>
          )}

          {c.codigo_publico && (
            <Link href={`/es/contratos/${c.codigo_publico}`} target="_blank" className={buttonClass("outline", "md", "w-full")}>
              <IconExternal size={18} /> Ver como comprador
            </Link>
          )}

          {!!c.versiones?.length && (
            <Card>
              <CardHeader title="Versiones de los términos" />
              <ul className="divide-y divide-border">
                {c.versiones.map((v) => (
                  <li key={v.version} className="px-5 py-3 text-[13px]">
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">v{v.version}</span>
                      <span className="text-muted">{fecha(v.created_at)}</span>
                    </p>
                    <p className="text-muted">{v.motivo}</p>
                    {v.huella && (
                      <Link href={`/es/v/${v.huella}`} className="mt-1 inline-block break-all font-mono text-[11px] text-subtle hover:text-campo">
                        {v.huella.slice(0, 24)}…
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <div className="border-t border-border px-5 py-3">
                <TrustBadge nivel={c.confianza ?? "declarado"} />
              </div>
            </Card>
          )}
          {!precios && (
            <p className="flex gap-1.5 text-[12.5px] text-muted">
              <IconAlert size={14} className="mt-0.5 shrink-0" /> Algunos datos se ocultan por tu rol.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/** Detalle del contrato a futuro (TPA-56). */
export default function ContratoPage(props: Props) {
  return (
    <>
      <Link href="/comercializacion/contratos" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Contratos a futuro
      </Link>
      <Suspense fallback={<div className="h-[480px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Detalle {...props} />
      </Suspense>
    </>
  );
}
