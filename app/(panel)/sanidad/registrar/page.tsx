import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { RegistrarPagina, type SP } from "@/components/panel/eventos/registrar-pagina";

export const metadata: Metadata = { title: "Registrar en Sanidad" };

/** Registrar vacunación, desparasitación o tratamiento a animales, un lote o un potrero (TPA-32). */
export default function RegistrarSanidadPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Registrar en Sanidad" subtitle="Vacunación, desparasitación o tratamiento, a un animal, un lote o un potrero completo. El retiro se calcula solo." />
      <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <RegistrarPagina modulo="sanidad" searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
