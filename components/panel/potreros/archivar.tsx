"use client";

import { archivarPotreroAction } from "@/lib/potrero-actions";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useDialogForm } from "@/components/panel/form-state";
import { Button, Field, Notice, Spinner, Textarea, fieldAria } from "@/components/ui";

/** Archivar un potrero con motivo (nada se borra). */
export function ArchivarPotrero({ id, nombre, cabezas }: { id: string; nombre: string; cabezas: number }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(archivarPotreroAction);
  return (
    <>
      <Button variant="danger" size="sm" onClick={abrir}>
        Archivar potrero
      </Button>
      <Dialog open={open} onClose={cerrar} title={`Archivar ${nombre}`} description="Deja de ofrecerse para movimientos; su historia y los eventos quedan." size="sm">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            {cabezas > 0 && (
              <Notice tone="warning" title={`Todavía hay ${cabezas} cabezas en este potrero`}>
                Trasladalas antes de archivarlo.
              </Notice>
            )}
            <Field label="Motivo" htmlFor="motivo_arch" error={f.motivo}>
              <Textarea id="motivo_arch" name="motivo" rows={3} className="min-h-[80px]" placeholder="Se unió con Loma del Monte al sacar el alambrado." {...fieldAria("motivo_arch", f.motivo)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Archivar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
