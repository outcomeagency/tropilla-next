import { api, ApiError } from "@/lib/api";
import type { One, S } from "@/lib/schemas";

/**
 * Abre el archivo de un documento compartido (TPA-38): vuelve a validar el enlace
 * contra la API (si venció o fue revocado, no abre) y redirige a la URL prefirmada.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string; sha: string }> }) {
  const { token, sha } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(token) || !/^[a-f0-9]{64}$/.test(sha)) return new Response("Enlace inválido", { status: 400 });
  try {
    const r = await api<One<S<"EnlacePublico">>>(`/public/enlaces/${token}`, { auth: false });
    const a = r.data.archivos?.find((x) => x.sha256 === sha);
    if (!a?.url) return new Response("Archivo no disponible", { status: 404 });
    return Response.redirect(a.url, 302);
  } catch (e) {
    return new Response(e instanceof ApiError && e.status === 410 ? "El enlace venció o fue revocado." : "No encontrado", { status: e instanceof ApiError ? e.status || 502 : 502 });
  }
}
