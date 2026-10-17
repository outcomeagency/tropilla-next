import { Suspense } from "react";
import type { Metadata } from "next";
import { Button, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconFence } from "@/components/icons";
import { AvisoForm } from "@/components/panel/campos/aviso-form";
import { requireContexto } from "@/lib/establecimiento";
import { getCondicionesCampos } from "@/lib/data/campos";
import { getCatalogos } from "@/lib/data/catalogos";
import { getEstablecimiento } from "@/lib/data/establecimientos";

export const metadata: Metadata = { title: "Publicar un campo" };

async function Contenido() {
  const ctx = await requireContexto();
  if (!ctx.can("campos.gestionar")) {
    return (
      <Card>
        <EmptyState icon={<IconFence size={24} />} title="Tu rol no puede publicar campos" description="Publicar avisos lo hacen el dueño o la administración del establecimiento." action={<Button href="/campos">Ir al mercado</Button>} />
      </Card>
    );
  }
  const [cond, cat, est] = await Promise.all([getCondicionesCampos(), getCatalogos(), getEstablecimiento(ctx.activa.establecimiento_id).catch(() => null)]);
  if (cond.estado !== "ok") {
    return (
      <Card>
        <EmptyState icon={<IconFence size={24} />} title="No pudimos preparar el formulario" description="Probá de nuevo en unos minutos." action={<Button href="/campos/mis-avisos/nuevo">Reintentar</Button>} />
      </Card>
    );
  }
  return (
    <div className="max-w-[920px] space-y-6">
      <Notice tone="info" title="Así se ve tu aviso">
        Los productores ven la modalidad, la capacidad, la temporada, el precio y la zona (departamento y provincia). Tu contacto se comparte solo cuando respondés una consulta.
      </Notice>
      <AvisoForm
        cond={cond.data}
        categorias={cat.categorias.map((c) => ({ codigo: c.codigo, especie: c.especie, nombre: c.nombre }))}
        zonaDefecto={{ provincia: est?.provincia_codigo ?? "18", departamento: est?.departamento_codigo ?? "", localidad: est?.localidad ?? null }}
      />
    </div>
  );
}

export default function NuevoAvisoPage() {
  return (
    <>
      <PageHeader
        title="Publicar un campo"
        subtitle="Pastaje, arrendamiento o capitalización. Gratis durante el piloto."
        actions={
          <Button href="/campos/mis-avisos" variant="ghost" icon={<IconArrowLeft size={18} />}>
            Mis avisos
          </Button>
        }
      />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
