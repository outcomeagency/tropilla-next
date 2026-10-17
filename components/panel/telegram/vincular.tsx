"use client";

import { useActionState } from "react";
import { generarCodigoTelegramAction, type CodigoState } from "@/lib/telegram-actions";
import { CopyButton } from "@/components/copy-button";
import { IconExternal, IconSend } from "@/components/icons";
import { Button, Notice, Spinner, buttonClass } from "@/components/ui";
import { fechaHora } from "@/lib/format";

/** Genera el código de un solo uso y ofrece abrir el bot con el deep link (TPA-77). */
export function VincularTelegram() {
  const [state, action, pending] = useActionState(generarCodigoTelegramAction, {} as CodigoState);
  const c = state.codigo;

  return (
    <div className="space-y-4">
      {state.error && <Notice tone="danger" title={state.error} />}
      {c ? (
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-medium text-muted">Tu código · vale una sola vez, vence {fechaHora(c.expira_en)}</p>
            <p className="mt-1 font-mono text-[28px] font-semibold tracking-[0.18em] text-ink tabular-nums" aria-live="polite">
              {c.codigo}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={c.url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
              <IconExternal size={18} />
              Abrir @tropilla_bot en Telegram
            </a>
            <CopyButton value={`/start ${c.codigo}`} label="Copiar comando" />
          </div>
          <p className="text-[13.5px] text-muted">
            Si el enlace no abre Telegram, buscá el bot y mandale <span className="font-mono text-ink">/start {c.codigo}</span>. Después volvé a esta página.
          </p>
          <form action={action}>
            <button type="submit" className={buttonClass("ghost", "sm")} disabled={pending}>
              {pending && <Spinner />}
              Generar otro código
            </button>
          </form>
        </div>
      ) : (
        <form action={action}>
          <Button type="submit" icon={pending ? <Spinner /> : <IconSend size={18} />} disabled={pending}>
            Vincular Telegram
          </Button>
        </form>
      )}
    </div>
  );
}
