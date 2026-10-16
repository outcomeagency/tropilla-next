"use client";

import { useState } from "react";
import { IconAlert } from "@/components/icons";
import { cx, inputClass } from "@/components/ui";
import type { CategoriaOpcion } from "@/lib/lotes";

const nf = new Intl.NumberFormat("es-AR");

/**
 * Cabezas por categoría (inputs `c_<CODIGO>`) con total en vivo. Con
 * `disponibles`, sólo muestra las categorías que tiene el lote y limita al máximo.
 */
export function ConteoInputs({
  categorias,
  disponibles,
  error,
  legend,
}: {
  categorias: CategoriaOpcion[];
  disponibles?: Record<string, number>;
  error?: string;
  legend: string;
}) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const lista = disponibles ? categorias.filter((c) => (disponibles[c.codigo] ?? 0) > 0) : categorias;
  const total = Object.values(valores).reduce((s, v) => s + (/^\d+$/.test(v) ? Number(v) : 0), 0);

  return (
    <fieldset aria-describedby={error ? "conteo-error" : undefined}>
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-[13px] font-semibold text-ink">
        {legend}
        <span className="text-[12.5px] font-normal text-muted">
          Total <span className="font-semibold tabular-nums text-ink">{nf.format(total)}</span> cab.
        </span>
      </legend>
      <div className={cx("divide-y divide-border rounded-[10px] border", error ? "border-danger" : "border-border")}>
        {lista.map((c) => {
          const max = disponibles?.[c.codigo];
          const v = valores[c.codigo] ?? "";
          const pasado = max != null && /^\d+$/.test(v) && Number(v) > max;
          return (
            <label key={c.codigo} className="flex items-center justify-between gap-3 px-3 py-2">
              {max != null && <input type="hidden" name={`d_${c.codigo}`} value={max} />}
              <span className="min-w-0 text-[14px] text-ink">
                {c.nombre}
                {max != null && <span className="ml-1.5 text-[12.5px] text-muted">hay {nf.format(max)}</span>}
              </span>
              <input
                name={`c_${c.codigo}`}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={v}
                onChange={(e) => setValores((s) => ({ ...s, [c.codigo]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                placeholder="0"
                aria-label={`Cabezas de ${c.nombre}`}
                aria-invalid={pasado || undefined}
                className={cx(inputClass, "h-9 max-w-[96px] shrink-0 text-right tabular-nums aria-[invalid=true]:border-danger")}
              />
            </label>
          );
        })}
      </div>
      {error && (
        <p id="conteo-error" className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-danger">
          <IconAlert size={14} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
