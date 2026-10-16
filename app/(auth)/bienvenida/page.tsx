import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { IconLogout } from "@/components/icons";
import { Notice, buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Bienvenida" };

async function Contenido() {
  const current = await getCurrentUser();
  if (current.status !== "ok") {
    return <Notice tone="danger" title="No pudimos conectar con TROPILLA">Probá de nuevo en unos minutos.</Notice>;
  }
  if (current.me.membresias.length) {
    return (
      <div className="mx-auto max-w-[560px]">
        <Notice tone="info" title="Ya tenés un establecimiento">
          Para sumar otro campo, usá el selector de establecimiento del panel.
        </Notice>
        <Link href="/inicio" className={buttonClass("primary", "md", "mt-5")}>
          Ir al inicio
        </Link>
      </div>
    );
  }
  return <OnboardingWizard nombreUsuario={current.me.usuario.nombre} />;
}

/** Onboarding (flujo 1, TPA-10): productor → establecimiento → producción y sanidad. */
export default function BienvenidaPage() {
  return (
    <div className="min-h-dvh bg-base">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-8">
          <Logo height={32} />
          <form action={logoutAction}>
            <button type="submit" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted hover:text-ink">
              <IconLogout size={16} /> Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8 sm:py-12">
        <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" aria-hidden="true" />}>
          <Contenido />
        </Suspense>
      </main>
    </div>
  );
}
