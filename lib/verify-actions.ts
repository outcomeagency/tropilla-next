"use server";

import { api, ApiError } from "./api";
import { hasLocale } from "./i18n";
import type { One, S } from "./schemas";

export type FileVerifyResult = { ok: true; data: S<"VerificacionArchivo">; demo: boolean } | { ok: false };

/**
 * Compara la huella SHA-256 calculada en el navegador con las versiones
 * registradas (GET /public/verificaciones/archivo/{sha256}). El archivo nunca sale del navegador.
 */
export async function verificarArchivoAction(sha256: string, locale: string): Promise<FileVerifyResult> {
  if (!/^[a-f0-9]{64}$/.test(sha256)) return { ok: false };
  const loc = hasLocale(locale) ? locale : "es";
  try {
    const res = await api<One<S<"VerificacionArchivo">>>(`/public/verificaciones/archivo/${sha256}?locale=${loc}`, { auth: false, locale: loc });
    return { ok: true, data: res.data, demo: false };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { ok: true, data: { coincide: false, documento: null }, demo: false };
    return { ok: false };
  }
}
