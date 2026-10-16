"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { invitarAction, type InviteState } from "@/lib/usuarios-actions";
import { ChoiceCard } from "@/components/choice";
import { CopyButton } from "@/components/copy-button";
import { IconCheckCircle, IconClose, IconPlus, IconWhatsapp } from "@/components/icons";
import { Button, Field, Input, Notice, Spinner, buttonClass, fieldAria } from "@/components/ui";

const ROLES = [
  { v: "encargado", t: "Encargado", d: "Carga hacienda, sanidad y reproducción. No ve precios ni documentos fiscales." },
  { v: "asesor", t: "Asesor / veterinario", d: "Carga y ve sanidad y reproducción; ve comercialización sin precios." },
  { v: "admin", t: "Administrador", d: "Todo, incluso precios, fiscal y usuarios (no puede quitar al dueño)." },
  { v: "lectura", t: "Solo lectura", d: "Ve hacienda, reproducción y sanidad. No carga nada." },
];

const ROL_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.v, r.t]));

/** Invitar por email o teléfono con rol (flujo 16). */
export function InvitarDialog({ establecimiento }: { establecimiento: string }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(invitarAction, {} as InviteState);
  const [visto, setVisto] = useState<InviteState | null>(null);
  const creada = state.creada && state !== visto ? state.creada : null;
  const f = state === visto ? {} : (state.fields ?? {});

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const wa =
    creada?.url &&
    `https://wa.me/${creada.destino.includes("@") ? "" : creada.destino.replace(/\D/g, "")}?text=${encodeURIComponent(
      `Te invito a ${establecimiento} en TROPILLA como ${ROL_LABEL[creada.rol] ?? creada.rol}: ${creada.url}`,
    )}`;

  return (
    <>
      <Button
        icon={<IconPlus size={18} />}
        onClick={() => {
          setKey((k) => k + 1);
          setVisto(state);
          setOpen(true);
        }}
      >
        Invitar usuario
      </Button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(600px,calc(100vw-32px))] rounded-[var(--radius-card)] border border-border bg-surface p-0 text-ink backdrop:bg-carbon/40"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[17px] font-semibold">Invitar a {establecimiento}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-[8px] text-muted hover:bg-surface-2">
            <IconClose size={18} />
          </button>
        </header>
        {creada ? (
          <div className="space-y-4 px-5 py-5">
            <Notice tone="success" title={`Invitación creada para ${creada.destino}`}>
              Rol: {ROL_LABEL[creada.rol]}. Vence en 7 días. {creada.destino.includes("@") ? "Le mandamos un email con el enlace." : ""}
            </Notice>
            {creada.url && (
              <>
                <p className="text-[13.5px] text-muted">Si preferís, mandale el enlace vos. Es la única vez que lo ves: después sólo podés revocarlo.</p>
                <input readOnly value={creada.url} aria-label="Enlace de la invitación" className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-base px-3 font-mono text-[12.5px]" />
                <div className="flex flex-wrap gap-2">
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
                      <IconWhatsapp size={18} /> Mandar por WhatsApp
                    </a>
                  )}
                  <CopyButton value={creada.url} />
                </div>
              </>
            )}
            <div className="flex justify-end border-t border-border pt-4">
              <Button variant="outline" onClick={() => setOpen(false)} icon={<IconCheckCircle size={18} />}>
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <form key={key} action={action} noValidate>
            <div className="space-y-5 px-5 py-5">
              {state !== visto && state.error && <Notice tone="danger" title={state.error} />}
              <Field label="Email o teléfono" htmlFor="destino" error={f.destino} hint="Si es teléfono, le mandás el enlace por WhatsApp.">
                <Input id="destino" name="destino" placeholder="encargado@gmail.com o 3794 123456" autoFocus {...fieldAria("destino", f.destino, true)} />
              </Field>
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-ink">Rol</legend>
                <div className="grid gap-2">
                  {ROLES.map((r) => (
                    <ChoiceCard key={r.v} name="rol" value={r.v} title={r.t} description={r.d} defaultChecked={r.v === "encargado"} />
                  ))}
                </div>
                {f.rol && <p className="mt-2 text-[12.5px] font-medium text-danger">{f.rol}</p>}
              </fieldset>
            </div>
            <footer className="flex justify-end gap-2 border-t border-border bg-base px-5 py-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
                Crear invitación
              </Button>
            </footer>
          </form>
        )}
      </dialog>
    </>
  );
}
