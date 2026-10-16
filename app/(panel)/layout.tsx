import "../globals.css";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { RootHtml } from "@/components/root-html";
import { PanelSidebar } from "@/components/panel/sidebar";
import { UserCard, UserCardSkeleton } from "@/components/panel/user-card";
import { SessionGate } from "@/components/panel/session-gate";
import { EstablishmentSelector } from "@/components/panel/establishment-selector";
import { EstablishmentSwitcherSkeleton } from "@/components/panel/establishment-switcher";

export const metadata: Metadata = {
  title: { template: "%s · TROPILLA", default: "Panel · TROPILLA" },
  description: "Gestión de hacienda, sanidad, reproducción y documentos del establecimiento.",
  robots: { index: false, follow: false },
};

/**
 * Root layout del panel de gestión. La protección optimista la hace proxy.ts;
 * la sesión se valida contra la API en <UserCard> (detrás de Suspense, porque
 * lee cookies) para no bloquear el resto del shell.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <RootHtml lang="es">
      <PanelSidebar
        selectorSlot={
          <Suspense fallback={<EstablishmentSwitcherSkeleton />}>
            <EstablishmentSelector />
          </Suspense>
        }
        userSlot={
          <Suspense fallback={<UserCardSkeleton />}>
            <UserCard />
          </Suspense>
        }
      />
      <main className="min-h-dvh lg:pl-[264px]">
        <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={null}>
            <SessionGate />
          </Suspense>
          {children}
        </div>
      </main>
    </RootHtml>
  );
}
