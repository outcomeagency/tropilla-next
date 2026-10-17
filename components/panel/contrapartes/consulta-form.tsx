"use client";

import { useState } from "react";
import { consultarContraparteAction } from "@/lib/contrapartes-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { Button, Field, Input, Select, Spinner, cx } from "@/components/ui";
import { IconSearch } from "@/components/icons";

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function digitos(v: string) {
  return v.replace(/\D/g, "").slice(0, 11);
}

function formatear(v: string) {
  const d = digitos(v);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

function valido(v: string) {
  const d = digitos(v);
  if (d.length !== 11) return false;
  const suma = PESOS.reduce((s, p, i) => s + Number(d[i]) * p, 0);
  let dv = 11 - (suma % 11);
  dv = dv === 11 ? 0 : dv === 10 ? 9 : dv;
  return dv === Number(d[10]);
}

/** Formulario de consulta asistida (TPA-72): CUIT, finalidad y consentimiento explícito; para personas, autorización del titular. */
export function ConsultaForm({ finalidades, deshabilitado }: { finalidades: { codigo: string; nombre: string }[]; deshabilitado?: string }) {
  const { state, formAction, pending, f } = useActionForm(consultarContraparteAction);
  const [cuit, setCuit] = useState("");
  const [finalidad, setFinalidad] = useState("");
  const d = digitos(cuit);
  const humana = d.length >= 2 && !["30", "33", "34"].includes(d.slice(0, 2));
  const errorLocal = d.length === 11 && !valido(d) ? "El dígito verificador no coincide. Revisá el CUIT." : undefined;

  return (
    <form action={formAction} className="space-y-5 px-5 py-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Field label="CUIT de la contraparte" htmlFor="cuit" error={errorLocal ?? f.cuit} hint="Persona o empresa con la que vas a operar.">
          <Input id="cuit" name="cuit" inputMode="numeric" autoComplete="off" placeholder="30-12345678-9" value={formatear(cuit)} onChange={(e) => setCuit(e.target.value)} className="tabular-nums" required />
        </Field>
        <Field label="¿Para qué la consultás?" htmlFor="finalidad" error={f.finalidad} hint="Queda registrado junto con la consulta.">
          <Select id="finalidad" name="finalidad" value={finalidad} onChange={(e) => setFinalidad(e.target.value)} required>
            <option value="" disabled>
              Elegí la operación
            </option>
            {finalidades.map((x) => (
              <option key={x.codigo} value={x.codigo}>
                {x.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {finalidad === "otra" && (
        <Field label="Contanos la operación" htmlFor="finalidad_detalle" error={f.finalidad_detalle}>
          <Input id="finalidad_detalle" name="finalidad_detalle" maxLength={300} required />
        </Field>
      )}

      <div className="space-y-3 rounded-[10px] border border-border bg-surface-2 p-4 text-[14px]">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consentimiento" value="1" required className="mt-1 h-4 w-4 accent-monte" />
          <span className="text-ink">
            Consulto estos datos solo para evaluar esta operación. Entiendo que son datos informados por terceros a una fecha, que TROPILLA no califica a la contraparte y que la consulta queda
            registrada con mi nombre y la finalidad.
          </span>
        </label>
        <label className={cx("flex items-start gap-3", !humana && "opacity-60")}>
          <input type="checkbox" name="titular_autorizo" value="1" required={humana} disabled={!humana} className="mt-1 h-4 w-4 accent-monte" />
          <span className="text-ink">
            {humana ? "Es el CUIT de una persona: el titular me autorizó a consultar sus datos." : "Si el CUIT fuera de una persona, hace falta que el titular te autorice."}
            {f.titular_autorizo && <span className="mt-1 block text-[12.5px] font-medium text-danger">{f.titular_autorizo}</span>}
          </span>
        </label>
      </div>

      <FormAlerts state={state} pending={pending} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" icon={pending ? <Spinner /> : <IconSearch size={16} />} disabled={pending || !!errorLocal || !!deshabilitado}>
          {pending ? "Consultando fuentes…" : "Consultar"}
        </Button>
        <span className="text-[12.5px] text-muted">{deshabilitado ?? "Puede tardar unos segundos: se consulta a la fuente en el momento."}</span>
      </div>
    </form>
  );
}
