"use client";

import Link from "next/link";
import { startTransition, type FormEvent } from "react";
import { anularEventoAction, corregirEventoAction } from "@/lib/correccion-actions";
import type { CampoEditable } from "@/lib/correccion";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useActionForm, useDialogForm } from "@/components/panel/form-state";
import { Button, Card, CardHeader, Field, Input, Notice, Select, Spinner, Textarea, buttonClass, fieldAria } from "@/components/ui";
import { IconAlert } from "@/components/icons";

export interface CorregirProps {
  eventoId: string;
  tipoNombre: string;
  campos: CampoEditable[];
  valores: Record<string, string>;
  /** Opciones para códigos y referencias (causa, categoría, potrero, lote…). */
  opciones: Record<string, Array<[string, string]>>;
  ocurridoEn: string;
  observaciones: string;
  noEditables: string[];
  hoy: string;
}

/**
 * Corregir un evento (TPA-26): mismos datos precargados, motivo obligatorio y
 * aviso claro de que la versión anterior queda guardada y visible.
 */
export function CorregirEvento(p: CorregirProps) {
  const { state, formAction, pending, f, idem } = useActionForm(corregirEventoAction);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (sub?.name) fd.set(sub.name, sub.value);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="evento_id" value={p.eventoId} />
      <input type="hidden" name="idem" value={idem} />
      <Card className="overflow-hidden">
        <CardHeader title="Datos corregidos" description="Cambiá sólo lo que estaba mal. Lo que dejes igual se conserva." />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Fecha" htmlFor="ocurrido_en" error={f.ocurrido_en}>
            <Input id="ocurrido_en" name="ocurrido_en" type="date" defaultValue={p.ocurridoEn} max={p.hoy} {...fieldAria("ocurrido_en", f.ocurrido_en)} />
          </Field>
          {p.campos.map((c) => {
            const name = `p:${c.path}`;
            const err = f[name];
            const ops = c.opciones ?? p.opciones[c.path.split(".").pop() ?? ""];
            const full = c.kind === "textarea";
            return (
              <div key={c.path} className={full ? "sm:col-span-2" : undefined}>
                {c.kind === "bool" ? (
                  <label className="flex h-full items-center gap-2.5 pt-6 text-[14px] font-medium text-ink">
                    <input type="checkbox" name={name} defaultChecked={p.valores[c.path] === "true"} className="h-4 w-4 accent-monte" />
                    {c.label}
                  </label>
                ) : (
                  <Field label={c.label} htmlFor={name} error={err} optional={!c.requerido}>
                    {ops ? (
                      <Select id={name} name={name} defaultValue={p.valores[c.path] ?? ""} {...fieldAria(name, err)}>
                        <option value="">{c.requerido ? "Elegí" : "Sin indicar"}</option>
                        {ops.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    ) : c.kind === "textarea" ? (
                      <Textarea id={name} name={name} rows={3} maxLength={2000} className="min-h-[84px]" defaultValue={p.valores[c.path] ?? ""} {...fieldAria(name, err)} />
                    ) : (
                      <Input
                        id={name}
                        name={name}
                        type={c.kind === "fecha" ? "date" : "text"}
                        inputMode={c.kind === "decimal" ? "decimal" : c.kind === "int" ? "numeric" : undefined}
                        defaultValue={c.kind === "decimal" ? (p.valores[c.path] ?? "").replace(".", ",") : (p.valores[c.path] ?? "")}
                        maxLength={120}
                        className={c.kind === "decimal" || c.kind === "int" ? "tabular-nums" : undefined}
                        {...fieldAria(name, err)}
                      />
                    )}
                  </Field>
                )}
              </div>
            );
          })}
          <div className="sm:col-span-2">
            <Field label="Observaciones" htmlFor="observaciones" optional>
              <Textarea id="observaciones" name="observaciones" rows={2} maxLength={2000} className="min-h-[72px]" defaultValue={p.observaciones} />
            </Field>
          </div>
          {p.noEditables.length > 0 && (
            <p className="sm:col-span-2 text-[13px] text-muted">
              No se corrigen desde acá: {p.noEditables.join(", ")}. Si eso está mal, anulá el evento y cargalo de nuevo.
            </p>
          )}
        </div>
      </Card>

      <aside className="space-y-3 xl:sticky xl:top-6">
        <Card className="overflow-hidden">
          <CardHeader title={`Corregir ${p.tipoNombre.toLowerCase()}`} />
          <div className="space-y-4 px-5 py-4">
            <Field label="Motivo de la corrección" htmlFor="motivo" error={f.motivo} hint="Obligatorio. Lo ve todo el equipo en «Ver cambios».">
              <Textarea id="motivo" name="motivo" rows={3} maxLength={500} className="min-h-[84px]" placeholder="Ej. se cargó 548 en vez de 458" {...fieldAria("motivo", f.motivo, true)} />
            </Field>
            <FormAlerts state={state} pending={pending} />
            <Button type="submit" className="w-full" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Guardar corrección
            </Button>
            <p className="text-[12.5px] leading-snug text-muted">Se crea la versión siguiente con tu nombre. La anterior no se borra: queda tachada en «Ver cambios» y la verificación pública lo muestra.</p>
          </div>
        </Card>
        <Link href={`/hacienda/eventos/${p.eventoId}`} className={buttonClass("ghost", "sm")}>
          Cancelar
        </Link>
      </aside>
    </form>
  );
}

/** Anular con motivo (diálogo). El evento queda tachado, no se borra. */
export function AnularEvento({ eventoId, tipo, tipoNombre }: { eventoId: string; tipo: string; tipoNombre: string }) {
  const { state, formAction, pending, f, open, abrir, cerrar, idem } = useDialogForm(anularEventoAction);
  return (
    <>
      <Button variant="danger" size="sm" onClick={abrir}>
        Anular
      </Button>
      <Dialog open={open} onClose={cerrar} title={`Anular ${tipoNombre.toLowerCase()}`} description="Se deja sin efecto y se recalculan stock, categorías y pesos. Queda tachado en la historia." size="sm">
        <form action={formAction} noValidate>
          <input type="hidden" name="evento_id" value={eventoId} />
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="idem" value={idem} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Notice tone="warning" title="Usalo para algo que no pasó o se cargó dos veces">
              Si el evento ocurrió pero tiene un dato mal, corregilo en lugar de anularlo.
            </Notice>
            <Field label="Motivo" htmlFor="motivo_anular" error={f.motivo}>
              <Textarea id="motivo_anular" name="motivo" rows={3} maxLength={500} className="min-h-[80px]" placeholder="Ej. cargado dos veces desde la manga" {...fieldAria("motivo_anular", f.motivo)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={pending} icon={pending ? <Spinner /> : <IconAlert size={16} />}>
              Anular evento
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
