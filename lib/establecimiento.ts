import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import type { S } from "./schemas";

/** Establecimiento activo del panel (no es secreto: sólo elige cuál mostrar). */
export const ACTIVE_COOKIE = "tropilla_est";

export async function setActiveEstablecimiento(id: string): Promise<void> {
  (await cookies()).set(ACTIVE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export type Membresia = S<"MembresiaResumen">;

export interface Contexto {
  me: S<"Me">;
  activa: Membresia;
  source: "api" | "mock";
  /** ¿La membresía activa tiene esta ability? (la UI nunca re-implementa la matriz). */
  can: (ability: string) => boolean;
}

/**
 * Sesión + establecimiento activo (cookie, o el primero). Sin membresías →
 * onboarding. Lee cookies: siempre detrás de <Suspense>.
 */
export const getContexto = cache(async (): Promise<Contexto | null> => {
  const current = await getCurrentUser();
  if (current.status !== "ok") return null;
  const { me } = current;
  if (!me.membresias.length) redirect("/bienvenida");

  const elegido = (await cookies()).get(ACTIVE_COOKIE)?.value;
  const activa = me.membresias.find((m) => m.establecimiento_id === elegido) ?? me.membresias[0];
  const abilities = new Set(activa.abilities);
  return { me, activa, source: current.source, can: (a) => abilities.has(a) };
});

/** Para páginas que no pueden seguir sin contexto (API caída y sin mock): lo atrapa app/(panel)/error.tsx. */
export async function requireContexto(): Promise<Contexto> {
  const ctx = await getContexto();
  if (!ctx) throw new Error("No pudimos conectar con TROPILLA.");
  return ctx;
}
