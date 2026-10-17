import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconLeaf } from "@/components/icons";
import { BriefForm } from "@/components/panel/forraje/brief-form";
import { ESTADO_REVISION } from "@/components/panel/forraje/resultado-brief";
import { requireContexto } from "@/lib/establecimiento";
import { getBriefsForraje, getInsumosForraje } from "@/lib/data/forraje";
import { fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Forraje y carga" };

const ESCENARIO: Record<string, string> = { base: "Base", moderado: "Moderado", severo: "Severo" };

async function Contenido() {
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  const [ins, briefs] = await Promise.all([getInsumosForraje(est), getBriefsForraje(est)]);

  if (ins.estado !== "ok") {
    return (
      <Card>
        <EmptyState
          icon={<IconLeaf size={24} />}
          title={ins.estado === "sin_endpoint" ? "El brief de forraje todavía no está disponible" : "No pudimos traer los datos del brief"}
          description={ins.estado === "sin_endpoint" ? "La API de este entorno aún no publica el brief preventivo." : ins.estado === "error" ? `${ins.mensaje} Probá de nuevo en unos minutos.` : "Probá de nuevo en unos minutos."}
          action={<Button href="/forraje">Reintentar</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {ctx.can("forraje.crear") ? (
        <BriefForm insumos={ins.data} puedeGuardar />
      ) : (
        <Card>
          <EmptyState icon={<IconLeaf size={24} />} title="Tu rol puede leer los briefs guardados" description="Armar un brief nuevo lo hacen el dueño, la administración, el encargado o el asesor." />
        </Card>
      )}

      <Card>
        <CardHeader title="Briefs guardados" description="Quedan fijos para comparar en el tiempo. Cada uno registra quién lo armó y la revisión del asesor." />
        {briefs.length ? (
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>Brief</Th>
                <Th numeric>Rodeo</Th>
                <Th>Escenario de referencia</Th>
                <Th>Revisión</Th>
                <Th>Armado por</Th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((b) => {
                const rev = ESTADO_REVISION[b.estado_revision] ?? ESTADO_REVISION.sin_revisar;
                return (
                  <Tr key={b.id}>
                    <Td className="font-medium">
                      <Link href={`/forraje/${b.id}`} className="text-campo hover:underline">
                        {b.nombre ?? `Brief del ${fechaHora(b.created_at)}`}
                      </Link>
                      <span className="block text-[12px] font-normal text-muted">
                        {fechaHora(b.created_at)} · {b.horizonte_dias} días
                      </span>
                    </Td>
                    <Td numeric>
                      {nf.format(b.resumen.cabezas)} cab. · {nf.format(Number(b.resumen.ev))} EV
                    </Td>
                    <Td>{ESCENARIO[b.resumen.escenario_cercano] ?? b.resumen.escenario_cercano}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={rev.tone}>{rev.label}</Badge>
                        {b.revisado_por_asesor && <Badge tone="primary">Asesor</Badge>}
                      </div>
                    </Td>
                    <Td className="text-muted">{b.autor}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<IconLeaf size={24} />} title="Todavía no guardaste briefs" description="Cuando un escenario te sirva para hablar con tu asesor, guardalo: queda fijo y él puede dejar su revisión." />
        )}
      </Card>
    </div>
  );
}

/** Brief preventivo de forraje y carga (TPA-71). */
export default function ForrajePage() {
  return (
    <>
      <PageHeader
        title="Forraje y carga"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone="info">Piloto</Badge>
            Escenarios de reservas y carga con tu inventario declarado y el clima de la zona. Exploratorio: no reemplaza a tu asesor.
          </span>
        }
        actions={
          <Button href="/clima" variant="outline">
            Ver alertas climáticas
          </Button>
        }
      />
      <Suspense
        fallback={
          <div className="space-y-4" aria-hidden="true">
            <div className="h-[320px] rounded-[var(--radius-card)] border border-border bg-surface" />
            <div className="h-[260px] rounded-[var(--radius-card)] border border-border bg-surface" />
          </div>
        }
      >
        <Contenido />
      </Suspense>
    </>
  );
}
