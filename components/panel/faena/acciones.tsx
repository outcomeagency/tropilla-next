"use client";

import { useState } from "react";
import { adjuntarFaenaAction, anularResultadoFaenaAction, guardarLiquidacionFaenaAction, vincularVentaFaenaAction } from "@/lib/faena-actions";
import { FormAlerts, useActionForm, useDialogForm } from "@/components/panel/form-state";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { Button, Field, Input, Notice, Select, Spinner, Textarea, cx } from "@/components/ui";
import { IconPlus, IconTrash, IconUpload } from "@/components/icons";
import type { VentaOpcion } from "./romaneo-form";

type Base = { id: string; rowVersion: number };

/** Vincular o cambiar la venta con la que se concilia el romaneo. */
export function VincularVenta({ id, rowVersion, ventas, actual }: Base & { ventas: VentaOpcion[]; actual?: string | null }) {
  const { state, formAction, pending } = useActionForm(vincularVentaFaenaAction);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="row_version" value={rowVersion} />
      <div className="min-w-[260px] flex-1">
        <Field label={actual ? "Cambiar la venta" : "Venta de esta tropa"} htmlFor="operacion_id">
          <Select id="operacion_id" name="operacion_id" defaultValue={actual ?? ""}>
            <option value="">Sin vincular</option>
            {ventas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.etiqueta}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" variant={actual ? "outline" : "primary"} disabled={pending} icon={pending ? <Spinner /> : undefined}>
        {actual ? "Guardar" : "Vincular y conciliar"}
      </Button>
      <div className="basis-full empty:hidden">
        {state.ok && <Notice tone="success" title={state.ok.mensaje} />}
        <FormAlerts state={state} pending={pending} />
      </div>
    </form>
  );
}

export type LiquidacionValores = {
  numero?: string | null;
  fecha?: string | null;
  emisor?: string | null;
  kg?: string | null;
  precio_kg?: string | null;
  bruto?: string | null;
  neto?: string | null;
  moneda?: string | null;
  deducciones?: Array<{ concepto: string; importe: string }>;
};

const coma = (v?: string | null) => (v ? v.replace(".", ",") : "");

/** Liquidación tal como la emitió el frigorífico o consignataria (llega después del romaneo). */
export function LiquidacionDialog({ id, rowVersion, valores, emisorSugerido }: Base & { valores?: LiquidacionValores | null; emisorSugerido?: string }) {
  const d = useDialogForm(guardarLiquidacionFaenaAction);
  const [deds, setDeds] = useState<Array<{ concepto: string; importe: string }>>(
    valores?.deducciones?.length ? valores.deducciones.map((x) => ({ concepto: x.concepto, importe: coma(x.importe) })) : [{ concepto: "", importe: "" }],
  );
  const f = d.f;
  return (
    <>
      <Button type="button" variant={valores ? "outline" : "primary"} size="sm" onClick={d.abrir}>
        {valores ? "Corregir liquidación" : "Cargar liquidación"}
      </Button>
      {d.ok && (
        <div className="basis-full">
          <Notice tone="success" title={d.ok.mensaje} />
        </div>
      )}
      <Dialog open={d.open} onClose={d.cerrar} size="lg" title="Liquidación del frigorífico" description="Copiá los importes como figuran en la liquidación, aunque no cierren: la diferencia la marca la conciliación.">
        <form action={d.formAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="row_version" value={rowVersion} />
          <DialogBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="N.º de liquidación" htmlFor="liq_numero" optional>
                <Input id="liq_numero" name="liq_numero" defaultValue={valores?.numero ?? ""} maxLength={60} />
              </Field>
              <Field label="Fecha" htmlFor="liq_fecha" optional error={f.liq_fecha}>
                <Input id="liq_fecha" name="liq_fecha" type="date" defaultValue={valores?.fecha ?? ""} />
              </Field>
              <Field label="Emitida por" htmlFor="liq_emisor" optional>
                <Input id="liq_emisor" name="liq_emisor" defaultValue={valores?.emisor ?? emisorSugerido ?? ""} maxLength={200} />
              </Field>
              <Field label="Kg liquidados" htmlFor="liq_kg" error={f.liq_kg}>
                <Input id="liq_kg" name="liq_kg" inputMode="decimal" defaultValue={coma(valores?.kg)} className="text-right tabular-nums" />
              </Field>
              <Field label="Precio por kg" htmlFor="liq_precio_kg" optional error={f.liq_precio_kg}>
                <Input id="liq_precio_kg" name="liq_precio_kg" inputMode="decimal" defaultValue={coma(valores?.precio_kg)} className="text-right tabular-nums" />
              </Field>
              <Field label="Moneda" htmlFor="liq_moneda">
                <Select id="liq_moneda" name="liq_moneda" defaultValue={valores?.moneda ?? "ARS"}>
                  <option value="ARS">Pesos (ARS)</option>
                  <option value="USD">Dólares (USD)</option>
                </Select>
              </Field>
              <Field label="Bruto" htmlFor="liq_bruto" optional error={f.liq_bruto}>
                <Input id="liq_bruto" name="liq_bruto" inputMode="decimal" defaultValue={coma(valores?.bruto)} className="text-right tabular-nums" />
              </Field>
              <Field label="Neto a cobrar" htmlFor="liq_neto" optional error={f.liq_neto}>
                <Input id="liq_neto" name="liq_neto" inputMode="decimal" defaultValue={coma(valores?.neto)} className="text-right tabular-nums" />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink">Deducciones</legend>
              <div className="space-y-2">
                {deds.map((x, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Input
                      aria-label={`Concepto ${i + 1}`}
                      name="ded_concepto"
                      placeholder="Comisión, flete, sellado, IVA…"
                      value={x.concepto}
                      onChange={(e) => setDeds((ds) => ds.map((y, j) => (j === i ? { ...y, concepto: e.target.value } : y)))}
                      maxLength={120}
                    />
                    <Input
                      aria-label={`Importe ${i + 1}`}
                      name="ded_importe"
                      inputMode="decimal"
                      value={x.importe}
                      onChange={(e) => setDeds((ds) => ds.map((y, j) => (j === i ? { ...y, importe: e.target.value } : y)))}
                      className={cx("w-40 shrink-0 text-right tabular-nums", f[`ded_${i}`] && "border-danger")}
                    />
                    <button
                      type="button"
                      aria-label={`Quitar deducción ${i + 1}`}
                      onClick={() => setDeds((ds) => (ds.length > 1 ? ds.filter((_, j) => j !== i) : [{ concepto: "", importe: "" }]))}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-subtle hover:bg-surface-2 hover:text-danger"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="mt-2" icon={<IconPlus size={16} />} onClick={() => setDeds((ds) => [...ds, { concepto: "", importe: "" }])}>
                Agregar deducción
              </Button>
            </fieldset>
            <FormAlerts state={d.state} pending={d.pending} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={d.cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={d.pending} icon={d.pending ? <Spinner /> : undefined}>
              Guardar liquidación
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

/** Adjuntar el PDF/foto de la liquidación o la factura (queda en Documentos y vinculado al resultado). */
export function Adjuntar({ id, rowVersion, cual, reemplaza }: Base & { cual: "liquidacion" | "factura"; reemplaza: boolean }) {
  const d = useDialogForm(adjuntarFaenaAction);
  const nombre = cual === "factura" ? "factura" : "liquidación";
  return (
    <>
      <Button type="button" variant="outline" size="sm" icon={<IconUpload size={16} />} onClick={d.abrir}>
        {reemplaza ? `Reemplazar ${nombre}` : `Adjuntar ${nombre}`}
      </Button>
      <Dialog
        open={d.open}
        onClose={d.cerrar}
        size="sm"
        title={cual === "factura" ? "Adjuntar factura" : "Adjuntar liquidación"}
        description={cual === "factura" ? "Queda en Documentos como fiscal: sólo la ven el dueño y la administración." : "Queda en Documentos como comercial privado."}
      >
        <form action={d.formAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="row_version" value={rowVersion} />
          <input type="hidden" name="cual" value={cual} />
          <DialogBody>
            <Field label="Archivo" htmlFor={`archivo-${cual}`} error={d.f.archivo} hint="PDF o foto, hasta 10 MB.">
              <Input id={`archivo-${cual}`} name="archivo" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic" className="py-2" required />
            </Field>
            <Field label="Título" htmlFor={`titulo-${cual}`} optional>
              <Input id={`titulo-${cual}`} name="titulo" maxLength={200} placeholder={cual === "factura" ? "Factura A 0001-00004471" : "Liquidación L-5521"} />
            </Field>
            <FormAlerts state={d.state} pending={d.pending} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={d.cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={d.pending} icon={d.pending ? <Spinner /> : undefined}>
              Adjuntar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

/** Anular con motivo: el resultado queda en el historial; las reses se corrigen volviendo a cargar. */
export function AnularResultado({ id }: { id: string }) {
  const d = useDialogForm(anularResultadoFaenaAction);
  return (
    <>
      <Button type="button" variant="danger" onClick={d.abrir}>
        Anular
      </Button>
      <Dialog open={d.open} onClose={d.cerrar} size="sm" title="Anular el resultado de faena" description="Queda en el historial con tu motivo. Si había un error en las reses, anulalo y volvé a cargarlo.">
        <form action={d.formAction}>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <Field label="Motivo" htmlFor="motivo" error={d.f.motivo}>
              <Textarea id="motivo" name="motivo" rows={3} maxLength={500} required minLength={3} placeholder="Era de otra tropa / el frigorífico mandó una versión corregida" />
            </Field>
            <FormAlerts state={d.state} pending={d.pending} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={d.cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={d.pending} icon={d.pending ? <Spinner /> : undefined}>
              Anular resultado
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
