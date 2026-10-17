import { API_URL } from "@/lib/api";
import { getContexto } from "@/lib/establecimiento";
import { getToken } from "@/lib/session";

/**
 * Descarga la conciliación de faena (PDF o CSV) con el token de la cookie, server-side (TPA-67).
 * Se genera a pedido en la API y no se guarda: trae precios privados.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Resultado inválido", { status: 400 });
  const formato = new URL(req.url).searchParams.get("formato") === "csv" ? "csv" : "pdf";
  const [token, c] = await Promise.all([getToken(), getContexto()]);
  if (!token || !c) return new Response("Sin sesión", { status: 401 });
  const res = await fetch(`${API_URL}/establecimientos/${c.activa.establecimiento_id}/faena/resultados/${id}/exportar?formato=${formato}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: formato === "csv" ? "text/csv" : "application/pdf" },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res) return new Response("No pudimos conectar con TROPILLA.", { status: 502 });
  if (!res.ok) {
    const msg = res.status === 503 ? "No se pudo generar el PDF ahora. Probá de nuevo o bajá el CSV." : res.status === 403 ? "No tenés acceso a este resultado." : "No encontramos el resultado.";
    return new Response(msg, { status: res.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? (formato === "csv" ? "text/csv; charset=utf-8" : "application/pdf"),
      "Content-Disposition": res.headers.get("content-disposition") ?? `attachment; filename="conciliacion-faena.${formato}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
