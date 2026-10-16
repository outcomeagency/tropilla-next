"use client";

import { useState } from "react";
import { interdiccionAction, levantarInterdiccionAction } from "@/lib/establecimiento-datos-actions";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useDialogForm } from "@/components/panel/form-state";
import { ChoiceCard } from "@/components/choice";
import { Button, Field, Input, Spinner, Textarea, fieldAria } from "@/components/ui";

/** Registrar una interdicción sanitaria (evento del establecimiento). */
export function RegistrarInterdiccion({ hoy }: { hoy: string }) {
  const [motivo, setMotivo] = useState("rabia");
  const { state, formAction, pending, f, idem, open, abrir, cerrar } = useDialogForm(interdiccionAction);

  return (
    <>
      <Button variant="outline" size="sm" onClick={abrir}>
        Registrar interdicción
      </Button>
      <Dialog open={open} onClose={cerrar} title="Registrar interdicción" description="Queda en la historia del establecimiento con fecha y autor.">
        <form action={formAction} noValidate>
          <input type="hidden" name="idem" value={idem} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink">Motivo</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceCard name="motivo" value="rabia" title="Rabia paresiante" description="Foco en la zona o caso confirmado." checked={motivo === "rabia"} onChange={() => setMotivo("rabia")} />
                <ChoiceCard name="motivo" value="otra" title="Otro motivo" description="Indicalo abajo." checked={motivo === "otra"} onChange={() => setMotivo("otra")} />
              </div>
            </fieldset>
            {motivo === "otra" && (
              <Field label="¿Cuál?" htmlFor="motivo_otro" error={f.motivo_otro}>
                <Input id="motivo_otro" name="motivo_otro" maxLength={120} {...fieldAria("motivo_otro", f.motivo_otro)} />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rige desde" htmlFor="inicio" error={f.inicio}>
                <Input id="inicio" name="inicio" type="date" defaultValue={hoy} max={hoy} {...fieldAria("inicio", f.inicio)} />
              </Field>
              <Field label="Levantamiento estimado" htmlFor="levantamiento_estimado" optional error={f.levantamiento_estimado}>
                <Input id="levantamiento_estimado" name="levantamiento_estimado" type="date" {...fieldAria("levantamiento_estimado", f.levantamiento_estimado)} />
              </Field>
            </div>
            <Field label="Observaciones" htmlFor="observaciones" optional>
              <Textarea id="observaciones" name="observaciones" rows={3} className="min-h-[80px]" placeholder="Acta, intervención del veterinario, alcance." />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

/** Levantar la interdicción vigente. */
export function LevantarInterdiccion({ eventoId, hoy }: { eventoId: string; hoy: string }) {
  const { state, formAction, pending, f, idem, open, abrir, cerrar } = useDialogForm(levantarInterdiccionAction);
  return (
    <>
      <Button variant="outline" size="sm" onClick={abrir}>
        Levantar
      </Button>
      <Dialog open={open} onClose={cerrar} title="Levantar interdicción" size="sm">
        <form action={formAction} noValidate>
          <input type="hidden" name="idem" value={idem} />
          <input type="hidden" name="interdiccion_evento_id" value={eventoId} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Field label="Fecha del levantamiento" htmlFor="fecha_lev" error={f.fecha}>
              <Input id="fecha_lev" name="fecha" type="date" defaultValue={hoy} max={hoy} {...fieldAria("fecha_lev", f.fecha)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Levantar interdicción
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
