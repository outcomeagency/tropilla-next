"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cambiarEstablecimientoAction } from "@/lib/establecimiento-actions";
import { IconBuilding, IconCheck, IconChevronDown, IconSearch } from "@/components/icons";
import { cx } from "@/components/ui";

export interface SwitcherItem {
  id: string;
  nombre: string;
  detalle: string;
  rol: string;
}

/**
 * Selector de establecimiento (TPA-12) en la sidebar verde monte: botón con
 * el campo activo y lista desplegable. Con más de 5 campos aparece un buscador
 * (asesores que atienden muchos). Cambiar = Server Action que fija la cookie.
 */
export function EstablishmentSwitcher({ items, activeId }: { items: SwitcherItem[]; activeId: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const pathname = usePathname();
  const active = items.find((i) => i.id === activeId) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const term = q.trim().toLowerCase();
  const visibles = term ? items.filter((i) => `${i.nombre} ${i.detalle}`.toLowerCase().includes(term)) : items;

  return (
    <div ref={ref} className="relative mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="true"
        className={cx(
          "flex w-full items-center gap-3 rounded-[10px] border border-sidebar-border px-3 py-2.5 text-left transition-colors hover:bg-sidebar-hover",
          open && "bg-sidebar-hover",
        )}
      >
        <IconBuilding size={20} className="shrink-0 text-sidebar-muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{active?.nombre}</span>
          <span className="block truncate text-[12px] text-sidebar-muted">{active?.detalle}</span>
        </span>
        <IconChevronDown size={16} className={cx("shrink-0 text-sidebar-muted transition-transform", open && "rotate-180")} />
        <span className="sr-only">Cambiar establecimiento</span>
      </button>

      {open && (
        <div
          id={listId}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[12px] border border-border bg-surface text-ink shadow-[0_8px_24px_rgb(22_63_46/0.14)]"
        >
          <p className="border-b border-border px-3.5 py-2.5 text-[12px] font-semibold text-muted">
            Tus establecimientos · <span className="tabular-nums">{items.length}</span>
          </p>
          {items.length > 5 && (
            <div className="relative border-b border-border p-2">
              <IconSearch size={16} className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar campo"
                aria-label="Buscar establecimiento"
                className="h-9 w-full rounded-[7px] border border-border bg-base pl-8 pr-2 text-[13.5px] focus:border-campo focus:outline-none"
              />
            </div>
          )}
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {visibles.map((it) => {
              const current = it.id === active?.id;
              return (
                <li key={it.id}>
                  <form action={cambiarEstablecimientoAction}>
                    <input type="hidden" name="establecimiento_id" value={it.id} />
                    <input type="hidden" name="volver" value={pathname} />
                    <button
                      type="submit"
                      aria-current={current ? "true" : undefined}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold">{it.nombre}</span>
                        </span>
                        <span className="block truncate text-[12.5px] text-muted">
                          {it.rol} · {it.detalle}
                        </span>
                      </span>
                      {current && <IconCheck size={18} className="shrink-0 text-campo" />}
                    </button>
                  </form>
                </li>
              );
            })}
            {!visibles.length && <li className="px-3.5 py-3 text-[13px] text-muted">Ningún campo coincide con «{q}».</li>}
          </ul>
          <Link
            href="/establecimientos"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-3.5 py-2.5 text-[13px] font-medium text-campo hover:bg-surface-2"
          >
            Ver todos mis establecimientos
          </Link>
        </div>
      )}
    </div>
  );
}

export function EstablishmentSwitcherSkeleton() {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-[10px] border border-sidebar-border px-3 py-2.5" aria-hidden="true">
      <span className="h-5 w-5 rounded bg-sidebar-hover" />
      <span className="flex-1 space-y-1.5">
        <span className="block h-3 w-28 rounded bg-sidebar-hover" />
        <span className="block h-2.5 w-36 rounded bg-sidebar-hover" />
      </span>
    </div>
  );
}
