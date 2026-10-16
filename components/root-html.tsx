import type { ReactNode } from "react";
import { fontVariables } from "@/lib/fonts";

/**
 * <html>/<body> compartido por los tres root layouts de la app
 * ((panel), (auth) y [locale]). Cada uno es root layout propio para poder
 * fijar `lang` por idioma en lo público.
 */
export function RootHtml({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html lang={lang} className={`${fontVariables} h-full`}>
      <body className="min-h-full bg-base text-ink antialiased">{children}</body>
    </html>
  );
}
