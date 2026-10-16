import "server-only";
import { ApiError } from "@/lib/api";

/**
 * ⚠ ADAPTADOR DE DATOS DE EJEMPLO ⚠
 *
 * La API (tropilla-api) se construye en paralelo: si un endpoint todavía no
 * existe (404/405) o la API no responde, las pantallas muestran datos
 * de ejemplo de `lib/mock/*` y lo avisan con <MockNotice>. Nunca se usa para
 * tapar un error real (401, 403, 422). Un detalle por id/slug sólo cae a mock
 * si el id pertenece a los datos de ejemplo (`withMockIf`).
 *
 * Se apaga con TROPILLA_MOCK_FALLBACK=0 (default: encendido fuera de producción).
 */
export const MOCK_ENABLED =
  process.env.TROPILLA_MOCK_FALLBACK != null
    ? process.env.TROPILLA_MOCK_FALLBACK === "1"
    : process.env.NODE_ENV !== "production";

export type Source = "api" | "mock";
export interface Sourced<T> {
  data: T;
  source: Source;
}

/** ¿Este error justifica caer a datos de ejemplo? */
export function isMockable(e: unknown): boolean {
  return MOCK_ENABLED && e instanceof ApiError && (e.unreachable || e.routeMissing);
}

/** Intenta la API; si el endpoint no existe o no responde, devuelve el mock marcado. */
export async function withMock<T>(load: () => Promise<T>, mock: () => T): Promise<Sourced<T>> {
  try {
    return { data: await load(), source: "api" };
  } catch (e) {
    if (isMockable(e)) return { data: mock(), source: "mock" };
    throw e;
  }
}

/** Igual que withMock, pero el mock puede no existir (detalle por id/slug ajeno → null). */
export async function withMockIf<T>(load: () => Promise<T>, mock: () => T | null): Promise<Sourced<T> | null> {
  try {
    return { data: await load(), source: "api" };
  } catch (e) {
    if (isMockable(e)) {
      const m = mock();
      return m == null ? null : { data: m, source: "mock" };
    }
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
