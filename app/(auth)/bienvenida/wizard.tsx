"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent, type ReactNode } from "react";
import { onboardingAction, type OnboardingState } from "@/lib/onboarding-actions";
import { ACTIVIDADES, PROVINCIAS } from "@/lib/geo";
import { ChoiceCard, ChoiceChip, SwitchRow } from "@/components/choice";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBuffalo,
  IconBuilding,
  IconCheck,
  IconCheckCircle,
  IconCow,
  IconLock,
  IconUser,
} from "@/components/icons";
import { Button, Field, Input, Notice, Select, Spinner, cx, fieldAria } from "@/components/ui";

const STEPS = [
  { title: "Vos o tu empresa", hint: "Quién es el productor" },
  { title: "El establecimiento", hint: "Nombre y ubicación" },
  { title: "Producción y sanidad", hint: "Especies, actividades y zonas" },
] as const;

/** Campos obligatorios por paso: validación local antes de avanzar. */
const REQUIRED: Record<number, Array<{ name: string; msg: string; multi?: boolean }>> = {
  0: [
    { name: "tipo", msg: "Elegí si sos persona o sociedad." },
    { name: "productor_nombre", msg: "Escribí el nombre o la razón social." },
  ],
  1: [
    { name: "nombre", msg: "Escribí el nombre del establecimiento." },
    { name: "provincia", msg: "Elegí la provincia." },
    { name: "departamento", msg: "Elegí el departamento." },
  ],
  2: [
    { name: "especies", msg: "Marcá al menos una especie.", multi: true },
    { name: "actividades", msg: "Marcá al menos una actividad.", multi: true },
  ],
};

function PrivateHint({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <IconLock size={13} className="shrink-0" />
      {children}
    </span>
  );
}

export function OnboardingWizard({ nombreUsuario }: { nombreUsuario: string }) {
  const [state, action, pending] = useActionState(onboardingAction, {} as OnboardingState);
  const [step, setStep] = useState(0);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [provincia, setProvincia] = useState("18");
  const [lastState, setLastState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  // Si el servidor devuelve errores, volver al primer paso con problemas (ajuste durante el render).
  if (state !== lastState) {
    setLastState(state);
    if (state.step != null) setStep(state.step);
    setLocal({});
  }

  const errors = { ...(state.fields ?? {}), ...local };
  const deps = PROVINCIAS.find((p) => p.codigo === provincia)?.departamentos ?? [];

  function validate(s: number): boolean {
    const form = formRef.current;
    if (!form) return true;
    const fd = new FormData(form);
    const next: Record<string, string> = {};
    for (const r of REQUIRED[s] ?? []) {
      const ok = r.multi ? fd.getAll(r.name).length > 0 : String(fd.get(r.name) ?? "").trim().length > 0;
      if (!ok) next[r.name] = r.msg;
    }
    setLocal(next);
    return Object.keys(next).length === 0;
  }

  // Envío manual: una action en <form action> resetea los campos no controlados al terminar,
  // y si la API devuelve errores el productor perdería lo que cargó.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate(step)) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  function goNext() {
    if (validate(step)) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const primerNombre = nombreUsuario.split(" ")[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
      {/* Pasos */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-[13px] font-medium text-muted">
          Paso <span className="tabular-nums">{step + 1}</span> de {STEPS.length}
        </p>
        <ol className="mt-4 flex gap-2 lg:flex-col lg:gap-0">
          {STEPS.map((s, i) => {
            const status = i < step ? "done" : i === step ? "current" : "todo";
            return (
              <li key={s.title} className="flex-1 lg:flex-none">
                <div className={cx("flex items-start gap-3 lg:py-3", i > 0 && "lg:border-t lg:border-border")}>
                  <span
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[12.5px] font-semibold tabular-nums",
                      status === "done" && "border-campo bg-campo text-blanco",
                      status === "current" && "border-monte bg-surface text-monte ring-2 ring-campo-50",
                      status === "todo" && "border-border-strong bg-surface text-muted",
                    )}
                    aria-hidden="true"
                  >
                    {status === "done" ? <IconCheck size={14} strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className="hidden min-w-0 lg:block">
                    <span className={cx("block text-[14px] font-semibold", status === "todo" ? "text-muted" : "text-ink")}>{s.title}</span>
                    <span className="block text-[12.5px] text-muted">{s.hint}</span>
                  </span>
                  <span className="sr-only">
                    {s.title} {status === "done" ? "(completo)" : status === "current" ? "(actual)" : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 hidden rounded-[12px] border border-border bg-surface p-4 text-[13px] leading-relaxed text-muted lg:block">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <IconLock size={15} /> Privado por defecto
          </p>
          <p className="mt-1">CUIT, RENSPA y la ubicación exacta nunca se publican. Del perfil público decidís vos, más adelante.</p>
        </div>
      </aside>

      <form ref={formRef} onSubmit={onSubmit} noValidate className="min-w-0">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {state.error && (
            <div className="border-b border-border p-5">
              <Notice tone="danger" title={state.error} />
            </div>
          )}

          {/* Paso 1 */}
          <section hidden={step !== 0} aria-labelledby="paso-0" className="space-y-6 p-5 sm:p-8">
            <header>
              <h2 id="paso-0" className="text-[22px] font-bold tracking-[-0.015em] text-ink">
                Hola, {primerNombre}. ¿Quién es el productor?
              </h2>
              <p className="mt-1 text-[14.5px] text-muted">El titular de la hacienda. Si tenés una sociedad, cargá sus datos.</p>
            </header>
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink">Tipo de productor</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard name="tipo" value="persona_humana" defaultChecked icon={<IconUser size={20} />} title="Persona" description="Productor individual o familiar" />
                <ChoiceCard name="tipo" value="sociedad" icon={<IconBuilding size={20} />} title="Sociedad" description="S.A., S.R.L., S.A.S. u otra" />
              </div>
              {errors.tipo && <p className="mt-2 text-[12.5px] font-medium text-danger">{errors.tipo}</p>}
            </fieldset>
            <Field label="Nombre o razón social" htmlFor="productor_nombre" error={errors.productor_nombre}>
              <Input id="productor_nombre" name="productor_nombre" defaultValue={nombreUsuario} placeholder="Agropecuaria Don Ramón S.A." {...fieldAria("productor_nombre", errors.productor_nombre)} />
            </Field>
            <Field label="CUIT" htmlFor="cuit" optional error={errors.cuit} hint={<PrivateHint>Privado siempre: sólo lo ven el dueño y los administradores.</PrivateHint>}>
              <Input id="cuit" name="cuit" inputMode="numeric" placeholder="30-71234567-8" className="max-w-[260px] tabular-nums" {...fieldAria("cuit", errors.cuit, true)} />
            </Field>
          </section>

          {/* Paso 2 */}
          <section hidden={step !== 1} aria-labelledby="paso-1" className="space-y-6 p-5 sm:p-8">
            <header>
              <h2 id="paso-1" className="text-[22px] font-bold tracking-[-0.015em] text-ink">Tu primer establecimiento</h2>
              <p className="mt-1 text-[14.5px] text-muted">El campo donde está la hacienda. Si tenés varios, después sumás los demás.</p>
            </header>
            <Field label="Nombre del establecimiento" htmlFor="nombre" error={errors.nombre}>
              <Input id="nombre" name="nombre" placeholder="La Esperanza" {...fieldAria("nombre", errors.nombre)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Provincia" htmlFor="provincia" error={errors.provincia}>
                <Select id="provincia" name="provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} {...fieldAria("provincia", errors.provincia)}>
                  {PROVINCIAS.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Departamento" htmlFor="departamento" error={errors.departamento} hint="Define las zonas sanitarias sugeridas.">
                <Select key={provincia} id="departamento" name="departamento" defaultValue="" {...fieldAria("departamento", errors.departamento, true)}>
                  <option value="" disabled>
                    Elegí el departamento
                  </option>
                  {deps.map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Localidad o paraje" htmlFor="localidad" optional>
                <Input id="localidad" name="localidad" placeholder="Caá Catí" />
              </Field>
              <Field label="Superficie total" htmlFor="superficie" optional error={errors.superficie}>
                <div className="relative">
                  <Input id="superficie" name="superficie" inputMode="decimal" placeholder="2400" className="pr-12 tabular-nums" {...fieldAria("superficie", errors.superficie)} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">ha</span>
                </div>
              </Field>
            </div>
            <Field label="RENSPA" htmlFor="renspa" optional hint={<PrivateHint>Dato declarado y privado. Nunca se publica.</PrivateHint>}>
              <Input id="renspa" name="renspa" placeholder="05.012.0.00123/00" className="max-w-[320px] tabular-nums" {...fieldAria("renspa", undefined, true)} />
            </Field>
          </section>

          {/* Paso 3 */}
          <section hidden={step !== 2} aria-labelledby="paso-2" className="space-y-7 p-5 sm:p-8">
            <header>
              <h2 id="paso-2" className="text-[22px] font-bold tracking-[-0.015em] text-ink">Qué producís y en qué zona</h2>
              <p className="mt-1 text-[14.5px] text-muted">Con esto armamos las categorías de cada especie y te sugerimos el plan sanitario.</p>
            </header>
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink">Especies en el campo</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard type="checkbox" name="especies" value="BOV" defaultChecked icon={<IconCow size={22} />} title="Bovinos" description="Vacas, vaquillonas, terneros, novillos, toros" />
                <ChoiceCard type="checkbox" name="especies" value="BUB" icon={<IconBuffalo size={22} />} title="Bubalinos" description="Búfalas, bubillas, bucerros, bubillos, toros" />
              </div>
              {errors.especies && <p className="mt-2 text-[12.5px] font-medium text-danger">{errors.especies}</p>}
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink">Actividades</legend>
              <div className="flex flex-wrap gap-2">
                {ACTIVIDADES.map((a) => (
                  <ChoiceChip key={a.codigo} name="actividades" value={a.codigo} label={a.nombre} defaultChecked={a.codigo === "cria"} />
                ))}
              </div>
              {errors.actividades && <p className="mt-2 text-[12.5px] font-medium text-danger">{errors.actividades}</p>}
            </fieldset>
            <fieldset className="rounded-[12px] border border-border">
              <legend className="ml-4 px-1 text-[13px] font-semibold text-ink">Zonas sanitarias declaradas</legend>
              <div className="grid gap-5 px-4 pb-2 pt-2 sm:grid-cols-2">
                <Field label="Aftosa" htmlFor="aftosa">
                  <Select id="aftosa" name="aftosa" defaultValue="libre_con_vacunacion">
                    <option value="libre_con_vacunacion">Libre con vacunación</option>
                    <option value="libre_sin_vacunacion">Libre sin vacunación</option>
                  </Select>
                </Field>
                <Field label="Garrapata" htmlFor="garrapata">
                  <Select id="garrapata" name="garrapata" defaultValue="control">
                    <option value="erradicacion">Zona de erradicación</option>
                    <option value="control">Zona de control</option>
                    <option value="libre">Zona libre</option>
                  </Select>
                </Field>
              </div>
              <div className="divide-y divide-border px-4">
                <SwitchRow name="rabia" label="Rabia paresiante endémica" description="Suma la vacunación antirrábica al plan sugerido." defaultChecked />
                <SwitchRow name="fasciola" label="Fasciola hepática endémica" description="Habitual en bajos y esteros." />
              </div>
            </fieldset>
            <p className="text-[12.5px] text-muted">Son datos declarados por vos. Podés cambiarlos después en Mi establecimiento.</p>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-base px-5 py-4 sm:px-8">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} icon={<IconArrowLeft size={18} />}>
                Volver
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext}>
                Continuar <IconArrowRight size={18} />
              </Button>
            ) : (
              <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconCheckCircle size={18} />}>
                {pending ? "Creando…" : "Crear establecimiento"}
              </Button>
            )}
          </footer>
        </div>
      </form>
    </div>
  );
}
