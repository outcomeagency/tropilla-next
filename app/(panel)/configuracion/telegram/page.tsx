import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Card, CardBody, CardHeader, DataList, Notice, PageHeader, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconClock, IconInfo } from "@/components/icons";
import { VincularTelegram } from "@/components/panel/telegram/vincular";
import { api } from "@/lib/api";
import { avisosTelegramAction, desvincularTelegramAction } from "@/lib/telegram-actions";
import { fechaHora } from "@/lib/format";
import type { One, S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Bot de Telegram" };

const MSG: Record<string, { tone: "success" | "danger"; title: string }> = {
  "ok:avisos-on": { tone: "success", title: "Avisos por Telegram activados." },
  "ok:avisos-off": { tone: "success", title: "Avisos por Telegram pausados. Los seguís viendo en la app y en el panel." },
  "ok:desvinculado": { tone: "success", title: "Desvinculaste Telegram. El bot ya no actúa con tu cuenta." },
  "error:avisos": { tone: "danger", title: "No pudimos cambiar los avisos. Probá de nuevo." },
  "error:desvincular": { tone: "danger", title: "No pudimos desvincular. Probá de nuevo." },
};

const PUEDE = [
  "Leer fotos o PDF de actas de vacunación: te pregunta solo lo dudoso y registra cuando confirmás.",
  "Responder consultas: existencias, preñadas, qué vence, alertas de clima, una caravana.",
  "Anotar nacimientos, pesajes, muertes y tratamientos por texto o audio, siempre con confirmación.",
  "Mandarte los avisos de TROPILLA que tengas habilitados.",
];

async function Contenido({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const msg = sp.ok ? MSG[`ok:${sp.ok}`] : sp.error ? MSG[`error:${sp.error}`] : undefined;
  let t: S<"TelegramVinculo"> | null = null;
  try {
    t = (await api<One<S<"TelegramVinculo">>>("/me/telegram")).data;
  } catch {
    t = null;
  }

  return (
    <>
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone} title={msg.title} />
        </div>
      )}
      {!t ? (
        <Notice tone="danger" title="No pudimos consultar el estado del bot. Probá de nuevo en un rato." />
      ) : !t.disponible ? (
        <Notice tone="info" title="El bot de Telegram todavía no está disponible en este servidor." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <Card>
            <CardHeader
              title={t.vinculado ? "Telegram vinculado" : "Vincular tu Telegram"}
              description={t.vinculado ? "El bot actúa con los permisos de tu usuario en cada establecimiento." : `Usá @${t.bot.username} desde el campo, sin abrir la app.`}
            />
            <CardBody>
              {t.vinculado ? (
                <div className="space-y-5">
                  <DataList
                    items={[
                      { label: "Cuenta de Telegram", value: t.username ? `@${t.username}` : "Sin usuario público" },
                      { label: "Teléfono compartido", value: t.telefono ?? "No lo compartiste (es opcional)" },
                      { label: "Establecimiento activo en el bot", value: t.establecimiento?.nombre ?? "Elegilo con /campo" },
                      { label: "Vinculado", value: fechaHora(t.vinculado_en) },
                      { label: "Avisos por Telegram", value: t.avisos ? <Badge tone="success" icon={<IconCheckCircle size={13} />}>Activos</Badge> : <Badge icon={<IconClock size={13} />}>Pausados</Badge> },
                    ]}
                  />
                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <form action={avisosTelegramAction}>
                      <input type="hidden" name="avisos" value={t.avisos ? "0" : "1"} />
                      <button type="submit" className={buttonClass("outline", "md")}>
                        {t.avisos ? "Pausar avisos" : "Activar avisos"}
                      </button>
                    </form>
                    <form action={desvincularTelegramAction}>
                      <button type="submit" className={buttonClass("danger", "md")}>
                        Desvincular
                      </button>
                    </form>
                  </div>
                  <p className="text-[13px] text-muted">También podés desvincular desde Telegram con /salir. Lo que cargaste por el bot sigue en el historial.</p>
                </div>
              ) : (
                <VincularTelegram />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Qué podés hacer con el bot" />
            <CardBody>
              <ul className="space-y-2.5 text-[14px] text-ink">
                {PUEDE.map((p) => (
                  <li key={p} className="flex gap-2">
                    <IconCheckCircle size={16} className="mt-0.5 shrink-0 text-monte" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex gap-2 text-[13px] text-muted">
                <IconInfo size={16} className="mt-0.5 shrink-0" />
                Nada se registra sin que lo confirmes con un botón. Las respuestas salen solo de tus datos cargados.
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

export default function TelegramPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  return (
    <>
      <PageHeader
        title="Bot de Telegram"
        subtitle="Consultas, cargas rápidas, lectura de actas y avisos desde Telegram."
        actions={
          <Link href="/configuracion" className={buttonClass("ghost", "md")}>
            <IconArrowLeft size={18} />
            Configuración
          </Link>
        }
      />
      <Suspense fallback={<div className="h-64 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  );
}
