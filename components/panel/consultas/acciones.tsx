"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { estadoConsultaAction } from "@/lib/consulta-actions";
import { Notice, buttonClass } from "@/components/ui";
import { IconMail, IconPhone, IconWhatsapp } from "@/components/icons";

type Estado = "nueva" | "respondida" | "cerrada" | "spam";

/**
 * Responder abre WhatsApp o el correo del productor con el mensaje prearmado
 * en el idioma del comprador, y marca la consulta como respondida.
 */
export function AccionesConsulta({ id, estado, whatsapp, mailto, telefono, puede }: { id: string; estado: Estado; whatsapp?: string | null; mailto?: string | null; telefono?: string | null; puede: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const cambiar = (e: Estado, canal?: "whatsapp" | "email" | "telefono") =>
    start(async () => {
      setError("");
      const r = await estadoConsultaAction(id, e, canal);
      if (r.error) setError(r.error);
      else router.refresh();
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => puede && estado === "nueva" && cambiar("respondida", "whatsapp")} className={buttonClass("primary", "md")}>
            <IconWhatsapp size={18} /> Responder por WhatsApp
          </a>
        )}
        {mailto && (
          <a href={mailto} onClick={() => puede && estado === "nueva" && cambiar("respondida", "email")} className={buttonClass(whatsapp ? "outline" : "primary", "md")}>
            <IconMail size={18} /> Responder por email
          </a>
        )}
        {telefono && !whatsapp && (
          <a href={`tel:${telefono}`} onClick={() => puede && estado === "nueva" && cambiar("respondida", "telefono")} className={buttonClass("outline", "md")}>
            <IconPhone size={18} /> Llamar
          </a>
        )}
      </div>
      {puede && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          {estado !== "respondida" && estado !== "cerrada" && (
            <button type="button" disabled={pending} onClick={() => cambiar("respondida")} className="font-medium text-campo hover:underline disabled:opacity-50">
              Ya la respondí por otro medio
            </button>
          )}
          {estado !== "cerrada" && (
            <button type="button" disabled={pending} onClick={() => cambiar("cerrada")} className="font-medium text-muted hover:text-ink hover:underline disabled:opacity-50">
              Cerrar
            </button>
          )}
          {estado !== "nueva" && (
            <button type="button" disabled={pending} onClick={() => cambiar("nueva")} className="font-medium text-muted hover:text-ink hover:underline disabled:opacity-50">
              Volver a nueva
            </button>
          )}
          {estado !== "spam" && (
            <button type="button" disabled={pending} onClick={() => cambiar("spam")} className="ml-auto font-medium text-danger hover:underline disabled:opacity-50">
              Marcar como spam
            </button>
          )}
        </div>
      )}
      {error && <Notice tone="danger" title={error} />}
    </div>
  );
}
