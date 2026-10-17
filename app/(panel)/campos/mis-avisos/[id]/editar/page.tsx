import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { IconArrowLeft, IconFence } from "@/components/icons";
import { AvisoForm } from "@/components/panel/campos/aviso-form";
import { requireContexto } from "@/lib/establecimiento";
import { getCondicionesCampos, getMiAviso } from "@/lib/data/campos";
import { getCatalogos } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Editar aviso de campo" };

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const [ctx, { id }] = await Promise.all([requireContexto(), params]);
  if (!ctx.can("campos.gestionar")) notFound();
  const [r, cond, cat] = await Promise.all([getMiAviso(ctx.activa.establecimiento_id, id), getCondicionesCampos(), getCatalogos()]);
  if (r.estado === "no_encontrado") notFound();
  if (r.estado !== "ok" || cond.estado !== "ok") {
    return (
      <Card>
        <EmptyState icon={<IconFence size={24} />} title="No pudimos abrir el aviso" description="Probá de nuevo en unos minutos." action={<Button href={`/campos/mis-avisos/${id}`}>Volver</Button>} />
      </Card>
    );
  }
  const a = r.data;
  if (a.estado === "cerrado") return <Notice tone="info" title="El aviso está cerrado: publicá uno nuevo." />;
  return (
    <div className="max-w-[920px] space-y-6">
      {a.verificacion?.nivel !== "declarado" && (
        <Notice tone="warning" title="Este aviso tiene una verificación">
          Si cambiás modalidad, capacidad, especies, superficie o zona, vuelve a «Datos declarados» hasta que el equipo lo revise de nuevo.
        </Notice>
      )}
      <AvisoForm
        cond={cond.data}
        aviso={a}
        categorias={cat.categorias.map((c) => ({ codigo: c.codigo, especie: c.especie, nombre: c.nombre }))}
        zonaDefecto={{ provincia: a.zona.provincia_codigo, departamento: a.zona.departamento_codigo, localidad: a.zona.localidad }}
      />
    </div>
  );
}

export default function EditarAvisoPage(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader
        title="Editar aviso de campo"
        actions={
          <Button href="/campos/mis-avisos" variant="ghost" icon={<IconArrowLeft size={18} />}>
            Mis avisos
          </Button>
        }
      />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido params={props.params} />
      </Suspense>
    </>
  );
}
