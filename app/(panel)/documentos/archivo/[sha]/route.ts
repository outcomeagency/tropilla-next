import { API_URL } from "@/lib/api";
import { getToken } from "@/lib/session";

/**
 * Abre un archivo de la carpeta documental: pide a la API (con el token de la
 * cookie, server-side) la URL prefirmada de 5 minutos y redirige el navegador.
 * La API sólo la da si el usuario puede ver algo que referencia el archivo.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ sha: string }> }) {
  const { sha } = await ctx.params;
  if (!/^[a-f0-9]{64}$/.test(sha)) return new Response("Archivo inválido", { status: 400 });
  const token = await getToken();
  if (!token) return new Response("Sin sesión", { status: 401 });
  const res = await fetch(`${API_URL}/archivos/${sha}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const destino = res?.headers.get("location");
  if (!res || res.status < 300 || res.status >= 400 || !destino) return new Response("No encontramos el archivo o no tenés acceso.", { status: res?.status === 403 ? 403 : 404 });
  return Response.redirect(destino, 302);
}
