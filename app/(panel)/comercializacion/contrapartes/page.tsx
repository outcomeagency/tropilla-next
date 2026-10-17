import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, CardHeader, EmptyState, Notice, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconCheckCircle, IconExternal, IconInfo, IconLock, IconSearch } from "@/components/icons";
import { ComercialTabs } from "@/components/panel/comercial-tabs";
import { ConsultaForm } from "@/components/panel/contrapartes/consulta-form";
import { ChequeForm } from "@/components/panel/contrapartes/cheque-form";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Chequeo de contraparte por CUIT" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("contrapartes.consultar")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="El chequeo por CUIT es del dueño y la administración" description="Consultar datos de terceros queda registrado a nombre de quien lo hace y solo lo pueden hacer esos roles." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  // Las lecturas independientes arrancan juntas; los bancos y el listado toleran fallas por separado.
  const consultasP = api<Many<S<"ConsultaContraparte">>>(`/establecimientos/${est}/contrapartes/consultas?limit=25`)
    .then((r) => r.data)
    .catch(() => [] as S<"ConsultaContraparte">[]);
  const bancosP = api<{data: {codigoEntidad: number; denominacion: string}[]}>(`/establecimientos/${est}/contrapartes/cheques/bancos`)
    .then((r) => r.data)
    .catch(() => [] as {codigoEntidad: number; denominacion: string}[]);
  let info: S<"ContraparteFuentes">;
  try {
    info = (await api<One<S<"ContraparteFuentes">>>(`/establecimientos/${est}/contrapartes/fuentes`)).data;
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState
          icon={<IconSearch size={24} />}
          title={e.routeMissing ? "El chequeo por CUIT todavía no está disponible" : "No pudimos cargar el chequeo"}
          description={e.routeMissing ? "La API de este entorno aún no lo publica." : e.unreachable ? "No pudimos conectar con TROPILLA." : e.message}
          action={<Button href="/comercializacion/contrapartes">Reintentar</Button>}
        />
      </Card>
    );
  }
  const [consultas, bancos] = await Promise.all([consultasP, bancosP]);
  const agotado = info.consultas_hoy >= info.max_consultas_dia;

  return (
    <div className="space-y-4">
      <Notice tone="info" title="Consulta asistida · piloto">
        Reúne lo que informan fuentes públicas sobre un CUIT para ordenar la conversación antes de vender o cobrar. No es una calificación ni dice si conviene operar.
        {info.revision_legal === "pendiente" && " La revisión legal está en curso: por eso cada consulta es puntual, la pedís vos y no se repite sola."}
      </Notice>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Nueva consulta"
            description={`${info.consultas_hoy} de ${info.max_consultas_dia} consultas hoy en este establecimiento · el detalle se guarda ${info.retencion_dias} días`}
          />
          <ConsultaForm finalidades={info.finalidades} deshabilitado={agotado ? "Llegaste al tope de consultas de hoy." : undefined} />
        </Card>
        <Card>
          <CardHeader title="Qué se consulta" description="Cada fuente dice qué cubre y qué no." />
          <ul className="divide-y divide-border">
            {info.fuentes.map((f) => (
              <li key={f.codigo} className="space-y-1.5 px-5 py-4 text-[14px]">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                    {f.nombre} <IconExternal size={13} />
                  </a>
                  {f.configurada ? (
                    <Badge tone="success" icon={<IconCheckCircle size={13} />}>
                      Se consulta automáticamente
                    </Badge>
                  ) : (
                    <Badge tone="neutral" icon={<IconInfo size={13} />}>
                      Consulta manual
                    </Badge>
                  )}
                </div>
                <p className="text-muted">{f.descripcion}</p>
                <p className="text-[12.5px] text-muted">{f.cobertura}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Verificar un cheque puntual" description="Consulta la base de cheques denunciados del BCRA. El resultado no confirma autenticidad ni solvencia." />
        {bancos.length ? <ChequeForm bancos={bancos} /> : <div className="px-5 pb-5 text-[13px] text-muted">El listado de bancos del BCRA no está disponible ahora. Podés reintentar más tarde.</div>}
      </Card>

      <Card>
        <CardHeader title="Consultas registradas" description="Quién consultó, cuándo y para qué. Vencida la retención se borra el detalle y queda este registro." />
        {consultas.length ? (
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>Contraparte</Th>
                <Th>Finalidad</Th>
                <Th>Checklist</Th>
                <Th>Consultó</Th>
              </tr>
            </thead>
            <tbody>
              {consultas.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium">
                    <Link href={`/comercializacion/contrapartes/${c.id}`} className="text-campo hover:underline">
                      {c.denominacion ?? (c.depurada_en ? "Detalle depurado" : "Sin denominación informada")}
                    </Link>
                    <span className="block text-[12px] font-normal text-muted tabular-nums">CUIT {c.cuit}</span>
                  </Td>
                  <Td>{c.finalidad_nombre}</Td>
                  <Td className="tabular-nums">
                    {c.checklist_hechos} de {c.checklist_total}
                  </Td>
                  <Td className="text-muted">
                    {c.consultado_por}
                    <span className="block text-[12px]">{fechaHora(c.created_at)}</span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<IconSearch size={24} />} title="Todavía no hiciste consultas" description="Antes de aceptar un cheque o una venta a plazo, consultá el CUIT y seguí el checklist." />
        )}
      </Card>
    </div>
  );
}

/** Chequeo de contraparte por CUIT (TPA-72). */
export default function ContrapartesPage() {
  return (
    <>
      <PageHeader title="Chequeo de contraparte" subtitle="Señales públicas sobre un CUIT, con fuente y fecha, y un checklist para cuidar la operación." />
      <ComercialTabs actual="contrapartes" />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
