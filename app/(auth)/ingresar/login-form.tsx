"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "@/lib/auth-actions";
import { Button, Field, Input, Notice } from "@/components/ui";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const sessionExpired = params.get("motivo") === "sesion";

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? (
        <Notice tone="danger" title={state.error} />
      ) : (
        sessionExpired && (
          <Notice tone="info" title="Tu sesión venció">
            Ingresá de nuevo para seguir trabajando.
          </Notice>
        )
      )}

      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state.email}
          placeholder="nombre@establecimiento.com"
        />
      </Field>

      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
