import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { RegistrarPagina, type SP } from "@/components/panel/eventos/registrar-pagina";

export const metadata: Metadata = { title: "Registrar evento" };

/** Registrar un evento de hacienda (TPA-22). */
export default function RegistrarEventoPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Registrar evento" subtitle="Ingresos, salidas, movimientos, bajas y manejo. Cada evento actualiza el stock y queda en la historia de cada animal." />
      <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <RegistrarPagina searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
