import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { IconCheckCircle } from "@/components/icons";
import { Notice, buttonClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export const metadata: Metadata = { title: "Verificar email" };

async function Verificacion({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return <Notice tone="warning" title="Falta el código de verificación">Abrí el enlace completo que te llegó por email.</Notice>;
  }
  try {
    await api("/auth/email/verificar", { method: "POST", body: { token }, auth: false });
  } catch (e) {
    const vencido = e instanceof ApiError && (e.status === 422 || e.status === 410);
    return (
      <div className="space-y-5">
        <Notice tone={vencido ? "warning" : "danger"} title={vencido ? "El enlace venció o ya se usó" : "No pudimos verificar el email"}>
          {vencido
            ? "Ingresá a tu cuenta y pedí un enlace nuevo desde el aviso de verificación."
            : "Probá de nuevo en unos minutos."}
        </Notice>
        <Link href="/ingresar" className={buttonClass("outline", "md", "w-full")}>
          Ir a ingresar
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <Notice tone="success" title="Tu email quedó verificado">
        Ya podés publicar tu perfil, tus ofertas y contratos.
      </Notice>
      <Link href="/inicio" className={buttonClass("primary", "md", "w-full")}>
        <IconCheckCircle size={18} /> Ir a mi campo
      </Link>
    </div>
  );
}

export default function VerificarEmailPage(props: { searchParams: Promise<{ token?: string }> }) {
  return (
    <AuthShell photo="vacaHumedal" title="Verificación de email">
      <Suspense fallback={<p className="text-[15px] text-muted">Verificando…</p>}>
        <Verificacion searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}
