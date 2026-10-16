"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { calcularSimulacionAction, guardarSimulacionAction, type SimEntradasForm, type SimResultado } from "@/lib/simulador-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { Badge, Button, Card, CardHeader, Field, Input, Spinner, cx } from "@/components/ui";
import { IconBuffalo, IconCheckCircle, IconCow, IconInfo, IconScale } from "@/components/icons";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const kgf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const n = (s?: string | null) => (s == null || s === "" ? 0 : Number(String(s).replace(",", ".")));
const $ = (s?: string | null) => money.format(n(s));

function NumInput({ id, label, value, onChange, suffix, prefix, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix?: string; prefix?: string; hint?: ReactNode }) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">{prefix}</span>}
        <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))} className={cx("tabular-nums", prefix && "pl-7", suffix && "pr-14")} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

function Linea({ label, a, b, fuerte, neg }: { label: ReactNode; a?: ReactNode; b?: ReactNode; fuerte?: boolean; neg?: boolean }) {
  return (
    <div className={cx("grid grid-cols-[minmax(0,1.2fr)_1fr_1fr] items-baseline gap-3 border-b border-border px-5 py-2.5 last:border-b-0", fuerte && "py-4")}>
      <span className={cx("text-[13.5px]", fuerte ? "font-semibold text-ink" : "text-muted")}>{label}</span>
      {[a, b].map((v, i) => (
        <span key={i} className={cx("text-right tabular-nums", fuerte ? "text-[22px] font-bold tracking-[-0.02em] text-ink" : "text-[14px] text-ink", neg && "text-muted")}>
          {v ?? <span className="text-subtle">—</span>}
        </span>
      ))}
    </div>
  );
}

function formulaLines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((x) => typeof x === "string" ? x : JSON.stringify(x));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => {
    const lines = Array.isArray(item) ? item.map((x) => typeof x === "string" ? x : JSON.stringify(x)) : [typeof item === "string" ? item : JSON.stringify(item)];
    return lines.map((line) => `${key}: ${line}`);
  });
  return [];
}

/**
 * Simulador de liquidación en pie vs al gancho (TPA-45). Calcula la API (misma fórmula para
 * web y app) y la pantalla muestra la cuenta completa con los números del caso, como pidió
 * Claude Design (duda 4): rendimiento sobre el peso bruto, desbaste sólo en pie, gastos a cargo del vendedor.
 */
export function Simulador({ inicial, defaults }: { inicial: SimEntradasForm; defaults: Record<"BOV" | "BUB", { rendimiento: string; desbaste: string }> }) {
  const [f, setF] = useState<SimEntradasForm>(inicial);
  const [res, setRes] = useState<SimResultado | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [calculando, start] = useTransition();
  const guardar = useActionForm(guardarSimulacionAction);
  const set = (k: keyof SimEntradasForm) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const t = setTimeout(() => {
      start(async () => {
        const r = await calcularSimulacionAction(f);
        setRes(r.resultado ?? null);
        setErr(r.resultado ? null : (r.error ?? null));
      });
    }, 350);
    return () => clearTimeout(t);
  }, [f]);

  const bruto = n(f.cabezas) * n(f.pesoProm);
  const pie = res?.en_pie;
  const gancho = res?.al_gancho;
  const gana = res?.conviene;
  const formulaPie = formulaLines(res?.formula?.en_pie);
  const formulaGancho = formulaLines(res?.formula?.al_gancho);
  const formulaComun = formulaLines(res?.formula?.comun);

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader title="Datos del trato" description="Cambiá cualquier número y el resultado se recalcula." />
        <div className="space-y-5 px-5 py-5">
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-ink">Especie</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["BUB", "BOV"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={f.especie === e}
                  onClick={() => setF((x) => ({ ...x, especie: e, rendimiento: defaults[e].rendimiento, desbaste: defaults[e].desbaste }))}
                  className={cx(
                    "flex h-11 items-center justify-center gap-2 rounded-[8px] border text-[14px] font-medium",
                    f.especie === e ? "border-monte bg-monte text-blanco" : "border-border-strong bg-surface text-ink hover:border-campo",
                  )}
                >
                  {e === "BUB" ? <IconBuffalo size={18} /> : <IconCow size={18} />} {e === "BUB" ? "Búfalos" : "Bovinos"}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <NumInput id="cabezas" label="Cabezas" value={f.cabezas} onChange={set("cabezas")} />
            <NumInput id="peso" label="Peso promedio" value={f.pesoProm} onChange={set("pesoProm")} suffix="kg" />
          </div>
          <p className="-mt-2 flex items-center gap-1.5 text-[12.5px] text-muted">
            <IconScale size={14} /> {kgf.format(bruto)} kg brutos en total
          </p>

          <fieldset className="space-y-3 rounded-[10px] border border-border bg-base p-4">
            <legend className="px-1 text-[13px] font-semibold text-ink">En pie</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumInput id="precio_pie" label="Precio por kg vivo" value={f.precioPie} onChange={set("precioPie")} prefix="$" />
              <NumInput id="desbaste" label="Desbaste" value={f.desbaste} onChange={set("desbaste")} suffix="%" />
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded-[10px] border border-border bg-base p-4">
            <legend className="px-1 text-[13px] font-semibold text-ink">Al gancho</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumInput id="precio_gancho" label="Precio por kg al gancho" value={f.precioGancho} onChange={set("precioGancho")} prefix="$" />
              <NumInput id="rendimiento" label="Rendimiento" value={f.rendimiento} onChange={set("rendimiento")} suffix="%" hint={`Referencia NEA: ${defaults[f.especie].rendimiento} %`} />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-1 text-[13px] font-semibold text-ink">Gastos del vendedor</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumInput id="flete" label="Flete" value={f.flete} onChange={set("flete")} prefix="$" />
              <NumInput id="comision" label="Comisión" value={f.comision} onChange={set("comision")} suffix="%" />
              <NumInput id="arranque" label="Arranque" value={f.arranque} onChange={set("arranque")} prefix="$" />
              <NumInput id="seguro" label="Seguro" value={f.seguro} onChange={set("seguro")} prefix="$" />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink">IVA</p>
              <div className="flex gap-2">
                {["10.5", "21"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={f.iva === v}
                    onClick={() => setF((x) => ({ ...x, iva: v }))}
                    className={cx("h-9 rounded-full border px-4 text-[13.5px] font-medium", f.iva === v ? "border-monte bg-monte text-blanco" : "border-border-strong bg-surface text-ink")}
                  >
                    {v.replace(".", ",")} %
                  </button>
                ))}
              </div>
            </div>
          </fieldset>
        </div>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Resultado</h2>
              <p className="text-[13px] text-muted">Lo que te queda neto, después de comisión y gastos.</p>
            </div>
            {calculando && (
              <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                <Spinner size={14} /> Calculando
              </span>
            )}
          </div>
          {err && !res ? (
            <p className="flex items-center gap-2 px-5 py-8 text-[14px] text-muted">
              <IconInfo size={18} /> {err.includes("válidos") ? "Completá cabezas, peso y al menos un precio." : err}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1.2fr)_1fr_1fr] gap-3 border-b border-border bg-base px-5 py-3">
                <span />
                {(["en_pie", "al_gancho"] as const).map((k) => (
                  <span key={k} className="flex flex-col items-end gap-1">
                    <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-ink">{k === "en_pie" ? "En pie" : "Al gancho"}</span>
                    {gana === k && (
                      <Badge tone="success" icon={<IconCheckCircle size={14} />}>
                        Conviene
                      </Badge>
                    )}
                  </span>
                ))}
              </div>
              <Linea label="Kilos que se liquidan" a={pie && `${kgf.format(n(pie.kg_liquidables))} kg`} b={gancho && `${kgf.format(n(gancho.kg_liquidables))} kg`} />
              <Linea label="Subtotal" a={pie && $(pie.subtotal)} b={gancho && $(gancho.subtotal)} />
              <Linea label="IVA (informativo)" a={pie && $(pie.iva)} b={gancho && $(gancho.iva)} neg />
              <Linea label="Comisión" a={pie && `− ${$(pie.comision)}`} b={gancho && `− ${$(gancho.comision)}`} />
              <Linea label="Flete, arranque y seguro" a={pie && `− ${$(pie.gastos)}`} b={gancho && `− ${$(gancho.gastos)}`} />
              <Linea label="Te queda neto" a={pie && $(pie.neto_total)} b={gancho && $(gancho.neto_total)} fuerte />
              <Linea label="Neto por kg vivo" a={pie && `${$(pie.neto_kg_vivo)}/kg`} b={gancho && `${$(gancho.neto_kg_vivo)}/kg`} />
              {res?.diferencia_neto && gana && gana !== "igual" && (
                <p className="border-t border-success-border bg-success-bg px-5 py-3 text-[14.5px] text-success">
                  <span className="font-semibold">{gana === "al_gancho" ? "Al gancho" : "En pie"} te quedan {$(String(Math.abs(n(res.diferencia_neto))))} más</span> con estos números.
                </p>
              )}
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Cómo se calcula" description="La misma cuenta que hace la app, con tus números." />
          <div className="grid gap-4 px-5 py-4 text-[13.5px] md:grid-cols-2">
            <div>
              <p className="mb-1.5 font-semibold text-ink">En pie</p>
              <ol className="space-y-1 font-mono text-[12.5px] leading-relaxed text-ink">
                {formulaPie.length ? formulaPie.map((line, i) => <li key={i}>{line}</li>) : <li>{kgf.format(bruto)} kg × (1 − {f.desbaste || 0} %) = {kgf.format(n(pie?.kg_liquidables))} kg; luego × {$(f.precioPie)} = {$(pie?.subtotal)}</li>}
              </ol>
            </div>
            <div>
              <p className="mb-1.5 font-semibold text-ink">Al gancho</p>
              <ol className="space-y-1 font-mono text-[12.5px] leading-relaxed text-ink">
                {formulaGancho.length ? formulaGancho.map((line, i) => <li key={i}>{line}</li>) : <li>{kgf.format(bruto)} kg × {f.rendimiento || 0} % = {kgf.format(n(gancho?.kg_liquidables))} kg; luego × {$(f.precioGancho)} = {$(gancho?.subtotal)}</li>}
              </ol>
            </div>
            <div className="md:col-span-2">
              <p className="mb-1.5 font-semibold text-ink">En los dos casos</p>
              <ol className="space-y-1 font-mono text-[12.5px] leading-relaxed text-ink">
                {formulaComun.length ? formulaComun.map((line, i) => <li key={i}>{line}</li>) : <li>comisión = subtotal × {f.comision || 0} % · gastos = flete {$(f.flete)} + arranque {$(f.arranque)} + seguro {$(f.seguro)} · neto = subtotal − comisión − gastos · neto por kg vivo = neto ÷ {kgf.format(bruto)} kg</li>}
              </ol>
              <p className="mt-3 flex gap-2 text-[12.5px] text-muted">
                <IconInfo size={14} className="mt-0.5 shrink-0" /> Criterio: el desbaste se aplica sólo en pie; el rendimiento al gancho, sobre el peso bruto; flete, arranque, seguro y comisión los paga el vendedor; el IVA se muestra pero no entra en el neto.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <form action={guardar.formAction} className="flex flex-wrap items-end gap-3 px-5 py-4">
            <input type="hidden" name="entradas" value={JSON.stringify(f)} />
            <div className="min-w-[220px] flex-1">
              <Field label="Guardar para comparar después" htmlFor="nombre_sim" optional>
                <Input id="nombre_sim" name="nombre" maxLength={120} placeholder="Ej. Bubillos octubre — frigorífico Goya" />
              </Field>
            </div>
            <Button type="submit" variant="outline" disabled={guardar.pending || !res}>
              {guardar.pending ? <Spinner /> : null} Guardar simulación
            </Button>
            <div className="basis-full empty:hidden">
              <FormAlerts state={guardar.state} pending={guardar.pending} />
              {guardar.state.ok && <p className="text-[13px] font-medium text-success">{guardar.state.ok.mensaje}</p>}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
