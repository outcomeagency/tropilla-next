import "server-only";
import { api, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export const FILTROS_EVENTOS = ["modulo", "tipo", "desde", "hasta", "lote_id", "autor_id"] as const;
export type FiltrosEventos = Partial<Record<(typeof FILTROS_EVENTOS)[number], string>>;

const base = (est: string) => `/establecimientos/${est}`;

/** Registro de eventos del establecimiento (TPA-22), paginado por cursor. */
export function listEventos(est: string, f: FiltrosEventos, cursor?: string, limit = 40) {
  return api<Many<S<"EventoResumen">>>(`${base(est)}/eventos${query({ ...f, cursor, limit })}`);
}

/** Evento vigente con sus versiones e integridad (EventoDetalle). */
export function getEvento(est: string, id: string) {
  return api<One<S<"EventoDetalle">>>(`${base(est)}/eventos/${id}`).then((r) => r.data);
}
