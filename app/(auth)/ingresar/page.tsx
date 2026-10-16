import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function IngresarPage() {
  return (
    <AuthShell
      title="Ingresá a tu establecimiento"
      subtitle="Con el email o el teléfono y la contraseña de tu cuenta de TROPILLA."
      footer={
        <div className="space-y-2">
          <p>
            ¿Todavía no tenés cuenta?{" "}
            <Link href="/registro" className="font-semibold text-campo hover:underline">
              Creá la de tu campo
            </Link>
          </p>
          <p>
            ¿Sos comprador?{" "}
            <Link href="/es/directorio" className="font-medium text-campo hover:underline">
              Mirá el directorio de productores
            </Link>
            , no necesitás cuenta para consultar.
          </p>
        </div>
      }
    >
      <Suspense fallback={<div className="h-[300px]" aria-hidden="true" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
