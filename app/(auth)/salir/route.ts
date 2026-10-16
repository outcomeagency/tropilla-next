import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Sesión vencida o token rechazado por la API (401 en /auth/me).
 * Un Server Component no puede borrar cookies, así que lib/auth.ts redirige
 * acá: se limpia la cookie y se vuelve a /ingresar sin generar un loop con proxy.ts.
 * El cierre de sesión voluntario es la Server Action `logoutAction` (POST).
 */
export function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/ingresar?motivo=sesion", request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
