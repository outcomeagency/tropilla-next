"use client";

import { useState } from "react";
import { versionDocumentoAction } from "@/lib/documento-actions";
import { uuidv7 } from "@/lib/uuid";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useDialogForm } from "@/components/panel/form-state";
import { Button, Field, Input, Notice, Spinner, Textarea, fieldAria } from "@/components/ui";
import { IconUpload } from "@/components/icons";

type Doc = { id: string; titulo: string; emisor: string | null; emitido: string | null; vence: string | null };

function VersionDialog({ doc, accion, label, variant, titulo, descripcion }: { doc: Doc; accion: "nueva_version" | "correccion_metadatos" | "revocacion"; label: string; variant: "primary" | "outline" | "ghost" | "danger"; titulo: string; descripcion: string }) {
  const { state, formAction, pending, f, open, abrir, cerrar, ok } = useDialogForm(versionDocumentoAction);
  const [vid, setVid] = useState(() => uuidv7());
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        icon={accion === "nueva_version" ? <IconUpload size={16} /> : undefined}
        onClick={() => {
          setVid(uuidv7());
          abrir();
        }}
      >
        {label}
      </Button>
      {ok && (
        <span className="sr-only" role="status">
          {ok.mensaje}
        </span>
      )}
      <Dialog open={open} onClose={cerrar} title={titulo} description={descripcion} size={accion === "revocacion" ? "sm" : "md"}>
        <form action={formAction} noValidate encType="multipart/form-data">
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="accion" value={accion} />
          <input type="hidden" name="version_id" value={vid} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            {accion === "revocacion" && (
              <Notice tone="warning" title="Revocar no borra">
                El documento queda en la historia con su huella, marcado como revocado. Deja de contar como vigente y de mostrarse en el perfil.
              </Notice>
            )}
            {accion === "nueva_version" && (
              <Field label="Archivo nuevo" htmlFor="archivo_v" error={f.archivo} hint="PDF o foto, hasta 10 MB.">
                <input
                  id="archivo_v"
                  name="archivo"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                  className="block w-full text-[14px] text-muted file:mr-3 file:h-10 file:cursor-pointer file:rounded-[8px] file:border file:border-border-strong file:bg-surface file:px-4 file:text-[14px] file:font-medium file:text-ink hover:file:bg-surface-2"
                />
              </Field>
            )}
            {accion !== "revocacion" && (
              <>
                <Field label="Título" htmlFor="titulo_v" optional>
                  <Input id="titulo_v" name="titulo" defaultValue={doc.titulo} maxLength={200} />
                </Field>
                <Field label="Emitido por" htmlFor="emisor_v" optional>
                  <Input id="emisor_v" name="emisor" defaultValue={doc.emisor ?? ""} maxLength={200} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Emisión" htmlFor="emitido_v" optional error={f.emitido_en}>
                    <Input id="emitido_v" name="emitido_en" type="date" defaultValue={doc.emitido ?? ""} {...fieldAria("emitido_v", f.emitido_en)} />
                  </Field>
                  <Field label="Vencimiento" htmlFor="vence_v" optional error={f.vence_en}>
                    <Input id="vence_v" name="vence_en" type="date" defaultValue={doc.vence ?? ""} {...fieldAria("vence_v", f.vence_en)} />
                  </Field>
                </div>
              </>
            )}
            <Field label="Motivo" htmlFor="motivo_v" error={f.motivo} hint="Queda en la historia del documento.">
              <Textarea
                id="motivo_v"
                name="motivo"
                rows={3}
                maxLength={500}
                className="min-h-[80px]"
                placeholder={accion === "nueva_version" ? "Constancia renovada en octubre." : accion === "revocacion" ? "Fue reemplazado por otro trámite." : "El vencimiento estaba mal cargado."}
                {...fieldAria("motivo_v", f.motivo, true)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant={accion === "revocacion" ? "danger" : "primary"} disabled={pending} icon={pending ? <Spinner /> : undefined}>
              {accion === "revocacion" ? "Revocar documento" : "Guardar versión"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

export function AccionesDocumento({ doc, puedeVersionar, revocado }: { doc: Doc; puedeVersionar: boolean; revocado: boolean }) {
  if (!puedeVersionar || revocado) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <VersionDialog doc={doc} accion="nueva_version" label="Nueva versión" variant="primary" titulo="Subir una versión nueva" descripcion="Por ejemplo, la constancia renovada. La anterior sigue en la historia con su huella." />
      <VersionDialog doc={doc} accion="correccion_metadatos" label="Corregir datos" variant="outline" titulo="Corregir datos del documento" descripcion="Mismo archivo; cambia título, emisor o fechas. Queda el motivo." />
      <VersionDialog doc={doc} accion="revocacion" label="Revocar" variant="ghost" titulo={`Revocar «${doc.titulo}»`} descripcion="Para cuando el documento ya no vale (dado de baja, reemplazado o cargado por error)." />
    </div>
  );
}
