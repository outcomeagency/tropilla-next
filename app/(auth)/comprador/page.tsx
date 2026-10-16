import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CompradorShell } from "@/components/comprador/shell";
import { EstadoTomaBadge } from "@/components/panel/contratos/estado";
import { Card, CardHeader, EmptyState, Notice, buttonClass } from "@/components/ui";
import { IconCheckCircle, IconRoute } from "@/components/icons";
import { getSesionOpcional } from "@/lib/auth";
import { getComprador, getMisTomas } from "@/lib/data/comprador";
import { informarPagoAction } from "@/lib/comprador-actions";
import { ars } from "@/lib/contratos-calc";
import { fecha, fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Mis contratos" };

async function Contenido({ searchParams }: { searchParams: Promise<{ reservada?: string; pago?: string; error?: string }> }) {
  const me = await getSesionOpcional();
  if (!me) redirect("/ingresar?next=/comprador");
  const sp = await searchParams;
  const comprador = (await getComprador(me)).data;
  if (!comprador) redirect("/comprador/cuenta?next=/comprador");
  const { data: tomas } = await getMisTomas();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">Mis contratos</h1>
        <p className="mt-1 text-[15px] text-muted">
          {comprador.empresa} · tomas de tokens, anticipos y fechas de entrega.
        </p>
      </div>
      {sp.reservada && (
        <Notice tone="success" title="Tokens reservados">
          Coordiná el pago del anticipo directamente con el productor. Cuando lo hayas hecho, marcá «Pagué» para que confirme la recepción. Si no confirma dentro del plazo, la reserva se libera.
        </Notice>
      )}
      {sp.pago && <Notice tone="success" title="Avisamos al productor que pagaste. Cuando confirme «recibí», la toma queda firme." />}
      {sp.error && <Notice tone="danger" title="No pudimos registrar el pago informado.">{sp.error}</Notice>}
      <Card>
        <CardHeader title="Tomas" />
        {tomas.length ? (
          <ul className="divide-y divide-border">
            {tomas.map(({ toma: t, contrato: c }) => (
              <li key={t.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {c?.codigo ? (
                      <Link href={`/es/contratos/${c.codigo}`} className="hover:text-campo hover:underline">
                        {c.establecimiento?.nombre ?? c.categoria ?? `Contrato ${c.codigo}`}
                      </Link>
                    ) : (
                      "Contrato a futuro"
                    )}
                  </p>
                  <p className="text-[13px] tabular-nums text-muted">
                    {t.tokens_vigentes ?? t.tokens} tokens · {nf.format(t.kg ?? 0)} kg al gancho · entrega {fecha(c?.fecha_entrega)}
                  </p>
                  <p className="mt-1 text-[13.5px] text-ink">
                    Anticipo: <span className="font-semibold tabular-nums">{ars.format(Number(t.anticipo_monto ?? 0))}</span>
                    {Number(t.anticipo_a_devolver ?? 0) > 0 && <span className="ml-2 text-warning">· el productor te devuelve {ars.format(Number(t.anticipo_a_devolver))}</span>}
                  </p>
                  {t.estado === "reservada" && (
                    <p className="mt-2 rounded-[8px] bg-base px-3 py-2 text-[13px] text-muted">
                      El anticipo se paga directamente al productor. Después informá el pago para que lo confirme.
                      {t.vence_en && <> Si no confirma la recepción, la reserva se libera el {fechaHora(t.vence_en)}.</>}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <EstadoTomaBadge estado={t.estado} />
                  {t.estado === "reservada" && (
                    <form action={informarPagoAction}>
                      <input type="hidden" name="toma_id" value={t.id} />
                      <button type="submit" className={buttonClass("primary", "sm")}>
                        <IconCheckCircle size={16} /> Pagué el anticipo
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<IconRoute size={24} />}
            title="Todavía no tomaste tokens"
            description="Buscá contratos a futuro abiertos en el directorio: reservás kg al gancho con descuento pagando un anticipo al productor."
            action={
              <Link href="/es/directorio?con_contrato=1" className={buttonClass("primary", "md")}>
                Ver contratos abiertos
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}

/** «Mis contratos» del comprador (TPA-57). */
export default function MisContratosPage(props: { searchParams: Promise<{ reservada?: string; pago?: string; error?: string }> }) {
  return (
    <CompradorShell>
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </CompradorShell>
  );
}
