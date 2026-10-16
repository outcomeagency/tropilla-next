import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { IconCheckCircle } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

const PUNTOS = [
  "Hacienda, sanidad, reproducción y documentos en un solo lugar",
  "Bovinos y búfalos, cada uno con sus categorías",
  "Cada dato con autor, fecha e historial: nada se borra",
];

export default function IngresarPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Momento de marca: verde monte, sin degradados ni ilustraciones. */}
      <aside className="hidden flex-col justify-between bg-sidebar px-12 py-10 text-sidebar-ink lg:flex">
        <Logo onDark height={40} />
        <div className="max-w-[440px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
            Hecho en Corrientes, para el NEA
          </p>
          <h1 className="mt-3 font-display text-[44px] font-bold leading-[1.05] tracking-[-0.03em]">
            Todo tu campo, en un solo lugar.
          </h1>
          <ul className="mt-8 space-y-3">
            {PUNTOS.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] text-sidebar-ink">
                <IconCheckCircle size={20} className="mt-0.5 shrink-0 text-sidebar-muted" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12.5px] text-sidebar-muted">La plataforma integral del productor ganadero del NEA.</p>
      </aside>

      <main className="flex items-center justify-center bg-surface px-4 py-12 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo height={36} />
          </div>
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-ink">Ingresá a tu establecimiento</h2>
          <p className="mt-1.5 text-[15px] text-muted">Usá el email y la contraseña de tu cuenta de TROPILLA.</p>

          <div className="mt-8">
            <Suspense fallback={<div className="h-[260px]" aria-hidden="true" />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-8 border-t border-border pt-5 text-[13.5px] text-muted">
            ¿Sos comprador?{" "}
            <Link href="/es" className="font-medium text-campo hover:underline">
              Mirá el portal de productores
            </Link>
            , no necesitás cuenta para consultar.
          </p>
        </div>
      </main>
    </div>
  );
}
