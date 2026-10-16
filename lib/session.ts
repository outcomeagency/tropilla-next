import "server-only";
import { cookies } from "next/headers";

/** Cookie httpOnly con el token Sanctum. El navegador nunca lo ve desde JS. */
export const SESSION_COOKIE = "tropilla_token";

/** Duración de la sesión web (se alinea con la expiración del token en la API). */
const MAX_AGE = 60 * 60 * 24 * 7;

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value || undefined;
}

export async function setSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
