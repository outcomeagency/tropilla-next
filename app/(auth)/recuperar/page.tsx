import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { IconArrowLeft } from "@/components/icons";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthShell
      photo="estero"
      title="Recuperá tu contraseña"
      subtitle="Escribí el email o el teléfono de tu cuenta y te mandamos un enlace para crear una nueva."
      footer={
        <Link href="/ingresar" className="inline-flex items-center gap-1.5 font-medium text-campo hover:underline">
          <IconArrowLeft size={16} /> Volver a ingresar
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
