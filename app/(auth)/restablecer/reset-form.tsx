"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetAction, type FormState } from "@/lib/auth-actions";
import { PasswordInput } from "@/components/auth/password-input";
import { IconCheckCircle } from "@/components/icons";
import { Button, Field, Notice, Spinner, buttonClass, fieldAria } from "@/components/ui";

const initial: FormState = {};

export function ResetForm() {
  const [state, action, pending] = useActionState(resetAction, initial);
  const token = useSearchParams().get("token") ?? "";
  const f = state.fields ?? {};

  if (state.done) {
    return (
      <div className="space-y-5">
        <Notice tone="success" title="Listo, tu contraseña quedó actualizada">
          Cerramos las sesiones abiertas en otros dispositivos.
        </Notice>
        <Link href="/ingresar?motivo=restablecida" className={buttonClass("primary", "md", "w-full")}>
          <IconCheckCircle size={18} /> Ingresar
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <Notice tone="warning" title="Este enlace no es válido">
        Abrí el enlace completo que te llegó, o pedí uno nuevo desde{" "}
        <Link href="/recuperar" className="font-semibold underline">
          Olvidé mi contraseña
        </Link>
        .
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Notice tone="danger" title={state.error} />}
      <input type="hidden" name="token" value={token} />
      <Field label="Contraseña nueva" htmlFor="password" error={f.password} hint="8 caracteres o más, con letras y números.">
        <PasswordInput id="password" name="password" autoComplete="new-password" {...fieldAria("password", f.password, true)} />
      </Field>
      <Field label="Repetila" htmlFor="confirmacion" error={f.confirmacion}>
        <PasswordInput id="confirmacion" name="confirmacion" autoComplete="new-password" {...fieldAria("confirmacion", f.confirmacion)} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending} icon={pending ? <Spinner /> : undefined}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
