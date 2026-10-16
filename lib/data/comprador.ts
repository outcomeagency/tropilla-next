import "server-only";
import { api, ApiError, query } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import type { Many, One, S } from "@/lib/schemas";

/** Perfil de comprador de la sesión (cuenta liviana, TPA-57). */
export async function getComprador(me: S<"Me">) {
  if (me.comprador) return { data: me.comprador, source: "api" as const };
  try { return { data: (await api<One<S<"Comprador">>>("/me/comprador")).data, source: "api" as const }; }
  catch (e) { if (e instanceof ApiError && e.status === 404) return { data: null, source: "api" as const }; throw e; }
}

/**
 * Contrato publicado. El precio especial sólo viene con sesión de comprador
 * (excepción explícita a la privacidad de precios, functional/01 §10 quater).
 */
export async function getContratoPublico(codigo: string, locale: Locale) {
  const me = await getSesionOpcional();
  const comprador = me ? (await getComprador(me)).data : null;
  try {
    const data = (await api<One<S<"ContratoPublico">>>(`/public/contratos/${encodeURIComponent(codigo)}${query({ locale })}`, { auth: !!me, locale })).data;
    return { data, me, comprador, source: "api" as const };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getMisTomas() {
  const data = (await api<Many<S<"Toma">>>("/comprador/tomas?limit=100")).data;
  return { data: data.map((toma) => ({ toma, contrato: toma.contrato as S<"ContratoPublico"> | undefined })), source: "api" as const };
}
