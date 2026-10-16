"use client";

import { useActionState, useState } from "react";
import { tomarTokensAction, type TomaState } from "@/lib/comprador-actions";
import { Button, Notice, Spinner } from "@/components/ui";

export function TakeTokens({
  codigo,
  locale,
  libres,
  kgToken,
  anticipoPorToken,
  t,
}: {
  codigo: string;
  locale: string;
  libres: number;
  kgToken: number;
  anticipoPorToken: number;
  t: { howMany: string; youPay: string; youGet: string; reserve: string };
}) {
  const [state, action, pending] = useActionState(tomarTokensAction, {} as TomaState);
  const [n, setN] = useState(Math.min(5, libres));
  const [idem] = useState(() => crypto.randomUUID());
  const money = new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-AR");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="codigo" value={codigo} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="idem" value={idem} />
      {state.error && <Notice tone="danger" title={state.error} />}
      <div>
        <label htmlFor="tokens" className="text-[13px] font-semibold text-ink">
          {t.howMany}
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <button type="button" onClick={() => setN((x) => Math.max(1, x - 1))} className="grid h-11 w-11 place-items-center rounded-[8px] border border-border-strong text-[18px]" aria-label="−1">
            −
          </button>
          <input
            id="tokens"
            name="tokens"
            type="number"
            min={1}
            max={libres}
            value={n}
            onChange={(e) => setN(Math.max(1, Math.min(libres, Number(e.target.value) || 1)))}
            className="h-11 w-24 rounded-[8px] border border-border-strong bg-surface text-center text-[17px] font-semibold tabular-nums"
          />
          <button type="button" onClick={() => setN((x) => Math.min(libres, x + 1))} className="grid h-11 w-11 place-items-center rounded-[8px] border border-border-strong text-[18px]" aria-label="+1">
            +
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-[10px] bg-base p-3">
          <dt className="text-muted">{t.youGet}</dt>
          <dd className="text-[18px] font-bold tabular-nums text-ink">{nf.format(n * kgToken)}</dd>
        </div>
        <div className="rounded-[10px] bg-base p-3">
          <dt className="text-muted">{t.youPay}</dt>
          <dd className="text-[18px] font-bold tabular-nums text-ink">{money.format(n * anticipoPorToken)}</dd>
        </div>
      </dl>
      <Button type="submit" className="w-full" disabled={pending || libres < 1} icon={pending ? <Spinner /> : undefined}>
        {t.reserve}
      </Button>
    </form>
  );
}
