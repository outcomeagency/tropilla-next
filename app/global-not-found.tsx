import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { RootHtml } from "@/components/root-html";
import { Logo } from "@/components/brand";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Página no encontrada · TROPILLA" };

export default function GlobalNotFound() {
  return (
    <RootHtml lang="es">
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-[460px]">
          <Logo height={32} />
          <p className="mt-10 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Error 404</p>
          <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-ink">No encontramos esta página</h1>
          <p className="mt-2 text-[15px] text-muted">
            El enlace puede estar mal escrito o la página ya no está publicada. Si llegaste desde una ficha compartida,
            pedile al productor un enlace nuevo.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/es" className={buttonClass("primary", "md")}>
              Ir al portal
            </Link>
            <Link href="/ingresar" className={buttonClass("outline", "md")}>
              Ingresar al panel
            </Link>
          </div>
        </div>
      </main>
    </RootHtml>
  );
}
