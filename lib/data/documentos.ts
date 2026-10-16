import "server-only";
import { api, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type Documento = S<"Documento">;
export type DocumentoVersion = S<"DocumentoVersion">;
export type Enlace = S<"Enlace">;

export type FiltrosDocumentos = { q?: string; tipo?: string; privacidad?: string; estado?: string; visibilidad?: string; vinculo_tipo?: string; vinculo_id?: string; vence_antes?: string; cursor?: string };

const base = (est: string) => `/establecimientos/${est}/documentos`;

/** Carpeta documental (TPA-36). Los fiscales sólo llegan con `documentos.fiscal`. */
export function listDocumentos(est: string, f: FiltrosDocumentos = {}, limit = 50) {
  return api<Many<Documento>>(`${base(est)}${query({ ...f, limit })}`);
}

/** Vigentes que vencen dentro de `dias` (incluye los ya vencidos). */
export function listVencimientos(est: string, dias = 30) {
  return api<Many<Documento>>(`${base(est)}/vencimientos${query({ dias })}`).then((r) => r.data);
}

export function getDocumento(est: string, id: string) {
  return api<One<Documento>>(`${base(est)}/${id}`).then((r) => r.data);
}

export function listEnlaces(est: string, id: string) {
  return api<Many<Enlace>>(`${base(est)}/${id}/enlaces`).then((r) => r.data);
}

/** Días hasta el vencimiento (negativo = vencido). */
export function diasHasta(vence: string | null | undefined, hoy: string): number | null {
  if (!vence) return null;
  return Math.round((Date.UTC(+vence.slice(0, 4), +vence.slice(5, 7) - 1, +vence.slice(8, 10)) - Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 1, +hoy.slice(8, 10))) / 86_400_000);
}
