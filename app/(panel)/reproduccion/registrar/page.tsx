import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { RegistrarPagina, type SP } from "@/components/panel/eventos/registrar-pagina";

export const metadata: Metadata = { title: "Registrar en Reproducción" };

/** Registrar servicios, inseminaciones, tactos, partos, abortos y destetes (TPA-27..29). */
export default function RegistrarReproduccionPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Registrar en Reproducción" subtitle="Servicio, inseminación, tacto, parto y destete. Cada evento actualiza el estado reproductivo y el calendario de partos." />
      <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <RegistrarPagina modulo="reproduccion" searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
