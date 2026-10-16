"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { registerAction, type FormState } from "@/lib/auth-actions";
import { PasswordInput } from "@/components/auth/password-input";
import { IconCheck } from "@/components/icons";
import { Button, Field, Input, Notice, Spinner, cx, fieldAria } from "@/components/ui";

const initial: FormState = {};

/** Requisitos visibles mientras se escribe (no un medidor de «fuerza» decorativo). */
function PasswordRules({ value }: { value: string }) {
  const rules = [
    { ok: value.length >= 8, label: "8 caracteres o más" },
    { ok: /\d/.test(value) && /[a-zA-Z]/.test(value), label: "Letras y números" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]" aria-live="polite">
      {rules.map((r) => (
        <li key={r.label} className={cx("flex items-center gap-1", r.ok ? "text-success" : "text-muted")}>
          <IconCheck size={14} className={r.ok ? "" : "opacity-40"} />
          {r.label}
        </li>
      ))}
    </ul>
  );
}

export function RegisterForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(registerAction, initial);
  const [password, setPassword] = useState("");
  const f = state.fields ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Notice tone="danger" title={state.error} />}
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Nombre y apellido" htmlFor="nombre" error={f.nombre}>
        <Input
          id="nombre"
          name="nombre"
          autoComplete="name"
          required
          defaultValue={state.values?.nombre}
          placeholder="Ramón Ferreyra"
          {...fieldAria("nombre", f.nombre)}
        />
      </Field>

      <Field
        label="Email o teléfono celular"
        htmlFor="usuario"
        error={f.usuario}
        hint="Con el email te mandamos un enlace para verificar la cuenta."
      >
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          required
          defaultValue={state.values?.usuario}
          placeholder="nombre@establecimiento.com o 3794 123456"
          {...fieldAria("usuario", f.usuario, true)}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={f.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          {...fieldAria("password", f.password)}
        />
      </Field>
      {!f.password && <PasswordRules value={password} />}

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-[14px] leading-snug text-ink">
          <input
            type="checkbox"
            name="terminos"
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-monte"
            aria-invalid={f.terminos ? true : undefined}
            aria-describedby={f.terminos ? "terminos-error" : undefined}
          />
          <span>
            Acepto los <Link href="/es/terminos" className="font-medium text-campo underline-offset-2 hover:underline">términos</Link> y la{" "}
            <Link href="/es/privacidad" className="font-medium text-campo underline-offset-2 hover:underline">política de privacidad</Link>. Mis datos
            son privados: sólo se publica lo que yo elija.
          </span>
        </label>
        {f.terminos && (
          <p id="terminos-error" className="pl-[30px] text-[12.5px] font-medium text-danger">
            {f.terminos}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending} icon={pending ? <Spinner /> : undefined}>
        {pending ? "Creando la cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
