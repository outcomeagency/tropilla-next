import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert, IconFence, IconPlus } from "@/components/icons";
import { CamposTabs, EstadoAvisoBadge, VerificacionBadge, temporadaTexto } from "@/components/panel/campos/comun";
import { requireContexto } from "@/lib/establecimiento";
import { getMisAvisos } from "@/lib/data/campos";
import { nf } from "@/lib/format";

export const metadata: Metadata = { title: "Mis avisos de campo" };

async function Contenido() {
  const ctx = await requireContexto();
  const staff = !!ctx.me.usuario.es_staff;
  if (!ctx.can("campos.ver")) {
    return (
      <>
        <CamposTabs actual="mis-avisos" staff={staff} gestiona={false} />
        <Card>
          <EmptyState icon={<IconFence size={24} />} title="Tu rol no gestiona avisos de campo" description="Los avisos del establecimiento los ven el dueño, la administración y el asesor." action={<Button href="/campos">Ir al mercado</Button>} />
        </Card>
      </>
    );
  }
  const r = await getMisAvisos(ctx.activa.establecimiento_id);
  const puede = ctx.can("campos.gestionar");
  return (
    <>
      <CamposTabs actual="mis-avisos" staff={staff} />
      {r.estado !== "ok" ? (
        <Card>
          <EmptyState icon={<IconFence size={24} />} title="No pudimos traer tus avisos" description={r.estado === "error" ? r.mensaje : "Probá de nuevo en unos minutos."} action={<Button href="/campos/mis-avisos">Reintentar</Button>} />
        </Card>
      ) : r.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconFence size={24} />}
            title="Todavía no publicaste ningún campo"
            description="Si tenés pasto disponible, publicalo para pastaje, arrendamiento o capitalización. Te avisamos cuando alguien consulte."
            action={puede ? <Button href="/campos/mis-avisos/nuevo" icon={<IconPlus size={18} />}>Publicar un campo</Button> : undefined}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title={`${r.data.length} ${r.data.length === 1 ? "aviso" : "avisos"} de ${ctx.activa.establecimiento_nombre}`} />
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Aviso</Th>
                <Th>Estado</Th>
                <Th numeric>Capacidad</Th>
                <Th>Temporada</Th>
                <Th numeric>Consultas</Th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-medium">
                    <Link href={`/campos/mis-avisos/${a.id}`} className="text-campo hover:underline">
                      {a.titulo}
                    </Link>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge>{a.modalidad_nombre}</Badge>
                      <VerificacionBadge v={a.verificacion} />
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <EstadoAvisoBadge estado={a.estado} />
                      {(a.disputas_abiertas ?? 0) > 0 && (
                        <Badge tone="danger" icon={<IconAlert size={14} />}>
                          {a.disputas_abiertas} {a.disputas_abiertas === 1 ? "reporte" : "reportes"}
                        </Badge>
                      )}
                    </div>
                  </Td>
                  <Td numeric>{nf.format(a.capacidad_cabezas)} cab.</Td>
                  <Td className="text-muted">{temporadaTexto(a)}</Td>
                  <Td numeric>
                    {a.consultas_abiertas ? <span className="font-semibold text-ink">{a.consultas_abiertas} abiertas</span> : <span className="text-muted">{a.consultas_total ?? 0}</span>}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}

export default function MisAvisosPage() {
  return (
    <>
      <PageHeader
        title="Campos y pastajes"
        subtitle="Los campos que ofrece tu establecimiento."
        actions={
          <Button href="/campos/mis-avisos/nuevo" icon={<IconPlus size={18} />}>
            Publicar un campo
          </Button>
        }
      />
      <Suspense fallback={<div className="h-80 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
