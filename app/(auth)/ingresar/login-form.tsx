"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type FormState } from "@/lib/auth-actions";
import { PasswordInput } from "@/components/auth/password-input";
import { Button, Field, Input, Notice, Spinner, fieldAria } from "@/components/ui";

const initial: FormState = {};

const MOTIVOS: Record<string, { title: string; body: string }> = {
  sesion: { title: "Tu sesión venció", body: "Ingresá de nuevo para seguir trabajando." },
  restablecida: { title: "Contraseña actualizada", body: "Ya podés ingresar con la contraseña nueva." },
};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const motivo = MOTIVOS[params.get("motivo") ?? ""];
  const f = state.fields ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? (
        <Notice tone="danger" title={state.error} />
      ) : (
        motivo && (
          <Notice tone={params.get("motivo") === "restablecida" ? "success" : "info"} title={motivo.title}>
            {motivo.body}
          </Notice>
        )
      )}

      <input type="hidden" name="next" value={next} />

      <Field label="Email o teléfono" htmlFor="usuario" error={f.usuario}>
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          required
          defaultValue={state.values?.usuario}
          placeholder="nombre@establecimiento.com"
          {...fieldAria("usuario", f.usuario)}
        />
      </Field>

      <div className="space-y-1.5">
        <Field label="Contraseña" htmlFor="password" error={f.password}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required {...fieldAria("password", f.password)} />
        </Field>
        <p className="text-right">
          <Link href="/recuperar" className="text-[13px] font-medium text-campo hover:underline">
            Olvidé mi contraseña
          </Link>
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={pending} icon={pending ? <Spinner /> : undefined}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
