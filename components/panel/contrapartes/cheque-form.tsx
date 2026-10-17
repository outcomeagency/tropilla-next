"use client";

import { useActionState } from "react";
import { Button, CardBody, Field, Input, Select, Spinner } from "@/components/ui";
import { verificarChequeAction, type ChequeActionState } from "@/lib/contrapartes-actions";

export function ChequeForm({ bancos }: { bancos: { codigoEntidad: number; denominacion: string }[] }) {
  const [state, action, pending] = useActionState(verificarChequeAction, {} as ChequeActionState);
  return (
    <form action={action}>
      <CardBody className="space-y-4">
        <p className="text-[13px] text-muted">El BCRA informa cheques denunciados como extraviados, sustraídos o adulterados. Un resultado sin denuncia no confirma que el cheque sea válido.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Banco" htmlFor="banco_codigo">
            <Select id="banco_codigo" name="banco_codigo" required defaultValue="">
              <option value="" disabled>Elegí el banco</option>
              {bancos.map((b) => <option key={b.codigoEntidad} value={b.codigoEntidad}>{b.denominacion}</option>)}
            </Select>
          </Field>
          <Field label="Número de cheque" htmlFor="numero">
            <Input id="numero" name="numero" inputMode="numeric" required />
          </Field>
          <Field label="Cuenta" htmlFor="cuenta" optional hint="Si querés confirmar que la cuenta coincide exactamente.">
            <Input id="cuenta" name="cuenta" inputMode="numeric" />
          </Field>
        </div>
        {state.error && <p role="alert" className="text-[13px] text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending || bancos.length === 0} icon={pending ? <Spinner /> : undefined}>{pending ? "Consultando BCRA…" : "Verificar cheque"}</Button>
        {state.data && <div role="status" className="rounded-[8px] border border-border bg-surface-2 p-4 text-[14px]">
          <p className="font-semibold text-ink">{state.data.datos.denunciado ? "El BCRA informa una denuncia coincidente" : "El BCRA no informa una denuncia coincidente"}</p>
          <p className="mt-1 text-muted">{state.data.datos.denominacionEntidad} · cheque {state.data.datos.numeroCheque} · consultado {new Date(state.data.consultado_en).toLocaleString("es-AR")}</p>
          {state.data.datos.detalles.map((d) => <p key={`${d.sucursal}-${d.numeroCuenta}`} className="mt-1 text-muted">Sucursal {d.sucursal} · cuenta terminada en {String(d.numeroCuenta).slice(-4)} · {d.causal}</p>)}
          <a className="mt-2 inline-block font-medium text-campo underline" href={state.data.url} target="_blank" rel="noreferrer">Fuente BCRA</a>
        </div>}
      </CardBody>
    </form>
  );
}
