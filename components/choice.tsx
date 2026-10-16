import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui";
import { IconCheck } from "@/components/icons";

/**
 * Controles de elección como tarjetas/chips. El input nativo queda accesible
 * (foco, teclado, lectores) y el estilo sale de `has-checked:` (sin JS).
 */

type Native = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children">;

export function ChoiceCard({
  type = "radio",
  icon,
  title,
  description,
  className,
  ...input
}: Native & { type?: "radio" | "checkbox"; icon?: ReactNode; title: string; description?: ReactNode }) {
  return (
    <label
      className={cx(
        "group relative flex cursor-pointer gap-3 rounded-[12px] border border-border-strong bg-surface p-4 transition-colors",
        "hover:border-campo has-checked:border-campo has-checked:bg-campo-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-campo",
        className,
      )}
    >
      <input type={type} className="sr-only" {...input} />
      {icon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-crema text-monte group-has-checked:bg-surface">{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "grid h-5 w-5 shrink-0 place-items-center border border-border-strong bg-surface text-transparent",
          "group-has-checked:border-monte group-has-checked:bg-monte group-has-checked:text-blanco",
          type === "radio" ? "rounded-full" : "rounded-[5px]",
        )}
      >
        <IconCheck size={13} strokeWidth={2.5} />
      </span>
    </label>
  );
}

export function ChoiceChip({ label, className, ...input }: Native & { label: string; type?: "radio" | "checkbox" }) {
  return (
    <label
      className={cx(
        "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border-strong bg-surface px-4 text-[14px] font-medium text-ink transition-colors",
        "hover:border-campo has-checked:border-monte has-checked:bg-monte has-checked:text-blanco has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-campo",
        className,
      )}
    >
      <input type={input.type ?? "checkbox"} className="sr-only" {...input} />
      {label}
    </label>
  );
}

/** Fila con interruptor (sí/no) y explicación. */
export function SwitchRow({ label, description, ...input }: Native & { label: string; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-[14.5px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...input} />
        <span className="h-6 w-11 rounded-full bg-ghost transition-colors peer-checked:bg-campo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-campo" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface ring-1 ring-border transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
