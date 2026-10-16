"use client";

import { useActionState } from "react";
import { publicarOfertaAction, type OfertaFormState } from "@/lib/oferta-actions";
import { IconGlobe } from "@/components/icons";
import { Button, Notice, Spinner } from "@/components/ui";

export function PublishForm({ id, hayAvisos, puede }: { id: string; hayAvisos: boolean; puede: boolean }) {
  const [state, action, pending] = useActionState(publicarOfertaAction, {} as OfertaFormState);
  if (!puede) {
    return <Notice tone="info" title="Tu rol no permite publicar">Podés dejar la oferta lista: la publica el dueño o un administrador.</Notice>;
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="hay_avisos" value={hayAvisos ? "1" : "0"} />
      {state.error && <Notice tone="danger" title={state.error} />}
      {hayAvisos && (
        <label className="flex items-start gap-3 rounded-[10px] border border-warning-border bg-warning-bg px-4 py-3 text-[14px] text-ink">
          <input type="checkbox" name="confirmar_avisos" className="mt-0.5 h-[18px] w-[18px] accent-monte" />
          <span>
            <span className="font-semibold">Publicar igual.</span> Leí los avisos y quiero publicar así; quedan registrados junto con la publicación.
          </span>
        </label>
      )}
      <Button type="submit" className="w-full" disabled={pending} icon={pending ? <Spinner /> : <IconGlobe size={18} />}>
        {pending ? "Publicando…" : "Publicar oferta"}
      </Button>
      <p className="text-[12.5px] text-muted">Al publicar se genera el enlace, el QR y la ficha PDF, y queda registrada la huella de esta versión.</p>
    </form>
  );
}
