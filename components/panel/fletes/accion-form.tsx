"use client";

import type { ReactNode } from "react";
import type { EventoActionState } from "@/lib/eventos-api";
import { useActionForm } from "@/components/panel/form-state";
import { Button, Spinner } from "@/components/ui";

type Action = (prev: EventoActionState, fd: FormData) => Promise<EventoActionState>;

/** Botón de una sola acción (tomar, retirar, cerrar, activar…) con campos ocultos y error en línea. */
export function AccionForm({
  action,
  campos,
  label,
  icon,
  variant = "outline",
  size = "sm",
  confirmar,
}: {
  action: Action;
  campos: Record<string, string>;
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  /** Texto de confirmación nativa antes de enviar (acciones que no se deshacen). */
  confirmar?: string;
}) {
  const { state, formAction, pending } = useActionForm(action);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      className="inline-flex flex-wrap items-center gap-2"
    >
      {Object.entries(campos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={pending} icon={pending ? <Spinner /> : icon}>
        {label}
      </Button>
      {state.error && (
        <span role="alert" className="text-[12.5px] text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}
