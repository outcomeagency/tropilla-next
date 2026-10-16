import "../globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { RootHtml } from "@/components/root-html";

export const metadata: Metadata = {
  title: { template: "%s · TROPILLA", default: "TROPILLA" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <RootHtml lang="es">{children}</RootHtml>;
}
