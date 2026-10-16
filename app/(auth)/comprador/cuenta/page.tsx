import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CompradorShell } from "@/components/comprador/shell";
import { PerfilCompradorForm } from "@/components/comprador/perfil-form";
import { Card, CardBody, CardHeader, Notice } from "@/components/ui";
import { getSesionOpcional } from "@/lib/auth";
import { getComprador } from "@/lib/data/comprador";

export const metadata: Metadata = { title: "Perfil de comprador" };

async function Contenido({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const me = await getSesionOpcional();
  const { next = "/comprador" } = await searchParams;
  if (!me) redirect(`/ingresar?next=${encodeURIComponent(`/comprador/cuenta?next=${next}`)}`);
  const { data: c } = await getComprador(me);
  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">Tu perfil de comprador</h1>
      <p className="text-[15px] text-muted">Con esto ves precios especiales de contratos a futuro, tomás tokens y seguís productores. Los productores sólo ven tu empresa, país y tipo cuando les escribís o tomás tokens.</p>
      {me.usuario.email && me.usuario.email_verificado === false && (
        <Notice tone="info" title="Verificá tu email">
          Para tomar tokens necesitás el email verificado. Te mandamos el enlace al registrarte.
        </Notice>
      )}
      <Card>
        <CardHeader title={c ? "Editar perfil" : "Completá tu perfil"} />
        <CardBody>
          <PerfilCompradorForm next={next} inicial={c ? { empresa: c.empresa, tipo: c.tipo, pais: c.pais, volumen: c.volumen_habitual } : undefined} />
        </CardBody>
      </Card>
    </div>
  );
}

/** Cuenta liviana de comprador (TPA-57). */
export default function CuentaCompradorPage(props: { searchParams: Promise<{ next?: string }> }) {
  return (
    <CompradorShell>
      <Suspense fallback={<div className="mx-auto h-[420px] max-w-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </CompradorShell>
  );
}
