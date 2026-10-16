import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function RestablecerPage() {
  return (
    <AuthShell
      title="Elegí una contraseña nueva"
      subtitle="Al guardarla se cierran las sesiones abiertas en otros dispositivos."
    >
      <Suspense fallback={<div className="h-[260px]" aria-hidden="true" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
