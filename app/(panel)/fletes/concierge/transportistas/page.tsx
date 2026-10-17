import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconShieldCheck, IconTruck } from "@/components/icons";
import { TransportistaForm } from "@/components/panel/fletes/concierge-forms";
import { ConciergeTabs, SoloStaff } from "@/components/panel/fletes/concierge-tabs";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";
import type { Transportista } from "@/lib/fletes";

export const metadata: Metadata = { title: "Transportistas · mesa de fletes" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.me.usuario.es_staff) return <SoloStaff />;
  let lista: Transportista[];
  let r: S<"FleteConciergeResumen">;
  try {
    [lista, r] = await Promise.all([
      api<Many<Transportista>>("/fletes/concierge/transportistas").then((x) => x.data),
      api<One<S<"FleteConciergeResumen">>>("/fletes/concierge/resumen").then((x) => x.data),
    ]);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState icon={<IconTruck size={24} />} title="No pudimos cargar los transportistas" description={e.unreachable ? "No pudimos conectar con TROPILLA." : e.message} action={<Button href="/fletes/concierge/transportistas">Reintentar</Button>} />
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Transportistas del piloto" description="Solo se proponen los activos con toda la documentación verificada y vigente." />
        {lista.length ? (
          <Table minWidth={680}>
            <thead>
              <tr>
                <Th>Transportista</Th>
                <Th>Base</Th>
                <Th>Documentación</Th>
                <Th numeric>Jaulas vigentes</Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-medium">
                    <Link href={`/fletes/concierge/transportistas/${t.id}`} className="text-campo hover:underline">
                      {t.nombre}
                    </Link>
                    <span className="block text-[12px] font-normal text-muted">
                      {t.contacto_nombre} · {t.telefono}
                    </span>
                  </Td>
                  <Td>{t.base.departamento_nombre}</Td>
                  <Td>
                    {!t.activo ? (
                      <Badge tone="neutral">Inactivo</Badge>
                    ) : t.documentacion_completa ? (
                      <Badge tone="success" icon={<IconShieldCheck size={13} />}>
                        Completa
                      </Badge>
                    ) : (
                      <Badge tone="warning" icon={<IconAlert size={13} />}>
                        {t.documentos_faltantes === 1 ? "Falta 1" : `Faltan ${t.documentos_faltantes}`}
                      </Badge>
                    )}
                  </Td>
                  <Td numeric className="tabular-nums">
                    {t.disponibilidades_abiertas}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<IconTruck size={24} />} title="Todavía no hay transportistas" description="Empezá por los que ya trabajan en el corredor: cargalos, verificá sus papeles y su disponibilidad." />
        )}
      </Card>
      <Card>
        <CardHeader title="Alta de transportista" description="Después verificá cada documento con el original o ante el organismo." />
        <TransportistaForm deptos={r.departamentos ?? []} />
      </Card>
    </div>
  );
}

export default function TransportistasPage() {
  return (
    <>
      <PageHeader
        title="Mesa de fletes"
        subtitle="Transportistas, documentación verificada y disponibilidad de jaulas."
        actions={
          <Button href="/fletes" variant="outline" icon={<IconArrowLeft size={16} />}>
            Fletes
          </Button>
        }
      />
      <ConciergeTabs actual="transportistas" />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
