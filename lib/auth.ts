import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { getToken } from "./session";
import { isMockable, type Source } from "./mock/fallback";
import { MOCK_TOKEN_PREFIX, mockMe } from "./mock/auth";
import type { One, S } from "./schemas";

export type Me = S<"Me">;
export type CurrentUser = { status: "ok"; me: Me; source: Source } | { status: "unavailable" };

/** Decodifica el token demo `mock-new.<base64url(nombre|email)>` de un registro sin API. */
function meFromMockToken(token: string): Me {
  if (token.startsWith(`${MOCK_TOKEN_PREFIX}new.`)) {
    try {
      const [nombre, email] = Buffer.from(token.slice(`${MOCK_TOKEN_PREFIX}new.`.length), "base64url").toString("utf8").split("|");
      return mockMe(nombre || "Productor", email, true);
    } catch {
      return mockMe(undefined, undefined, true);
    }
  }
  return mockMe();
}

/**
 * Data Access Layer de la sesión: `/auth/me` una sola vez por request.
 * - Sin cookie o token rechazado (401) → /salir (limpia la cookie) → /ingresar.
 * - Endpoint inexistente o API caída → sesión demo (lib/mock/auth.ts) si el
 *   adaptador de ejemplo está activo; si no, `unavailable` y el panel avisa.
 *
 * Con Cache Components, leer cookies() es dato de request: los componentes que
 * llaman a esto van siempre detrás de un <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const token = await getToken();
  if (!token) redirect("/ingresar");

  try {
    const res = await api<One<Me>>("/auth/me", { timeoutMs: 4_000 });
    return { status: "ok", me: res.data, source: "api" };
  } catch (e) {
    if (e instanceof ApiError && e.unauthorized) redirect("/salir");
    if (isMockable(e) && token.startsWith(MOCK_TOKEN_PREFIX)) {
      return { status: "ok", me: meFromMockToken(token), source: "mock" };
    }
    return { status: "unavailable" };
  }
});

export const ROL_LABEL: Record<S<"MembresiaResumen">["rol"], string> = {
  dueno: "Dueño",
  admin: "Administrador",
  encargado: "Encargado",
  asesor: "Asesor / veterinario",
  lectura: "Solo lectura",
};
