"use client";

import { useState } from "react";
import { aceptarPropuestaAction, rechazarPropuestaAction } from "@/lib/fletes-actions";
import { useActionForm } from "@/components/panel/form-state";
import { Button, Input, Select, Spinner } from "@/components/ui";
import { IconCheck, IconClose } from "@/components/icons";

/** Aceptar (comparte el contacto en ambos sentidos) o rechazar con motivo una propuesta del concierge. */
export function PropuestaRespuesta({ pedido, propuesta, transportista, motivos }: { pedido: string; propuesta: string; transportista: string; motivos: { codigo: string; nombre: string }[] }) {
  const aceptar = useActionForm(aceptarPropuestaAction);
  const rechazar = useActionForm(rechazarPropuestaAction);
  const [rechazando, setRechazando] = useState(false);
  const pending = aceptar.pending || rechazar.pending;
  const error = aceptar.state.error ?? rechazar.state.error;

  return (
    <div className="space-y-3">
      {!rechazando ? (
        <div className="flex flex-wrap items-center gap-2">
          <form
            action={aceptar.formAction}
            onSubmit={(e) => {
              if (!window.confirm(`Vas a compartir tu nombre, teléfono, zona de carga, fechas y cantidad de animales con ${transportista}, y vas a ver su contacto. ¿Seguimos?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="pedido" value={pedido} />
            <input type="hidden" name="propuesta" value={propuesta} />
            <Button type="submit" size="sm" disabled={pending} icon={aceptar.pending ? <Spinner /> : <IconCheck size={15} />}>
              Aceptar y ver contacto
            </Button>
          </form>
          <Button type="button" size="sm" variant="outline" disabled={pending} icon={<IconClose size={15} />} onClick={() => setRechazando(true)}>
            Rechazar
          </Button>
        </div>
      ) : (
        <form action={rechazar.formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="pedido" value={pedido} />
          <input type="hidden" name="propuesta" value={propuesta} />
          <div className="w-[200px]">
            <Select name="motivo" required defaultValue="" aria-label="Motivo" className="h-9 text-[13px]">
              <option value="" disabled>
                ¿Por qué?
              </option>
              {motivos.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </div>
          <Input name="detalle" maxLength={300} placeholder="Detalle (opcional)" aria-label="Detalle" className="h-9 min-w-[180px] flex-1 text-[13px]" />
          <Button type="submit" size="sm" variant="danger" disabled={pending} icon={rechazar.pending ? <Spinner /> : undefined}>
            Rechazar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRechazando(false)}>
            Volver
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
