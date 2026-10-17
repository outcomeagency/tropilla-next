import { Suspense } from "react";
import type { Metadata } from "next";
import { Button, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconInfo, IconLock, IconTruck } from "@/components/icons";
import { PedidoForm } from "@/components/panel/fletes/pedido-form";
import { requireContexto } from "@/lib/establecimiento";
import { api, ApiError } from "@/lib/api";
import type { One, S } from "@/lib/schemas";
import { hoyAR } from "@/lib/format";

export const metadata: Metadata = { title: "Pedir flete" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("fletes.gestionar")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite pedir fletes" description="Pueden pedirlos el dueño, la administración y el encargado del establecimiento." action={<Button href="/fletes">Volver</Button>} />
      </Card>
    );
  }
  let op: S<"FleteOpciones">;
  try {
    op = (await api<One<S<"FleteOpciones">>>(`/establecimientos/${ctx.activa.establecimiento_id}/fletes/opciones`)).data;
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    return (
      <Card>
        <EmptyState icon={<IconTruck size={24} />} title="No pudimos abrir el formulario" description={e.unreachable ? "No pudimos conectar con TROPILLA." : e.message} action={<Button href="/fletes/nuevo">Reintentar</Button>} />
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Datos del traslado" description="Con esto el equipo busca camiones compatibles por ruta, capacidad y fecha." />
        <PedidoForm op={op} hoy={hoyAR(new Date())} />
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Cómo funciona" />
          <ol className="space-y-3 px-5 py-4 text-[14px] text-ink">
            {[
              "Mandás el pedido. Una persona del equipo lo toma.",
              "Busca jaulas que salgan cerca de tu zona, vayan hacia tu destino y tengan lugar en tus fechas. Prioriza viajes de retorno.",
              "Solo te propone transportistas con la documentación verificada y vigente.",
              "Elegís una propuesta: recién ahí ves el contacto y el transportista recibe el tuyo.",
              "Acuerdan precio y condiciones entre ustedes. Después registrás el resultado.",
            ].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-campo-50 text-[12px] font-semibold text-monte tabular-nums">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardHeader title="Lo que TROPILLA no hace" />
          <ul className="space-y-2.5 px-5 py-4 text-[13.5px] text-muted">
            {op.avisos?.map((a) => (
              <li key={a} className="flex gap-2">
                <IconInfo size={15} className="mt-0.5 shrink-0 text-info" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function NuevoFletePage() {
  return (
    <>
      <PageHeader
        title="Pedir flete"
        subtitle="Camión jaula para mover hacienda: piloto con acompañamiento del equipo."
        actions={
          <Button href="/fletes" variant="outline" icon={<IconArrowLeft size={16} />}>
            Fletes
          </Button>
        }
      />
      <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
