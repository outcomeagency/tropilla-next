"use client";

import { useActionState, useMemo, useState } from "react";
import type { EventoActionState } from "@/lib/eventos-api";
import { uuidv7 } from "@/lib/uuid";
import { Button, Notice, Spinner } from "@/components/ui";
import { IconAlert } from "@/components/icons";

type Action = (prev: EventoActionState, fd: FormData) => Promise<EventoActionState>;

/**
 * Estado de un formulario que llama a una Server Action del panel:
 * errores por campo, advertencias de coherencia y clave de idempotencia
 * estable entre reintentos (el mismo `id` no duplica el evento).
 */
export function useActionForm(action: Action) {
  const [state, formAction, pending] = useActionState(action, {} as EventoActionState);
  // Clave nueva después de cada guardado exitoso; igual entre reintentos fallidos.
  const idem = useMemo(() => uuidv7(), [state.ok]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = state.fields ?? {};
  return { state, formAction, pending, f, idem };
}

/** Errores generales y advertencias con «Guardar igual» (las advertencias avisan, no bloquean). */
export function FormAlerts({ state, pending, confirmLabel = "Guardar igual" }: { state: EventoActionState; pending?: boolean; confirmLabel?: string }) {
  if (state.advertencias?.length) {
    return (
      <div role="alert" className="rounded-[10px] border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning">
        <p className="flex items-center gap-2 font-semibold">
          <IconAlert size={18} className="shrink-0" /> Revisá antes de guardar
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-9">
          {state.advertencias.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3 pl-7">
          <Button type="submit" name="confirmar" value="1" size="sm" variant="outline" disabled={pending} icon={pending ? <Spinner /> : undefined}>
            {confirmLabel}
          </Button>
          <span className="text-[12.5px]">Queda registrado que lo confirmaste.</span>
        </div>
      </div>
    );
  }
  if (state.error) return <Notice tone="danger" title={state.error} />;
  return null;
}

/**
 * Formulario dentro de un diálogo: se cierra solo al guardar bien y, al
 * reabrir, no arrastra errores ni el «ok» anterior (estado «visto»).
 */
export function useDialogForm(action: Action) {
  const form = useActionForm(action);
  const [open, setOpen] = useState(false);
  const [visto, setVisto] = useState<EventoActionState | null>(null);
  const vivo = form.state === visto ? ({} as EventoActionState) : form.state;
  return {
    ...form,
    state: vivo,
    f: vivo.fields ?? {},
    open: open && !vivo.ok,
    /** Mensaje de éxito del último guardado (para mostrar fuera del diálogo). */
    ok: vivo.ok ?? null,
    abrir: () => {
      setVisto(form.state);
      setOpen(true);
    },
    cerrar: () => setOpen(false),
  };
}
