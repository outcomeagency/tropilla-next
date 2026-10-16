"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { clearSession, getToken, setSession } from "./session";
import type { LoginResponse } from "./types";

export interface LoginState {
  error?: string;
  email?: string;
}

/** Sólo rutas internas del panel: evita open redirects con ?next=https://… */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/inicio";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Completá tu email y tu contraseña.", email };
  }

  try {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password, device_name: "tropilla-next" },
      auth: false,
    });
    await setSession(res.token);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.unreachable) {
        return { error: "No pudimos conectar con TROPILLA. Probá de nuevo en unos minutos.", email };
      }
      if (e.status === 401 || e.status === 422) {
        return { error: "El email o la contraseña no coinciden.", email };
      }
      if (e.status === 429) {
        return { error: "Demasiados intentos. Esperá un minuto y volvé a probar.", email };
      }
    }
    return { error: "No pudimos iniciar la sesión. Probá de nuevo.", email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  try {
    if (await getToken()) await api("/auth/logout", { method: "POST", timeoutMs: 4_000 });
  } catch {
    // La sesión local se cierra igual aunque la API no responda.
  }
  await clearSession();
  redirect("/ingresar");
}
