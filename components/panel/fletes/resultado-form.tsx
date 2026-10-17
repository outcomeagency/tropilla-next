"use client";

import { useState } from "react";
import type { EventoActionState } from "@/lib/eventos-api";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { ChoiceCard } from "@/components/choice";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { IconCheckCircle } from "@/components/icons";

type Action = (prev: EventoActionState, fd: FormData) => Promise<EventoActionState>;

/** Cierre del pedido: acordado (con costo y km para medir el piloto) o sin acuerdo. */
export function ResultadoForm({ action, pedido, puedeAcordar }: { action: Action; pedido: string; puedeAcordar: boolean }) {
  const { state, formAction, pending, f } = useActionForm(action);
  const [resultado, setResultado] = useState(puedeAcordar ? "acordado" : "sin_acuerdo");
  return (
    <form action={formAction} className="space-y-4 px-5 py-5">
      <input type="hidden" name="pedido" value={pedido} />
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Resultado">
        <ChoiceCard
          name="resultado"
          value="acordado"
          title="Acordamos el flete"
          description={puedeAcordar ? "Con el transportista que aceptaste." : "Primero aceptá una propuesta."}
          checked={resultado === "acordado"}
          disabled={!puedeAcordar}
          onChange={() => setResultado("acordado")}
        />
        <ChoiceCard name="resultado" value="sin_acuerdo" title="No hubo acuerdo" description="Contanos por qué: nos ayuda a mejorar el piloto." checked={resultado === "sin_acuerdo"} onChange={() => setResultado("sin_acuerdo")} />
      </fieldset>
      {resultado === "acordado" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Costo total del flete" htmlFor="costo" optional error={f.costo} hint="En pesos. Solo para medir el piloto: no se publica.">
            <Input id="costo" name="costo" inputMode="decimal" placeholder="900.000" className="tabular-nums" />
          </Field>
          <Field label="Kilómetros del viaje" htmlFor="km" optional error={f.km}>
            <Input id="km" name="km" inputMode="numeric" placeholder="480" className="tabular-nums" />
          </Field>
        </div>
      )}
      <Field label={resultado === "acordado" ? "Nota" : "¿Qué pasó?"} htmlFor="nota" optional error={f.nota}>
        <Input id="nota" name="nota" maxLength={500} placeholder={resultado === "acordado" ? "Fecha de carga, condiciones…" : "Precio, fecha, no apareció camión…"} />
      </Field>
      <FormAlerts state={state} pending={pending} />
      <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconCheckCircle size={16} />}>
        Registrar resultado
      </Button>
    </form>
  );
}
