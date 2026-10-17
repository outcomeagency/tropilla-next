"use client";

import { useActionState } from "react";
import { guardarCompradorAction, type CompradorState } from "@/lib/comprador-actions";
import { ChoiceChip } from "@/components/choice";
import { Button, Field, Input, Notice, Select, Spinner, fieldAria } from "@/components/ui";

const TIPOS = { frigorifico: "Frigorífico", exportador: "Exportador / importador", gastronomico: "Gastronomía / carnicería", institucion: "Institución", productor: "Productor", otro: "Otro" };
const PAISES = ["AR", "BR", "PY", "UY", "BO", "CL", "CN", "US", "IL", "DE", "NL", "IT", "ES"];

export function PerfilCompradorForm({ next, inicial }: { next: string; inicial?: { empresa?: string; tipo?: string; pais?: string; volumen?: string | null } }) {
  const [state, action, pending] = useActionState(guardarCompradorAction, {} as CompradorState);
  const f = state.fields ?? {};
  const region = new Intl.DisplayNames(["es"], { type: "region" });
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <Notice tone="danger" title={state.error} />}
      <Field label="Empresa" htmlFor="empresa" error={f.empresa} hint="O tu nombre, si comprás como persona.">
        <Input id="empresa" name="empresa" defaultValue={inicial?.empresa} placeholder="Frigorífico Las Marías" {...fieldAria("empresa", f.empresa, true)} />
      </Field>
      <Field label="CUIT" htmlFor="cuit" error={f.cuit} hint="Privado. Lo ciframos y consultamos la Central de Deudores del BCRA.">
        <Input id="cuit" name="cuit" inputMode="numeric" autoComplete="off" placeholder="30-71234567-8" {...fieldAria("cuit", f.cuit, true)} />
      </Field>
      <Field label="Razón social informada por el BCRA" htmlFor="razon_social" error={f.razon_social} hint="Escribila como figura en la constancia o documentación comercial.">
        <Input id="razon_social" name="razon_social" placeholder="Frigorífico Las Marías S.A." {...fieldAria("razon_social", f.razon_social, true)} />
      </Field>
      <label className="flex items-start gap-2 text-[13px] leading-5 text-muted">
        <input name="consentimiento_cuit" type="checkbox" value="true" required className="mt-1" />
        <span>Autorizo a TROPILLA a consultar el CUIT en fuentes públicas disponibles y guardar la fuente, la fecha y el estado de la consulta.</span>
      </label>
      {f.consentimiento_cuit && <p className="text-[12.5px] font-medium text-danger">{f.consentimiento_cuit}</p>}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">Tipo de comprador</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TIPOS).map(([k, l]) => (
            <ChoiceChip key={k} type="radio" name="tipo" value={k} label={l} defaultChecked={inicial?.tipo === k} />
          ))}
        </div>
        {f.tipo && <p className="mt-2 text-[12.5px] font-medium text-danger">{f.tipo}</p>}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="País" htmlFor="pais" error={f.pais}>
          <Select id="pais" name="pais" defaultValue={inicial?.pais ?? "AR"} {...fieldAria("pais", f.pais)}>
            {PAISES.map((c) => (
              <option key={c} value={c}>
                {region.of(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Volumen habitual" htmlFor="volumen" optional>
          <Input id="volumen" name="volumen" defaultValue={inicial?.volumen ?? ""} placeholder="ej. 300 cabezas por mes" />
        </Field>
      </div>
      <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
        Guardar y seguir
      </Button>
    </form>
  );
}
