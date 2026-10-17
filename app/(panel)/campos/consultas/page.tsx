import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Button, Card, CardHeader, EmptyState, FilterTabs, PageHeader } from "@/components/ui";
import { IconMail, IconMessage, IconPhone } from "@/components/icons";
import { CamposTabs, EstadoConsultaBadge, zonaTexto, type Zona } from "@/components/panel/campos/comun";
import { ConsultaAcciones, ReporteForm } from "@/components/panel/campos/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { getCondicionesCampos, getConsultasCampos, type CampoConsulta } from "@/lib/data/campos";
import { fecha, fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Consultas por campos" };

const ESPECIE: Record<string, string> = { BOV: "bovinos", BUB: "búfalos" };

function Contacto({ c }: { c: NonNullable<CampoConsulta["contacto"]> }) {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink">
      <span className="font-semibold">{c.nombre}</span>
      {c.telefono && (
        <a href={`tel:${c.telefono}`} className="inline-flex items-center gap-1 text-campo underline">
          <IconPhone size={14} /> {c.telefono}
        </a>
      )}
      {c.email && (
        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-campo underline">
          <IconMail size={14} /> {c.email}
        </a>
      )}
    </p>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<{ lado?: string }> }) {
  const [ctx, sp] = await Promise.all([requireContexto(), searchParams]);
  const staff = !!ctx.me.usuario.es_staff;
  if (!ctx.can("campos.ver")) {
    return (
      <>
        <CamposTabs actual="consultas" staff={staff} gestiona={false} />
        <Card>
          <EmptyState icon={<IconMessage size={24} />} title="Tu rol no ve las consultas por campos" description="Las consultas las gestionan el dueño, la administración y el asesor." action={<Button href="/campos">Ir al mercado</Button>} />
        </Card>
      </>
    );
  }
  const lado = sp.lado === "enviadas" ? "enviadas" : "recibidas";
  const est = ctx.activa.establecimiento_id;
  const [r, cond] = await Promise.all([getConsultasCampos(est, lado), getCondicionesCampos()]);
  const puedeActuar = ctx.can(lado === "recibidas" ? "campos.gestionar" : "campos.consultar");
  const motivos = cond.estado === "ok" ? cond.data.motivos_disputa : [];

  return (
    <>
      <CamposTabs actual="consultas" staff={staff} />
      <div className="mb-4">
        <FilterTabs
          label="Lado de la consulta"
          items={[
            { href: "/campos/consultas", label: "Recibidas por mis avisos", active: lado === "recibidas" },
            { href: "/campos/consultas?lado=enviadas", label: "Enviadas por mí", active: lado === "enviadas" },
          ]}
        />
      </div>
      {r.estado !== "ok" ? (
        <Card>
          <EmptyState icon={<IconMessage size={24} />} title="No pudimos traer las consultas" description={r.estado === "error" ? r.mensaje : "Probá de nuevo en unos minutos."} action={<Button href="/campos/consultas">Reintentar</Button>} />
        </Card>
      ) : r.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconMessage size={24} />}
            title={lado === "recibidas" ? "Sin consultas por tus avisos" : "Todavía no consultaste por ningún campo"}
            description={lado === "recibidas" ? "Cuando un productor pregunte por un campo tuyo, te avisamos y aparece acá con su contacto." : "Buscá campos compatibles con tu rodeo y consultá desde el aviso."}
            action={<Button href={lado === "recibidas" ? "/campos/mis-avisos" : "/campos"}>{lado === "recibidas" ? "Ver mis avisos" : "Buscar campos"}</Button>}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title={`${r.data.length} ${r.data.length === 1 ? "consulta" : "consultas"}`} description={lado === "recibidas" ? "Quien consultó aceptó compartir su contacto con vos." : "Ves el contacto de quien publicó cuando te responde."} />
          <ul className="divide-y divide-border">
            {r.data.map((c) => (
              <li key={c.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_420px]">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <EstadoConsultaBadge estado={c.estado} label={c.estado_nombre} />
                    <span className="text-[12.5px] text-muted">{fechaHora(c.created_at)}</span>
                  </div>
                  <p className="text-[15px] font-semibold text-ink">
                    {lado === "recibidas" ? c.interesado?.establecimiento : c.publicado_por}
                    <span className="font-normal text-muted"> · </span>
                    <Link href={lado === "recibidas" ? `/campos/mis-avisos/${c.aviso.id}` : `/campos/${c.aviso.id}`} className="font-normal text-campo hover:underline">
                      {c.aviso.titulo}
                    </Link>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>
                      {nf.format(c.cabezas)} {ESPECIE[c.especie] ?? c.especie}
                    </Badge>
                    {c.desde && <Badge>Desde {fecha(c.desde, true)}</Badge>}
                    <Badge>{zonaTexto(c.aviso.zona as Zona)}</Badge>
                  </div>
                  <p className="whitespace-pre-line text-[14px] text-ink">{c.mensaje}</p>
                  {c.respuesta && (
                    <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-[13.5px] text-ink">
                      <span className="font-semibold">Respuesta:</span> {c.respuesta}
                    </p>
                  )}
                  {c.nota_cierre && <p className="text-[13px] text-muted">Nota: {c.nota_cierre}</p>}
                  {c.contacto && <Contacto c={c.contacto} />}
                </div>
                <div className="space-y-3">
                  {puedeActuar && <ConsultaAcciones id={c.id} lado={lado} estado={c.estado} />}
                  {lado === "enviadas" && c.estado !== "retirada" && motivos.length > 0 && <ReporteForm aviso={c.aviso.id} motivos={motivos} consultaId={c.id} />}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export default function ConsultasCamposPage(props: { searchParams: Promise<{ lado?: string }> }) {
  return (
    <>
      <PageHeader title="Campos y pastajes" subtitle="Consultas recibidas y enviadas. Registrá la visita y si hubo acuerdo: nos ayuda a medir el piloto." />
      <Suspense fallback={<div className="h-80 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
