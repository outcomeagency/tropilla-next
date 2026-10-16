import { API_URL } from "@/lib/api";
import { getToken } from "@/lib/session";
import { parseCsv } from "@/lib/planilla-csv";

const celda = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Plantilla de stock (GET /importaciones/plantilla) descargada server-side.
 * Se entrega con BOM y separador `;`: así Excel en español la abre en columnas
 * y con tildes (la API lee `,` o `;`, con o sin BOM).
 */
export async function GET(req: Request) {
  const token = await getToken();
  if (!token) return Response.redirect(new URL("/ingresar?next=/hacienda/importar", req.url), 303);
  const especie = new URL(req.url).searchParams.get("especie") === "BOV" ? "BOV" : "BUB";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/importaciones/plantilla?especie=${especie}&formato=csv`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response("No pudimos conectar con TROPILLA. Probá de nuevo en un momento.", { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (!res.ok) {
    return new Response("No pudimos descargar la plantilla. Probá de nuevo.", { status: res.status === 401 ? 401 : 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const csv = (await res.text()).replace(/^﻿/, "");
  const out = parseCsv(csv, ",")
    .map((r) => r.map(celda).join(";"))
    .join("\r\n");
  const nombre = especie === "BOV" ? "plantilla-stock-bovinos.csv" : "plantilla-stock-bubalinos.csv";
  return new Response(`﻿${out}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
