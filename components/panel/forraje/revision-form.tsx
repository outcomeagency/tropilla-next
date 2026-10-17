"use client";

import { revisarBriefAction } from "@/lib/forraje-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { Button, Field, Notice, Spinner, Textarea } from "@/components/ui";
import { ChoiceCard } from "@/components/choice";

/** Revisión humana del brief (piloto con asesor). Queda registrada con fecha, persona y rol; no se edita. */
export function RevisionForm({ brief }: { brief: string }) {
  const { state, formAction, pending, f } = useActionForm(revisarBriefAction);
  return (
    <form action={formAction} className="space-y-4 px-5 py-4">
      <input type="hidden" name="brief" value={brief} />
      {state.ok && <Notice tone="success" title={state.ok.mensaje} />}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">Resultado</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChoiceCard name="resultado" value="revisado" defaultChecked title="Revisado" description="Los supuestos y la lectura son razonables para este campo." />
          <ChoiceCard name="resultado" value="con_observaciones" title="Con observaciones" description="Hay supuestos o datos para ajustar antes de usarlo." />
        </div>
      </fieldset>
      <Field label="Nota de la revisión" htmlFor="nota" error={f.nota} hint="Qué miraste, qué ajustarías y qué conviene conversar. Queda visible para el equipo del establecimiento.">
        <Textarea id="nota" name="nota" rows={4} maxLength={2000} required minLength={10} />
      </Field>
      <FormAlerts state={state} pending={pending} />
      <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
        Registrar revisión
      </Button>
    </form>
  );
}
