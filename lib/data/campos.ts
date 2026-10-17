import "server-only";
import { cache } from "react";
import { api, ApiError, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type CampoAviso = S<"CampoAviso">;
export type CampoCompatibilidad = S<"CampoCompatibilidad">;
export type CampoConsulta = S<"CampoConsulta">;
export type CampoDisputa = S<"CampoDisputa">;
export type AvisoMercado = CampoAviso & { compatibilidad?: CampoCompatibilidad | null; propio?: boolean };
export type AvisoDetalle = AvisoMercado & { mi_consulta?: CampoConsulta | null; reportado?: boolean; checklist?: string[]; avisos?: string[] };
export type AvisoPropio = CampoAviso & { disputas?: CampoDisputa[] };

type Opcion = { codigo: string; nombre: string };
export interface CondicionesCampos {
  provincias_piloto: Opcion[];
  modalidades: Opcion[];
  precio_unidades: Opcion[];
  agua: Opcion[];
  instalaciones: Opcion[];
  alambrado: Opcion[];
  verificacion: Array<{ codigo: string; nombre: string; detalle: string }>;
  motivos_disputa: Opcion[];
  motivos_cierre: Opcion[];
  estados_consulta: Opcion[];
  checklist: string[];
  avisos: string[];
  consentimiento_version: string;
  umbral_revision: number;
}

export type Lectura<T> = { estado: "ok"; data: T } | { estado: "no_encontrado" } | { estado: "error"; mensaje: string };

function fallo(e: unknown): Exclude<Lectura<never>, { estado: "ok" }> {
  if (e instanceof ApiError) {
    if (e.status === 404) return { estado: "no_encontrado" };
    return { estado: "error", mensaje: e.unreachable ? "No pudimos conectar con TROPILLA." : e.message };
  }
  throw e;
}

/** Vocabulario y límites del mercado; deduplicado por request (lo piden página y formularios). */
export const getCondicionesCampos = cache(async (): Promise<Lectura<CondicionesCampos>> => {
  try {
    return { estado: "ok", data: (await api<One<CondicionesCampos>>("/campos/condiciones")).data };
  } catch (e) {
    return fallo(e);
  }
});

export interface FiltrosCampos {
  establecimiento_id?: string;
  modalidad?: string;
  especie?: string;
  provincia?: string;
  cabezas?: string;
  desde?: string;
  solo_compatibles?: string;
  orden?: string;
}

export interface BusquedaCampos {
  data: AvisoMercado[];
  meta: { total: number; orden: string; rodeo: Array<{ especie: string; cabezas: number }> | null };
}

/** Avisos publicados (TPA-74); con `establecimiento_id` vienen evaluados contra el rodeo. */
export async function buscarCampos(f: FiltrosCampos): Promise<Lectura<BusquedaCampos>> {
  try {
    return { estado: "ok", data: await api<BusquedaCampos>(`/campos${query({ ...f })}`) };
  } catch (e) {
    return fallo(e);
  }
}

export async function getAvisoMercado(id: string, est?: string): Promise<Lectura<AvisoDetalle>> {
  try {
    return { estado: "ok", data: (await api<One<AvisoDetalle>>(`/campos/${id}${query({ establecimiento_id: est })}`)).data };
  } catch (e) {
    return fallo(e);
  }
}

export async function getMisAvisos(est: string): Promise<Lectura<CampoAviso[]>> {
  try {
    return { estado: "ok", data: (await api<Many<CampoAviso>>(`/establecimientos/${est}/campos/avisos`)).data };
  } catch (e) {
    return fallo(e);
  }
}

export async function getMiAviso(est: string, id: string): Promise<Lectura<AvisoPropio>> {
  try {
    return { estado: "ok", data: (await api<One<AvisoPropio>>(`/establecimientos/${est}/campos/avisos/${id}`)).data };
  } catch (e) {
    return fallo(e);
  }
}

export async function getConsultasCampos(est: string, lado: "recibidas" | "enviadas"): Promise<Lectura<CampoConsulta[]>> {
  try {
    return { estado: "ok", data: (await api<Many<CampoConsulta>>(`/establecimientos/${est}/campos/consultas/${lado}`)).data };
  } catch (e) {
    return fallo(e);
  }
}

export async function getDisputasStaff(estado = "pendientes"): Promise<Lectura<CampoDisputa[]>> {
  try {
    return { estado: "ok", data: (await api<Many<CampoDisputa>>(`/staff/campos/disputas${query({ estado })}`)).data };
  } catch (e) {
    return fallo(e);
  }
}
