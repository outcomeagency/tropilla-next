import "server-only";
import { api, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type Consulta = S<"Consulta">;

const base = (est: string) => `/establecimientos/${est}`;

/** Bandeja de consultas de compradores (TPA-49). */
export function listConsultas(est: string, estado?: string, cursor?: string) {
  return api<Many<Consulta>>(`${base(est)}/consultas${query({ estado, cursor, limit: 50 })}`);
}

export function getConsulta(est: string, id: string) {
  return api<One<Consulta>>(`${base(est)}/consultas/${id}`).then((r) => r.data);
}
