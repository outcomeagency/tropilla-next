import { api, ApiError } from "@/lib/api";
import { isMockable } from "@/lib/mock/fallback";
import { getVerificacion } from "@/lib/data/portal";

/**
 * Descarga de la prueba de integridad (prueba.json) de un registro público.
 * El navegador no habla con la API: este handler la pide server-side.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ huella: string }> }) {
  const { huella } = await ctx.params;
  if (!/^[a-f0-9]{64}$/i.test(huella)) return Response.json({ message: "Huella inválida" }, { status: 400 });
  let body: unknown;
  try {
    body = await api(`/public/verificaciones/${huella}/prueba`, { auth: false });
  } catch (e) {
    if (!isMockable(e)) {
      return Response.json({ message: "No encontrado" }, { status: e instanceof ApiError ? e.status || 502 : 502 });
    }
    const v = await getVerificacion(huella, "es");
    if (!v) return Response.json({ message: "No encontrado" }, { status: 404 });
    body = { ejemplo: true, huella, integridad: v.data.integridad };
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="prueba-${huella.slice(0, 12)}.json"` },
  });
}
