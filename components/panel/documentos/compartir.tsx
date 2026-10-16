"use client";

import { useActionState, useState } from "react";
import { crearEnlaceAction, revocarEnlaceAction, type EnlaceState } from "@/lib/documento-actions";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts } from "@/components/panel/form-state";
import { ChoiceChip } from "@/components/choice";
import { CopyButton } from "@/components/copy-button";
import { Badge, Button, Field, Input, Notice, Spinner, buttonClass, fieldAria } from "@/components/ui";
import { IconCheckCircle, IconClock, IconEye, IconShare, IconWhatsapp } from "@/components/icons";

export type EnlaceVista = { id: string; expira: string; revocado: string | null; version: number | null; accesos: number; creado: string };

const fh = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

function estado(e: EnlaceVista, ahora: number) {
  if (e.revocado) return { label: "Revocado", tone: "neutral" as const };
  if (new Date(e.expira).getTime() < ahora) return { label: "Vencido", tone: "neutral" as const };
  return { label: "Activo", tone: "success" as const };
}

/**
 * Compartir un documento por un enlace que vence (TPA-38): sin publicarlo en el perfil.
 * El comprador ve los datos, el nivel de confianza y la verificación; el enlace se puede revocar.
 */
export function CompartirDocumento({ id, titulo, version, enlaces, fiscal, ahora }: { id: string; titulo: string; version: number; enlaces: EnlaceVista[]; fiscal: boolean; ahora: number }) {
  const [state, action, pending] = useActionState<EnlaceState, FormData>(crearEnlaceAction, {});
  const [open, setOpen] = useState(false);
  const [visto, setVisto] = useState<EnlaceState | null>(null);
  const [dur, setDur] = useState("7d");
  const vivo = state === visto ? ({} as EnlaceState) : state;
  const activos = enlaces.filter((e) => estado(e, ahora).label === "Activo");

  return (
    <>
      <div className="space-y-3">
        <p className="text-[13.5px] text-muted">
          {activos.length
            ? `${activos.length} ${activos.length === 1 ? "enlace activo" : "enlaces activos"}. Cada uno muestra el documento, su nivel de confianza y la verificación hasta que vence.`
            : "Mandale el documento a un comprador o al veterinario con un enlace que vence, sin publicarlo en tu perfil."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconShare size={16} />}
          onClick={() => {
            setVisto(state);
            setOpen(true);
          }}
        >
          Crear enlace
        </Button>
        {enlaces.length > 0 && (
          <ul className="divide-y divide-border rounded-[10px] border border-border">
            {enlaces.map((e) => {
              const st = estado(e, ahora);
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="min-w-0 text-[12.5px]">
                    <span className="flex items-center gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <span className="text-muted">
                        <IconEye size={13} className="mr-0.5 inline" /> {e.accesos} {e.accesos === 1 ? "visita" : "visitas"}
                      </span>
                    </span>
                    <span className="mt-1 block text-muted">
                      {e.revocado ? `Revocado el ${fh(e.revocado)}` : `Vence el ${fh(e.expira)}`}
                      {e.version ? ` · fijo a v${e.version}` : " · siempre la vigente"}
                    </span>
                  </span>
                  {st.label === "Activo" && (
                    <form action={revocarEnlaceAction}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="enlace" value={e.id} />
                      <button type="submit" className={buttonClass("ghost", "sm", "text-danger")}>
                        Revocar
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Compartir «${titulo}»`} description="Quien tenga el enlace ve los datos del documento y puede abrir el archivo hasta que venza.">
        {vivo.enlace ? (
          <DialogBody>
            <Notice tone="success" title="Enlace listo">
              Copialo ahora: por seguridad no se vuelve a mostrar. Vence el {fh(vivo.enlace.expira)}
            </Notice>
            {vivo.enlace.aviso && <Notice tone="warning" title={vivo.enlace.aviso} />}
            <input readOnly value={vivo.enlace.url} aria-label="Enlace" className="h-11 w-full rounded-[var(--radius-control)] border border-border bg-base px-3 font-mono text-[12.5px] text-ink" onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <CopyButton value={vivo.enlace.url} />
              <a href={`https://wa.me/?text=${encodeURIComponent(`${titulo}: ${vivo.enlace.url}`)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                <IconWhatsapp size={18} /> Mandar por WhatsApp
              </a>
            </div>
            <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <IconCheckCircle size={14} className="text-success" /> Podés revocarlo cuando quieras desde esta ficha.
            </p>
          </DialogBody>
        ) : (
          <form action={action} noValidate>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={version} />
            <input type="hidden" name="duracion" value={dur} />
            <DialogBody>
              <FormAlerts state={vivo} pending={pending} />
              {fiscal && (
                <Notice tone="warning" title="Es un documento fiscal">
                  No se publica nunca, pero con el enlace lo ve quien lo reciba. Compartilo sólo con quien corresponda.
                </Notice>
              )}
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-ink">¿Cuánto dura?</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["1d", "24 horas"],
                    ["7d", "7 días"],
                    ["30d", "30 días"],
                    ["fecha", "Hasta una fecha"],
                  ].map(([v, l]) => (
                    <ChoiceChip key={v} type="radio" name="_dur" label={l} checked={dur === v} onChange={() => setDur(v)} className="h-9 px-3.5 text-[13.5px]" />
                  ))}
                </div>
              </fieldset>
              {dur === "fecha" && (
                <Field label="Vale hasta" htmlFor="hasta" error={vivo.fields?.hasta}>
                  <Input id="hasta" name="hasta" type="date" className="max-w-[220px]" {...fieldAria("hasta", vivo.fields?.hasta)} />
                </Field>
              )}
              <label className="flex cursor-pointer gap-3 rounded-[10px] border border-border bg-base px-4 py-3">
                <input type="checkbox" name="fijar" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-monte" />
                <span className="text-[13.5px]">
                  <span className="block font-semibold text-ink">Fijar a la versión {version}</span>
                  <span className="text-muted">Si después subís otra versión, el enlace sigue mostrando ésta y avisa que fue reemplazada. Si no, muestra siempre la vigente.</span>
                </span>
              </label>
              <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
                <IconClock size={14} /> Al vencer, el enlace deja de abrir y el comprador ve que caducó.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconShare size={16} />}>
                Crear enlace
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </>
  );
}
