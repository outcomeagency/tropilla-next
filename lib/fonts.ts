import { Inter, Montserrat } from "next/font/google";

/** Inter: producto (app, tablas, formularios). Números tabulares con `tabular-nums`. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Montserrat: sólo marca y heros de la web pública. */
export const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["600", "700"],
});

export const fontVariables = `${inter.variable} ${montserrat.variable}`;
