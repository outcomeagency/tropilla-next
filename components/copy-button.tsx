"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@/components/icons";
import { buttonClass } from "@/components/ui";

export function CopyButton({ value, label = "Copiar enlace" }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("outline", "md")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          // Sin permiso de portapapeles: el enlace queda visible para copiarlo a mano.
        }
      }}
    >
      {ok ? <IconCheck size={18} /> : <IconCopy size={18} />}
      <span aria-live="polite">{ok ? "Copiado" : label}</span>
    </button>
  );
}
