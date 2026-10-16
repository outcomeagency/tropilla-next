"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "@/components/icons";
import { cx } from "@/components/ui";

/**
 * Diálogo modal nativo (<dialog>): foco atrapado, Esc y fondo los maneja el
 * navegador. Misma anatomía que la invitación de usuarios (TPA-11): header con
 * título y cerrar, cuerpo y footer opcional en `bg-base`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cx(
        "m-auto max-h-[calc(100dvh-32px)] rounded-[var(--radius-card)] border border-border bg-surface p-0 text-ink backdrop:bg-carbon/40",
        size === "sm" ? "w-[min(460px,calc(100vw-32px))]" : size === "lg" ? "w-[min(820px,calc(100vw-32px))]" : "w-[min(600px,calc(100vw-32px))]",
      )}
    >
      {open && (
        <>
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold leading-6">{title}</h2>
              {description && <p className="mt-0.5 text-[13.5px] text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-muted hover:bg-surface-2">
              <IconClose size={18} />
            </button>
          </header>
          {children}
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-base px-5 py-3">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}

/** Cuerpo con padding estándar de los diálogos. */
export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("space-y-5 px-5 py-5", className)}>{children}</div>;
}

/** Footer de un <form> dentro del diálogo (los botones de submit tienen que quedar dentro del form). */
export function DialogFooter({ children }: { children: ReactNode }) {
  return <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-base px-5 py-3">{children}</footer>;
}
