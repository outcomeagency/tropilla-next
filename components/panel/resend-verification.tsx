"use client";

import { useActionState } from "react";
import { resendVerificationAction, type FormState } from "@/lib/auth-actions";

export function ResendVerification() {
  const [state, action, pending] = useActionState(async () => resendVerificationAction(), {} as FormState);
  if (state.done) return <span className="text-[13px] font-semibold">Listo, revisá tu correo.</span>;
  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="text-[13px] font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60">
        {pending ? "Enviando…" : state.error ? "Reintentar" : "Reenviar el email"}
      </button>
    </form>
  );
}
