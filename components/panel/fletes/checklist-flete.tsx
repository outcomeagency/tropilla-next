"use client";

import { useState } from "react";
import { checklistFleteAction } from "@/lib/fletes-actions";
import { useActionForm } from "@/components/panel/form-state";
import { ChoiceChip } from "@/components/choice";
import { Button, Input, Spinner } from "@/components/ui";
import { IconCheckCircle } from "@/components/icons";

type Item = { item?: string; texto?: string; estado?: "pendiente" | "hecho" | "no_aplica"; nota?: string | null };

const OPCIONES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "hecho", label: "Hecho" },
  { value: "no_aplica", label: "No aplica" },
] as const;

/** Una diligencia del viaje (TPA-73). La marca el productor; TROPILLA no la verifica ni emite el DT-e. */
export function ChecklistFlete({ pedido, item, n, editable }: { pedido: string; item: Item; n: number; editable: boolean }) {
  const { state, formAction, pending } = useActionForm(checklistFleteAction);
  const [estado, setEstado] = useState<string>(item.estado ?? "pendiente");
  const [nota, setNota] = useState(item.nota ?? "");
  const cambiado = estado !== (item.estado ?? "pendiente") || nota !== (item.nota ?? "");
  return (
    <li className="px-5 py-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="pedido" value={pedido} />
        <input type="hidden" name="item" value={item.item} />
        <p className="flex gap-3 text-[14px] text-ink">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-campo-50 text-[12px] font-semibold text-monte tabular-nums">
            {item.estado === "hecho" ? <IconCheckCircle size={14} /> : n}
          </span>
          <span>{item.texto}</span>
        </p>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2 pl-9">
            <fieldset className="flex flex-wrap gap-2" aria-label="Estado">
              {OPCIONES.map((o) => (
                <ChoiceChip key={o.value} type="radio" name="estado" value={o.value} label={o.label} checked={estado === o.value} onChange={() => setEstado(o.value)} className="h-8 px-3 text-[13px]" />
              ))}
            </fieldset>
            <Input name="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)" maxLength={500} className="h-8 min-w-[200px] flex-1 text-[13px]" aria-label="Nota" />
            {cambiado && (
              <Button type="submit" size="sm" variant="outline" disabled={pending} icon={pending ? <Spinner /> : undefined}>
                Guardar
              </Button>
            )}
            {state.error && <span className="text-[12.5px] text-danger">{state.error}</span>}
          </div>
        ) : (
          item.nota && <p className="pl-9 text-[13px] text-muted">{item.nota}</p>
        )}
      </form>
    </li>
  );
}
