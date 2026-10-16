import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { IconCheckCircle } from "@/components/icons";
import { DataList, Notice, buttonClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { ROL_LABEL } from "@/lib/auth";
import { getToken } from "@/lib/session";
import { aceptarInvitacionAction } from "@/lib/usuarios-actions";
import { fechaLarga } from "@/lib/format";
import type { One, S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Invitación", robots: { index: false } };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

const ERRORES: Record<string, string> = {
  vencida: "La invitación venció o fue revocada. Pedile una nueva a quien te invitó.",
  "otra-cuenta": "La invitación es para otro email o teléfono. Ingresá con esa cuenta.",
  error: "No pudimos aceptar la invitación. Probá de nuevo.",
};

async function Invitacion({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  let inv: S<"InvitacionPublica"> | null = null;
  try {
    inv = (await api<One<S<"InvitacionPublica">>>(`/public/invitaciones/${encodeURIComponent(token)}`, { auth: false })).data;
  } catch (e) {
    if (!(e instanceof ApiError && (e.status === 404 || e.status === 410))) throw e;
  }
  if (!inv || inv.vigente === false) {
    return (
      <div className="space-y-5">
        <Notice tone="warning" title="Esta invitación no está vigente">
          Venció o fue revocada. Pedile a quien te invitó que te mande una nueva.
        </Notice>
        <Link href="/ingresar" className={buttonClass("outline", "md", "w-full")}>
          Ir a ingresar
        </Link>
      </div>
    );
  }
  const logueado = !!(await getToken());
  const next = `/invitacion/${encodeURIComponent(token)}`;
  return (
    <div className="space-y-6">
      {error && <Notice tone="danger" title={ERRORES[error] ?? ERRORES.error} />}
      <div className="rounded-[var(--radius-card)] border border-border bg-base p-5">
        <DataList
          className="sm:grid-cols-1"
          items={[
            { label: "Establecimiento", value: <span className="font-semibold">{inv.establecimiento_nombre}</span> },
            { label: "Productor", value: inv.productor_nombre },
            { label: "Tu rol", value: ROL_LABEL[inv.rol ?? "lectura"] },
            { label: "Te invitó", value: inv.invitado_por },
            { label: "Vence", value: fechaLarga(inv.expira_en) },
          ]}
        />
      </div>
      {logueado ? (
        <form action={aceptarInvitacionAction}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={buttonClass("primary", "md", "w-full")}>
            <IconCheckCircle size={18} /> Aceptar y entrar
          </button>
        </form>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href={`/registro?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "md")}>
            Crear mi cuenta
          </Link>
          <Link href={`/ingresar?next=${encodeURIComponent(next)}`} className={buttonClass("outline", "md")}>
            Ya tengo cuenta
          </Link>
        </div>
      )}
    </div>
  );
}

/** El invitado ve a qué campo y con qué rol, y acepta (flujo 16). */
export default function InvitacionPage(props: Props) {
  return (
    <AuthShell headline="Sumate al equipo del campo." title="Te invitaron a TROPILLA" subtitle="Vas a poder cargar y ver lo que tu rol permite. Tus datos y los del campo quedan privados.">
      <Suspense fallback={<div className="h-[280px]" aria-hidden="true" />}>
        <Invitacion {...props} />
      </Suspense>
    </AuthShell>
  );
}
