import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { IconLogout } from "@/components/icons";
import { cx } from "@/components/ui";
import { logoutAction } from "@/lib/auth-actions";

type Seccion = "tablero" | "consultas" | "gobernanza" | "licencias";

/** Marco del tablero agregado (TPA-75): clientes institucionales y equipo, sin el panel del productor. */
export function DatosShell({ actual, esStaff, children }: { actual: Seccion; esStaff: boolean; children: ReactNode }) {
  const items: Array<{ key: Seccion; href: string; label: string }> = [
    { key: "tablero", href: "/datos", label: "Tablero" },
    { key: "consultas", href: "/datos/consultas", label: "Consultas registradas" },
    ...(esStaff
      ? [
          { key: "gobernanza" as const, href: "/datos/gobernanza", label: "Gobernanza" },
          { key: "licencias" as const, href: "/datos/licencias", label: "Licencias" },
        ]
      : []),
  ];
  return (
    <div className="min-h-dvh bg-base">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4 sm:px-8">
          <Link href="/datos" aria-label="TROPILLA · Datos agregados" className="flex shrink-0 items-center gap-3">
            <Logo height={28} />
            <span className="hidden border-l border-border pl-3 text-[13px] font-semibold text-muted sm:inline">Datos agregados</span>
          </Link>
          <nav aria-label="Secciones" className="flex min-w-0 items-center gap-1 overflow-x-auto text-[14px]">
            {items.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                prefetch={false}
                aria-current={it.key === actual ? "page" : undefined}
                className={cx(
                  "whitespace-nowrap rounded-[7px] px-3 py-1.5 font-medium transition-colors",
                  it.key === actual ? "bg-campo-50 text-monte" : "text-muted hover:text-ink",
                )}
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction} className="ml-auto">
            <button type="submit" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted hover:text-ink">
              <IconLogout size={16} /> Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
