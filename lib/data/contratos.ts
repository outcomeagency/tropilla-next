import "server-only";
import { api, query } from "@/lib/api";
import { withMock, withMockIf } from "@/lib/mock/fallback";
import { mockContrato, mockContratos } from "@/lib/mock/contratos";
import type { Many, One, S } from "@/lib/schemas";

const base = (est: string) => `/establecimientos/${est}/contratos`;

export function listContratos(est: string, estado?: string) {
  return withMock(
    async () => (await api<Many<S<"Contrato">>>(`${base(est)}${query({ estado })}`)).data,
    () => mockContratos(est).filter((c) => !estado || c.estado === estado),
  );
}

export function getContrato(est: string, id: string) {
  return withMockIf(async () => (await api<One<S<"Contrato">>>(`${base(est)}/${id}`)).data, () => mockContrato(est, id));
}

/** «Mi apalancamiento»: GET …/apalancamiento o calculado desde los contratos. */
export async function getApalancamiento(est: string, contratos: S<"Contrato">[]) {
  return withMock(
    async () => (await api<One<S<"Apalancamiento">>>(`/establecimientos/${est}/apalancamiento`)).data,
    (): S<"Apalancamiento"> => {
      const tomas = contratos.flatMap((c) => c.tomas ?? []);
      const sum = (f: (t: S<"Toma">) => boolean) => tomas.filter(f).reduce((s, t) => s + Number(t.anticipo_monto ?? 0), 0);
      return {
        anticipos_cobrados: String(sum((t) => t.estado === "confirmada")),
        anticipos_pendientes: String(sum((t) => t.estado === "reservada" || t.estado === "pago_informado")),
        kg_comprometidos: tomas.filter((t) => t.estado !== "liberada").reduce((s, t) => s + (t.kg ?? 0), 0),
        moneda: "ARS",
        contratos: contratos.map((c) => ({
          id: c.id,
          lote: c.lote?.nombre,
          pct_tomado: String(Math.round(((c.tokens_comprometidos ?? 0) / Math.max(1, c.terminos?.tokens_totales ?? 1)) * 100)),
          fecha_entrega: c.terminos?.fecha_entrega,
          estado: c.estado,
        })),
      };
    },
  );
}
