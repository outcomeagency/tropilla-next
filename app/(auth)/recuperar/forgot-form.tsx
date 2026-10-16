"use client";

import { useActionState } from "react";
import { forgotAction, type FormState } from "@/lib/auth-actions";
import { IconMail } from "@/components/icons";
import { Button, Field, Input, Notice, Spinner, fieldAria } from "@/components/ui";

const initial: FormState = {};

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotAction, initial);
  const f = state.fields ?? {};

  if (state.done) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-base p-5">
        <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-campo-50 text-monte">
          <IconMail size={22} />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold text-ink">Revisá tu correo o tus mensajes</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
          Si <span className="font-medium text-ink">{state.values?.usuario}</span> corresponde a una cuenta de TROPILLA, te llega un enlace
          en unos minutos. Vence en 60 minutos. Si no aparece, mirá en correo no deseado.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Notice tone="danger" title={state.error} />}
      <Field label="Email o teléfono" htmlFor="usuario" error={f.usuario}>
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          defaultValue={state.values?.usuario}
          placeholder="nombre@establecimiento.com"
          {...fieldAria("usuario", f.usuario)}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending} icon={pending ? <Spinner /> : undefined}>
        {pending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
