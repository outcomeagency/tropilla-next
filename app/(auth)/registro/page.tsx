import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <AuthShell
      photo="brahmanRodeo"
      headline="Ordená tu campo y mostralo como se merece."
      title="Creá la cuenta de tu campo"
      subtitle="Es gratis para empezar. Después cargás tu establecimiento y tu hacienda en pocos pasos."
      footer={
        <p>
          ¿Ya tenés cuenta?{" "}
          <Link href="/ingresar" className="font-semibold text-campo hover:underline">
            Ingresá
          </Link>
        </p>
      }
    >
      <Suspense fallback={<div className="h-[420px]" aria-hidden="true" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
