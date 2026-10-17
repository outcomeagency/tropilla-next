import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DatosShell } from "@/components/datos/shell";
import { EstadoLicenciaForm, IntegranteForm, LicenciaCambioForm, LicenciaForm } from "@/components/datos/forms";
import { Avatar, Badge, Button, Card, CardBody, CardHeader, DataList, EmptyState, Spinner } from "@/components/ui";
import { IconAlert, IconBuilding, IconShieldCheck } from "@/components/icons";
import { getToken } from "@/lib/session";
import { getClientes, getMiembros, type Cliente } from "@/lib/data/agregados";
import { quitarIntegranteAction } from "@/lib/agregados-actions";
import { METRICAS, TIPOS_CLIENTE, type MetricaCodigo } from "@/lib/agregados";
import { fecha, fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Licencias de datos agregados" };

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-muted"><Spinner /></div>}>
      <Contenido />
    </Suspense>
  );
}

/** Licencias de clientes institucionales (TPA-75), solo equipo. */
async function Contenido() {
  if (!(await getToken())) redirect("/ingresar?next=/datos/licencias");
  const clientes = await getClientes();
  if (!clientes) redirect("/datos");
  const miembros = await Promise.all(clientes.map((c) => getMiembros(c.id)));

  return (
    <DatosShell actual="licencias" esStaff>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Licencias de datos agregados</h1>
        <p className="mt-1 max-w-[72ch] text-sm text-muted">
          Cada organización accede con una finalidad contractual, las métricas que firmó, una vigencia y un cupo diario. Todo cambio queda en la bitácora.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-5">
          {clientes.length ? (
            clientes.map((c, i) => <LicenciaCard key={c.id} c={c} miembros={miembros[i]} />)
          ) : (
            <Card>
              <EmptyState icon={<IconBuilding size={22} />} title="Todavía no hay licencias" description="Creá la primera con la finalidad acordada y sumá a sus integrantes por email." />
            </Card>
          )}
        </div>
        <Card className="self-start">
          <CardHeader title="Nueva licencia" description="Solo después de firmar el acuerdo de finalidad y no reidentificación." />
          <CardBody>
            <LicenciaForm />
          </CardBody>
        </Card>
      </div>
    </DatosShell>
  );
}

function LicenciaCard({ c, miembros }: { c: Cliente; miembros: Awaited<ReturnType<typeof getMiembros>> }) {
  const vencida = c.vigente_hasta != null && c.vigente_hasta < new Date().toISOString().slice(0, 10);
  return (
    <Card>
      <CardHeader
        title={c.nombre}
        description={`${TIPOS_CLIENTE[c.tipo]} · alta ${fecha(c.created_at)}`}
        action={
          c.estado === "suspendido" ? (
            <Badge tone="danger" icon={<IconAlert size={13} />}>Suspendida</Badge>
          ) : vencida ? (
            <Badge tone="warning" icon={<IconAlert size={13} />}>Vencida</Badge>
          ) : (
            <Badge tone="success" icon={<IconShieldCheck size={13} />}>Activa</Badge>
          )
        }
      />
      <CardBody className="space-y-5">
        <p className="text-[13.5px] leading-relaxed text-ink">{c.finalidad}</p>
        <DataList
          className="sm:grid-cols-3"
          items={[
            { label: "Contrato", value: c.contrato_version },
            { label: "Vigente hasta", value: c.vigente_hasta ? fecha(c.vigente_hasta) : "Sin vencimiento" },
            { label: "Métricas", value: c.metricas.map((m) => METRICAS[m as MetricaCodigo].label).join(", ") },
            { label: "Cupo diario", value: <span className="tabular-nums">{c.cupo_diario} consultas{c.consultas_por_dia == null ? " (tope de la política)" : ""}</span> },
            { label: "Consultas hoy", value: <span className="tabular-nums">{nf.format(c.consultas_hoy)}</span> },
            { label: "Consultas en 30 días", value: <span className="tabular-nums">{nf.format(c.consultas_30_dias)}</span> },
          ]}
        />
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">Integrantes ({miembros.length})</p>
          {miembros.length ? (
            <ul className="divide-y divide-border rounded-[10px] border border-border">
              {miembros.map((m) => (
                <li key={m.usuario.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={m.usuario.nombre} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{m.usuario.nombre}</span>
                      <span className="block truncate text-[12.5px] text-muted">{m.usuario.email} · desde {fechaHora(m.desde)}</span>
                    </span>
                  </span>
                  <form action={quitarIntegranteAction}>
                    <input type="hidden" name="cliente" value={c.id} />
                    <input type="hidden" name="usuario" value={m.usuario.id} />
                    <Button type="submit" size="sm" variant="ghost">Quitar acceso</Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nadie puede consultar con esta licencia todavía.</p>
          )}
        </div>
        <IntegranteForm cliente={c.id} />
        <details className="rounded-[10px] border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">Cambiar métricas, vigencia o cupo</summary>
          <div className="border-t border-border px-4 py-4">
            <LicenciaCambioForm cliente={c.id} rowVersion={c.row_version} metricas={c.metricas} vigenteHasta={c.vigente_hasta} cupo={c.consultas_por_dia} />
          </div>
        </details>
        <div className="border-t border-border pt-4">
          <EstadoLicenciaForm cliente={c.id} rowVersion={c.row_version} estado={c.estado} />
        </div>
      </CardBody>
    </Card>
  );
}
