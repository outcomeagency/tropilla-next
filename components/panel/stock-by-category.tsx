"use client";

import { useId, useState } from "react";
import { cx } from "@/components/ui";
import type { Especie } from "@/lib/types";

export interface StockRow {
  categoria: string;
  cabezas: number;
}

/** Series de color por posición de categoría (tokens chart-1…5 de theme.css). */
const SERIES_BG = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

const TABS: Array<{ id: Especie; label: string }> = [
  { id: "bovino", label: "Bovino" },
  { id: "bubalino", label: "Bubalino" },
];

const nf = new Intl.NumberFormat("es-AR");
const pf = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Existencias por categoría con pestañas por especie: barra apilada + tabla (preview 01). */
export function StockByCategory({ data, initial = "bubalino" }: { data: Record<Especie, StockRow[]>; initial?: Especie }) {
  const [especie, setEspecie] = useState<Especie>(initial);
  const baseId = useId();
  const rows = data[especie];
  const total = rows.reduce((sum, r) => sum + r.cabezas, 0);

  return (
    <div className="px-5 pb-4 pt-3">
      <div role="tablist" aria-label="Especie" className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const selected = t.id === especie;
          return (
            <button
              key={t.id}
              id={`${baseId}-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              onClick={() => setEspecie(t.id)}
              className={cx(
                "-mb-px border-b-2 px-4 py-2 text-[14px] transition-colors",
                selected ? "border-monte font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${especie}`}>
        <div className="mt-4 flex h-7 w-full overflow-hidden rounded-[6px]" aria-hidden="true">
          {rows.map((r, i) => (
            <div
              key={r.categoria}
              className={cx(SERIES_BG[i % SERIES_BG.length], i > 0 && "border-l-2 border-surface")}
              style={{ width: `${(r.cabezas / total) * 100}%` }}
            />
          ))}
        </div>

        <table className="mt-3 w-full text-left text-[14px]">
          <caption className="sr-only">Existencias de {especie} por categoría: {nf.format(total)} cabezas</caption>
          <thead>
            <tr className="text-[12px] text-muted">
              <th scope="col" className="py-2 font-medium">Categoría</th>
              <th scope="col" className="py-2 text-right font-medium">Cabezas</th>
              <th scope="col" className="py-2 text-right font-medium">% del total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.categoria} className="border-t border-border">
                <td className="py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span className={cx("h-2.5 w-2.5 rounded-full", SERIES_BG[i % SERIES_BG.length])} aria-hidden="true" />
                    {r.categoria}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums">{nf.format(r.cabezas)}</td>
                <td className="py-2.5 text-right tabular-nums text-muted">{pf.format((r.cabezas / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-strong font-semibold">
              <td className="py-2.5">Total</td>
              <td className="py-2.5 text-right tabular-nums">{nf.format(total)}</td>
              <td className="py-2.5 text-right tabular-nums text-muted">100,0%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
