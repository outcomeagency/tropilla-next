import "server-only";
import { cache } from "react";
import { api, ApiError } from "@/lib/api";

export type EscenarioClimatico = {
  codigo: string; titulo: string; nivel: "verde" | "amarillo" | "rojo" | "gris"; descripcion: string;
  horizonte_meses: [number, number]; probabilidad: number | null; probabilidad_nota: string; incertidumbre: string;
  fuentes: string[]; fecha: string; zona: string;
};
export type DatosEscenarios = {
  id: string; zona: string; emitido_en: string; horizonte_meses: [number, number]; escenarios: EscenarioClimatico[];
  plan_respuesta: { accion: string; href: string; relacion: string; orientacion?: string }[]; resumen: string; proveedor_ia: string;
  aviso: string; fuentes: Record<string, { fuente?: string; url?: string; licencia?: string; consultado_en?: string; estado?: string; mensaje?: string; serie?: Record<string, Record<string, number>>; periodos?: { temporada: string; probabilidades: { la_nina_pct: number; neutral_pct: number; el_nino_pct: number } }[] }>;
};
export type EscenariosResult = { estado: "ok"; data: DatosEscenarios; actualizando: boolean } | { estado: "calculando" } | { estado: "sin_endpoint" } | { estado: "error"; mensaje: string };

export const getEscenariosClimaticos = cache(async (est: string): Promise<EscenariosResult> => {
  try {
    const r = await api<{ data: DatosEscenarios | null; meta: { estado: string } }>(`/establecimientos/${est}/clima/escenarios`, { timeoutMs: 10_000 });
    if (!r.data) return { estado: "calculando" };
    return { estado: "ok", data: r.data, actualizando: r.meta.estado === "actualizando" };
  } catch (e) {
    if (e instanceof ApiError && e.routeMissing) return { estado: "sin_endpoint" };
    if (e instanceof ApiError && e.status === 202) return { estado: "calculando" };
    if (e instanceof ApiError) return { estado: "error", mensaje: e.unreachable ? "No pudimos conectar con TROPILLA." : e.message };
    throw e;
  }
});
