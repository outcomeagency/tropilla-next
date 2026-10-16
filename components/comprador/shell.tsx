import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { IconLogout } from "@/components/icons";
import { logoutAction } from "@/lib/auth-actions";

/** Marco liviano del comprador (sin el panel del productor). */
export function CompradorShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-base">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-4 sm:px-8">
          <Link href="/es" aria-label="TROPILLA">
            <Logo height={30} />
          </Link>
          <nav className="flex min-w-0 items-center gap-4 overflow-x-auto text-[14px]">
            <Link href="/comprador" className="font-semibold text-ink">
              Mis contratos
            </Link>
            <Link href="/es/directorio" className="text-muted hover:text-ink">
              Directorio
            </Link>
            <Link href="/comprador/cuenta" className="text-muted hover:text-ink">
              Mi perfil de comprador
            </Link>
            <Link href="/comprador/buscos" className="text-muted hover:text-ink">Mis Busco</Link>
            <Link href="/comprador/seguimientos" className="text-muted hover:text-ink">Productores que sigo</Link>
          </nav>
          <form action={logoutAction} className="ml-auto">
            <button type="submit" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted hover:text-ink">
              <IconLogout size={16} /> Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
