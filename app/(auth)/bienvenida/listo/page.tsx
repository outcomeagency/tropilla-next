import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { IconArrowRight, IconCheckCircle, IconList, IconUpload } from "@/components/icons";
import { Notice, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Establecimiento creado" };

async function Listo({ searchParams }: { searchParams: Promise<{ establecimiento?: string; demo?: string }> }) {
  const { establecimiento = "Tu establecimiento", demo } = await searchParams;
  const NEXT = [
    { icon: <IconUpload size={22} />, title: "Subir mi planilla", body: "CSV o Excel. Te mostramos los errores fila por fila antes de importar.", href: "/hacienda/importar" },
    { icon: <IconList size={22} />, title: "Cargar por cantidades", body: "«380 búfalos en estas categorías». Después identificás animal por animal.", href: "/hacienda/lotes/nuevo" },
    { icon: <IconArrowRight size={22} />, title: "Entrar sin hacienda", body: "Empezás vacío y cargás desde el celular en la manga.", href: "/inicio" },
  ];
  return (
    <div className="mx-auto max-w-[760px]">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-10">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-success-bg text-success">
          <IconCheckCircle size={26} />
        </span>
        <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-ink">{establecimiento} ya está en TROPILLA</h1>
        <p className="mt-1.5 text-[15px] text-muted">Quedaste como Dueño. ¿Cómo querés cargar la hacienda?</p>
        {demo && (
          <div className="mt-4">
            <Notice tone="warning" title="Modo demostración">
              La API todavía no guarda establecimientos en este entorno: vas a ver el establecimiento de ejemplo.
            </Notice>
          </div>
        )}
        <ul className="mt-7 grid gap-3">
          {NEXT.map((n) => (
            <li key={n.title}>
              <Link href={n.href} className="flex items-center gap-4 rounded-[12px] border border-border p-4 transition-colors hover:border-campo hover:bg-base">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">{n.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{n.title}</span>
                  <span className="block text-[13.5px] text-muted">{n.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/inicio" className={buttonClass("primary", "md", "mt-7")}>
          Ir al inicio <IconArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

/** Cierre del onboarding (flujo 1): elegir cómo cargar la hacienda. */
export default function ListoPage(props: { searchParams: Promise<{ establecimiento?: string; demo?: string }> }) {
  return (
    <div className="min-h-dvh bg-base">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center px-4 sm:px-8">
          <Logo height={32} />
        </div>
      </header>
      <main className="px-4 py-8 sm:px-8 sm:py-14">
        <Suspense fallback={null}>
          <Listo searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
