import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { getToken } from "./session";
import type { Usuario } from "./types";

export type CurrentUser = { status: "ok"; user: Usuario } | { status: "unavailable" };

/**
 * Data Access Layer de la sesión: `/auth/me` una sola vez por request.
 * - Sin cookie o token rechazado (401) → /salir (limpia la cookie) → /ingresar.
 * - API caída → `unavailable`: el panel se sigue viendo y avisa, en vez de
 *   expulsar al usuario por un problema de red.
 *
 * Con Cache Components, leer cookies() es dato de request: los componentes que
 * llaman a esto van siempre detrás de un <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  if (!(await getToken())) redirect("/ingresar");

  try {
    const res = await api<{ data: Usuario }>("/auth/me", { timeoutMs: 4_000 });
    return { status: "ok", user: res.data };
  } catch (e) {
    if (e instanceof ApiError && e.unauthorized) redirect("/salir");
    return { status: "unavailable" };
  }
});
