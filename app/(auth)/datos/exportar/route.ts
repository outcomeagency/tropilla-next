import { API_URL } from "@/lib/api";
import { getToken } from "@/lib/session";

const PARAMS = ["cliente", "metrica", "especie", "geo", "escala", "desde", "hasta"] as const;

/**
 * Export CSV del recorte del tablero agregado (TPA-75), con el token de la cookie, server-side.
 * La API lo cuenta como una consulta más (cupo y auditoría); si la rechaza, se vuelve al tablero con el motivo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = new URLSearchParams();
  for (const k of PARAMS) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  const token = await getToken();
  if (!token) return Response.redirect(new URL(`/ingresar?next=/datos`, url), 303);
  const res = await fetch(`${API_URL}/agregados/tablero/exportar?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res || !res.ok) {
    const body = res ? ((await res.json().catch(() => ({}))) as { message?: string }) : {};
    const volver = new URLSearchParams(qs);
    if (qs.has("cliente")) volver.set("licencia", qs.get("cliente") ?? "");
    volver.delete("cliente");
    volver.set("error_export", body.message ?? "No pudimos conectar con TROPILLA.");
    return Response.redirect(new URL(`/datos?${volver}`, url), 303);
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "Content-Disposition": res.headers.get("content-disposition") ?? 'attachment; filename="tropilla-agregados-sinteticos.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
