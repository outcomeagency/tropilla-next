"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { calcularBriefAction, guardarBriefAction, type BriefEntradas } from "@/lib/forraje-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { Button, Card, CardHeader, Field, Input, Notice, Spinner, cx } from "@/components/ui";
import { IconChevronDown, IconLeaf } from "@/components/icons";
import { ResultadoBrief } from "@/components/panel/forraje/resultado-brief";
import type { S } from "@/lib/schemas";

type Insumos = S<"BriefForrajeInsumos">;
type Resultado = S<"BriefForrajeResultado">;

const SUPUESTOS: { clave: keyof NonNullable<BriefEntradas["supuestos"]>; label: string; sufijo: string }[] = [
  { clave: "consumo_ms_kg_ev_dia", label: "Consumo por EV y día", sufijo: "kg MS" },
  { clave: "aprovechamiento_reservas_pct", label: "Aprovechamiento de reservas", sufijo: "%" },
  { clave: "incertidumbre_pct", label: "Margen de incertidumbre", sufijo: "±%" },
  { clave: "reduccion_moderado_pct", label: "Menos pasto, escenario moderado", sufijo: "%" },
  { clave: "reduccion_severo_pct", label: "Menos pasto, escenario severo", sufijo: "%" },
  { clave: "ms_rollos_pct", label: "Materia seca de rollos", sufijo: "%" },
  { clave: "ms_silo_pct", label: "Materia seca de silo", sufijo: "%" },
  { clave: "ms_suplemento_pct", label: "Materia seca de suplemento", sufijo: "%" },
];

type Form = {
  horizonte: string;
  rollos: string;
  kgRollo: string;
  silo: string;
  suplemento: string;
  superficie: string;
  receptividad: string;
  cabezas: Record<string, string>;
  supuestos: Record<string, string>;
};

const limpio = (s: string) => s.replace(",", ".").trim();
const numero = (s: string): number | undefined => {
  const v = Number(limpio(s));
  return limpio(s) === "" || !Number.isFinite(v) ? undefined : v;
};

function NumInput({ id, label, value, onChange, sufijo, hint, error, entero }: { id: string; label: string; value: string; onChange: (v: string) => void; sufijo?: string; hint?: ReactNode; error?: string; entero?: boolean }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={id}
          inputMode={entero ? "numeric" : "decimal"}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(entero ? /[^\d]/g : /[^\d.,]/g, ""))}
          className={cx("tabular-nums", sufijo && "pr-16")}
          aria-invalid={error ? true : undefined}
        />
        {sufijo && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">{sufijo}</span>}
      </div>
    </Field>
  );
}

function inicial(ins: Insumos): Form {
  const prev = (ins.reservas_ultimo_brief ?? {}) as { rollos?: { cantidad?: number | null; kg_por_rollo?: number | null } | null; silo?: { toneladas?: number | null } | null; suplemento?: { kg?: number | null } | null };
  const s = (v?: number | null) => (v == null ? "" : String(v));
  return {
    horizonte: "90",
    rollos: s(prev.rollos?.cantidad),
    kgRollo: s(prev.rollos?.kg_por_rollo) || (ins.supuestos.rollo_kg?.valor ?? "450"),
    silo: s(prev.silo?.toneladas),
    suplemento: s(prev.suplemento?.kg),
    superficie: ins.superficie.valor ?? "",
    receptividad: ins.receptividad.valor ?? "",
    cabezas: Object.fromEntries(ins.inventario.map((f) => [f.categoria, String(f.cabezas)])),
    supuestos: Object.fromEntries(SUPUESTOS.map((x) => [x.clave, ins.supuestos[x.clave]?.valor ?? ""])),
  };
}

/** Arma `BriefForrajeInput` mandando solo lo que el usuario cambió respecto de lo declarado (así el origen queda claro). */
function entradas(f: Form, base: Form, ins: Insumos): BriefEntradas {
  const e: BriefEntradas = { horizonte_dias: Math.min(365, Math.max(7, Number(f.horizonte) || 90)) };
  const reservas: NonNullable<BriefEntradas["reservas"]> = {};
  if (numero(f.rollos)) reservas.rollos = { cantidad: Math.round(numero(f.rollos)!), kg_por_rollo: numero(f.kgRollo) ?? null };
  if (numero(f.silo)) reservas.silo = { toneladas: numero(f.silo)! };
  if (numero(f.suplemento)) reservas.suplemento = { kg: numero(f.suplemento)! };
  if (Object.keys(reservas).length) e.reservas = reservas;
  if (f.superficie !== base.superficie && numero(f.superficie)) e.superficie_ha = numero(f.superficie);
  if (f.receptividad !== base.receptividad && numero(f.receptividad)) e.receptividad_ev_ha = numero(f.receptividad);
  if (Object.entries(f.cabezas).some(([k, v]) => v !== base.cabezas[k])) {
    e.inventario = ins.inventario.map((r) => ({ categoria: r.categoria, cabezas: Math.round(numero(f.cabezas[r.categoria] ?? "") ?? 0) }));
  }
  const sup: Record<string, number> = {};
  for (const x of SUPUESTOS) {
    if (f.supuestos[x.clave] !== base.supuestos[x.clave] && numero(f.supuestos[x.clave]) !== undefined) sup[x.clave] = numero(f.supuestos[x.clave])!;
  }
  if (Object.keys(sup).length) e.supuestos = sup;
  return e;
}

/** Brief preventivo de forraje y carga (TPA-71): el productor ajusta reservas y supuestos, la API calcula y el panel muestra escenarios con rango. */
export function BriefForm({ insumos, puedeGuardar }: { insumos: Insumos; puedeGuardar: boolean }) {
  const base = useMemo(() => inicial(insumos), [insumos]);
  const [f, setF] = useState<Form>(base);
  const [res, setRes] = useState<Resultado | null>(null);
  const [err, setErr] = useState<{ error?: string; fields?: Record<string, string> } | null>(null);
  const [calculando, start] = useTransition();
  const guardar = useActionForm(guardarBriefAction);
  const datos = useMemo(() => entradas(f, base, insumos), [f, base, insumos]);
  const set = (k: keyof Omit<Form, "cabezas" | "supuestos">) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const t = setTimeout(() => {
      start(async () => {
        const r = await calcularBriefAction(datos);
        setRes(r.resultado ?? null);
        setErr(r.resultado ? null : { error: r.error, fields: r.fields });
      });
    }, 400);
    return () => clearTimeout(t);
  }, [datos]);

  const fe = err?.fields ?? {};
  const cambiado = JSON.stringify(f) !== JSON.stringify(base);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Datos del brief"
          description="Arranca con lo que declaraste en la hacienda y en la ficha del establecimiento. Lo que cambies acá queda marcado como «cargado en este brief»."
          action={
            <div className="flex items-center gap-2 text-[12.5px] text-muted">
              {calculando && <Spinner size={14} />}
              {calculando ? "Calculando…" : "Se recalcula al escribir"}
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-6 px-5 py-5 xl:grid-cols-3">
          <fieldset className="space-y-3">
            <legend className="mb-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">Reservas disponibles</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumInput id="rollos" label="Rollos" value={f.rollos} onChange={set("rollos")} sufijo="unid." entero error={fe["reservas.rollos.cantidad"]} />
              <NumInput id="kgRollo" label="Peso por rollo" value={f.kgRollo} onChange={set("kgRollo")} sufijo="kg" error={fe["reservas.rollos.kg_por_rollo"]} />
            </div>
            <NumInput id="silo" label="Silo" value={f.silo} onChange={set("silo")} sufijo="t" hint="Toneladas tal cual" error={fe["reservas.silo.toneladas"]} />
            <NumInput id="suplemento" label="Suplemento o grano" value={f.suplemento} onChange={set("suplemento")} sufijo="kg" error={fe["reservas.suplemento.kg"]} />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">Campo</legend>
            <NumInput id="superficie" label="Superficie ganadera" value={f.superficie} onChange={set("superficie")} sufijo="ha" hint={insumos.superficie.detalle} error={fe.superficie_ha} />
            <NumInput
              id="receptividad"
              label="Receptividad"
              value={f.receptividad}
              onChange={set("receptividad")}
              sufijo="EV/ha"
              hint={insumos.receptividad.valor ? `Ficha: ${[insumos.receptividad.periodo, insumos.receptividad.criterio].filter(Boolean).join(" · ")}` : "Declarala en Mi establecimiento › Capacidad de carga"}
              error={fe.receptividad_ev_ha}
            />
            <NumInput id="horizonte" label="Horizonte" value={f.horizonte} onChange={set("horizonte")} sufijo="días" entero hint="Entre 7 y 365 días" error={fe.horizonte_dias} />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">Rodeo</legend>
            {insumos.inventario.length ? (
              <div className="space-y-2">
                {insumos.inventario.map((r) => (
                  <div key={r.categoria} className="grid grid-cols-[minmax(0,1fr)_110px] items-center gap-3">
                    <label htmlFor={`cab-${r.categoria}`} className="truncate text-[14px] text-ink">
                      {r.categoria_nombre}
                      <span className="block text-[12px] text-muted">{r.ev_por_cabeza} EV por cabeza</span>
                    </label>
                    <Input
                      id={`cab-${r.categoria}`}
                      inputMode="numeric"
                      className="text-right tabular-nums"
                      value={f.cabezas[r.categoria] ?? ""}
                      onChange={(e) => setF((x) => ({ ...x, cabezas: { ...x.cabezas, [r.categoria]: e.target.value.replace(/[^\d]/g, "") } }))}
                    />
                  </div>
                ))}
                <p className="text-[12.5px] text-muted">Podés cambiar cabezas para explorar (por ejemplo, después de una venta). No modifica tu hacienda.</p>
              </div>
            ) : (
              <p className="text-[14px] text-muted">No hay existencias declaradas. Cargá la hacienda para que el brief la use.</p>
            )}
          </fieldset>
        </div>
        <details className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[14px] font-medium text-ink">
            Supuestos del cálculo
            <span className="flex items-center gap-2 text-[12.5px] font-normal text-muted">
              Orientativos · ajustalos con tu asesor <IconChevronDown size={16} className="transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
            {SUPUESTOS.map((x) => (
              <NumInput
                key={x.clave}
                id={x.clave}
                label={x.label}
                value={f.supuestos[x.clave] ?? ""}
                onChange={(v) => setF((s) => ({ ...s, supuestos: { ...s.supuestos, [x.clave]: v } }))}
                sufijo={x.sufijo}
                error={fe[`supuestos.${x.clave}`]}
              />
            ))}
          </div>
        </details>
        {cambiado && (
          <div className="flex justify-end border-t border-border px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setF(base)}>
              Volver a lo declarado
            </Button>
          </div>
        )}
      </Card>

      {err?.error && <Notice tone="danger" title={err.error} />}
      {res ? (
        <ResultadoBrief r={res} />
      ) : (
        !err?.error && (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-[64px] rounded-[10px] border border-border bg-surface" />
            <div className="h-[220px] rounded-[var(--radius-card)] border border-border bg-surface" />
          </div>
        )
      )}

      {puedeGuardar && res && (
        <Card>
          <form action={guardar.formAction} className="flex flex-wrap items-end gap-3 px-5 py-4">
            <input type="hidden" name="entradas" value={JSON.stringify(datos)} />
            <div className="min-w-[220px] flex-1">
              <Field label="Nombre del brief" htmlFor="nombre" optional hint="Queda guardado tal cual (no se edita) para compartirlo con tu asesor y comparar más adelante.">
                <Input id="nombre" name="nombre" maxLength={120} placeholder="Ej.: Primavera 2026, con La Niña" />
              </Field>
            </div>
            <Button type="submit" icon={guardar.pending ? <Spinner /> : <IconLeaf size={16} />} disabled={guardar.pending || calculando}>
              Guardar brief
            </Button>
            <div className="basis-full">
              <FormAlerts state={guardar.state} pending={guardar.pending} />
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
