"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ComponentType, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { cx } from "@/components/ui";
import {
  IconChart,
  IconClose,
  IconCow,
  IconFile,
  IconHeart,
  IconHome,
  IconMap,
  IconMenu,
  IconRoute,
  IconSettings,
  IconShield,
  IconUser,
  type IconProps,
} from "@/components/icons";
import { PANEL_NAV, PANEL_NAV_FOOTER, type NavIcon, type NavItem } from "@/lib/nav";

const NAV_ICON: Record<NavIcon, ComponentType<IconProps>> = {
  home: IconHome,
  cow: IconCow,
  heart: IconHeart,
  shield: IconShield,
  map: IconMap,
  file: IconFile,
  route: IconRoute,
  chart: IconChart,
  user: IconUser,
  settings: IconSettings,
};

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = NAV_ICON[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cx(
        "flex h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[14.5px] transition-colors",
        active
          ? "bg-sidebar-active font-semibold text-sidebar-ink"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink",
      )}
    >
      <Icon size={20} />
      {item.label}
    </Link>
  );
}

function NavItems({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate: () => void }) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return items.map((item) => <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />);
}

/** Lee la URL (dato de request en rutas dinámicas): va detrás de Suspense para no bloquear el shell. */
function ActiveNavItems({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return <NavItems items={items} pathname={usePathname()} onNavigate={onNavigate} />;
}

/**
 * Sidebar verde monte del panel (preview 01). En escritorio queda fija; en
 * móvil se abre como panel lateral desde la barra superior.
 */
export function PanelSidebar({ selectorSlot, userSlot }: { selectorSlot: ReactNode; userSlot: ReactNode }) {
  const [open, setOpen] = useState(false);


  return (
    <>
      {/* Barra superior móvil */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Link href="/inicio" aria-label="Ir al inicio">
          <Logo onDark height={28} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-[var(--radius-control)] text-sidebar-ink hover:bg-sidebar-hover"
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="panel-sidebar"
        >
          <IconMenu size={22} />
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-carbon/40 lg:hidden"
        />
      )}

      <aside
        id="panel-sidebar"
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar px-4 pb-4 pt-5 text-sidebar-ink transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-1">
          <Link href="/inicio" aria-label="TROPILLA — Inicio">
            <Logo onDark height={34} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] hover:bg-sidebar-hover lg:hidden"
            aria-label="Cerrar menú"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Selector de establecimiento (TPA-12): server component detrás de Suspense. */}
        {selectorSlot}

        <nav aria-label="Panel" className="mt-5 flex-1 space-y-0.5 overflow-y-auto">
          <Suspense fallback={<NavItems items={PANEL_NAV} pathname="" onNavigate={() => setOpen(false)} />}>
            <ActiveNavItems items={PANEL_NAV} onNavigate={() => setOpen(false)} />
          </Suspense>
        </nav>

        <div className="space-y-3 border-t border-sidebar-border pt-3">
          <Suspense fallback={<NavItems items={PANEL_NAV_FOOTER} pathname="" onNavigate={() => setOpen(false)} />}>
            <ActiveNavItems items={PANEL_NAV_FOOTER} onNavigate={() => setOpen(false)} />
          </Suspense>
          {userSlot}
        </div>
      </aside>
    </>
  );
}
