"use client";

import { useState, type InputHTMLAttributes } from "react";
import { IconEye, IconEyeOff } from "@/components/icons";
import { cx, inputClass } from "@/components/ui";

/** Contraseña con botón «mostrar» (en el campo se tipea con guantes y sol: ver ayuda). */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cx(inputClass, "pr-12 aria-[invalid=true]:border-danger", props.className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[6px] text-muted hover:bg-surface-2 hover:text-ink"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}
