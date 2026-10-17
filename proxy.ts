import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (Next 16, antes «middleware»). Chequeo optimista, sin llamar a la API:
 * - Panel sin cookie de sesión → /ingresar?next=<ruta>.
 * - /ingresar con sesión → /inicio.
 * - / → portal público en el idioma del navegador (/es, /en, /pt).
 * La autorización real la hace la API con el token; el panel además valida
 * la sesión contra /auth/me (lib/auth.ts).
 */
const SESSION_COOKIE = "tropilla_token"; // = lib/session.ts (no se importa: ese módulo es server-only con next/headers)
const LOCALES = ["es", "en", "pt"] as const;

function preferredLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language") ?? "";
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return tags.find((t) => (LOCALES as readonly string[]).includes(t.lang))?.lang ?? "es";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${preferredLocale(request)}`, request.url));
  }

  // Enlaces compartidos (TPA-38): la API arma `{web}/e/{token}`; se sirven en el idioma del navegador.
  if (pathname.startsWith("/e/")) {
    return NextResponse.redirect(new URL(`/${preferredLocale(request)}${pathname}`, request.url));
  }

  if (pathname === "/ingresar" || pathname === "/registro") {
    return hasSession ? NextResponse.redirect(new URL("/inicio", request.url)) : NextResponse.next();
  }

  if (!hasSession) {
    const login = new URL("/ingresar", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Constantes literales: Next las analiza en build. Mantener sincronizado con lib/nav.ts.
  matcher: [
    "/",
    "/e/:path*",
    "/ingresar",
    "/registro",
    "/bienvenida",
    "/comprador/:path*",
    "/profesional/:path*",
    "/inicio/:path*",
    "/hacienda/:path*",
    "/reproduccion/:path*",
    "/sanidad/:path*",
    "/establecimiento/:path*",
    "/establecimientos/:path*",
    "/clima/:path*",
    "/forraje/:path*",
    "/documentos/:path*",
    "/trazabilidad/:path*",
    "/comercializacion/:path*",
    "/perfil-publico/:path*",
    "/organizaciones/:path*",
    "/configuracion/:path*",
  ],
};
