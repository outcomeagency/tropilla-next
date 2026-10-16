import "server-only";
import { api, query } from "@/lib/api";
import { withMock, withMockIf } from "@/lib/mock/fallback";
import { MOCK_LOTES } from "@/lib/mock/lotes";
import { mockAvisos, mockOferta, mockOfertas } from "@/lib/mock/ofertas-panel";
import type { Many, One, S } from "@/lib/schemas";

const base = (est: string) => `/establecimientos/${est}`;

export function listOfertas(est: string, estado?: string) {
  return withMock(
    async () => (await api<Many<S<"Oferta">>>(`${base(est)}/ofertas${query({ estado })}`)).data,
    () => mockOfertas(est).filter((o) => !estado || o.estado === estado),
  );
}

export function getOferta(est: string, id: string) {
  return withMockIf(
    async () => (await api<One<S<"Oferta">>>(`${base(est)}/ofertas/${id}`)).data,
    () => mockOferta(est, id),
  );
}

export type Aviso = { codigo: string; mensaje: string; corregir?: string };

export async function getAvisos(est: string, oferta: S<"Oferta">, source: "api" | "mock"): Promise<Aviso[]> {
  if (source === "mock") return mockAvisos(oferta);
  const res = await api<One<S<"Oferta">>>(`${base(est)}/ofertas/${oferta.id}/avisos`);
  return (res.data.avisos ?? []).map((a) => ({
    codigo: String(a.codigo ?? ""),
    mensaje: String(a.mensaje ?? a.codigo ?? ""),
    corregir: typeof a.corregir === "string" ? a.corregir : undefined,
  }));
}

export type LoteConExtra = S<"Lote"> & { extra?: (typeof MOCK_LOTES)[number]["extra"] };

export function listLotes(est: string) {
  return withMock(
    async (): Promise<LoteConExtra[]> => (await api<Many<S<"Lote">>>(`${base(est)}/lotes`)).data,
    (): LoteConExtra[] => MOCK_LOTES,
  );
}
