import "server-only";
import { getToken } from "./session";

/**
 * Cliente de la API de TROPILLA. Sólo corre en el servidor (Server Components,
 * Server Actions, Route Handlers): el token Sanctum sale de la cookie httpOnly
 * y nunca llega al navegador.
 */
export const API_URL = (process.env.TROPILLA_API_URL ?? "http://localhost:8090/api/v1").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
    /** `code` estable del contrato (api-v1 §3): validacion, sin_permiso, no_encontrado… */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** La API no respondió (caída, red, timeout). */
  get unreachable(): boolean {
    return this.status === 0;
  }

  get unauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * El endpoint (todavía) no existe en la API: 404/405. La API responde
   * `no_encontrado` igual para una ruta inexistente que para un recurso ajeno,
   * así que los detalles por id/slug sólo caen a mock si el id es de ejemplo
   * (ver lib/mock/fallback.ts); los listados de un establecimiento propio sí.
   */
  get routeMissing(): boolean {
    return this.status === 404 || this.status === 405;
  }

  /** Mensaje del primer error de un campo (422 validacion). */
  field(name: string): string | undefined {
    return this.errors?.[name]?.[0];
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** false para endpoints públicos (login, portal). */
  auth?: boolean;
  /** Corta la espera para no colgar el render si la API no responde. */
  timeoutMs?: number;
  /** Idioma de los textos traducidos (catálogos, leyenda, mensajes). */
  locale?: string;
  /** Headers extra (Idempotency-Key, etc.). */
  headers?: Record<string, string>;
}

/** Query string de un listado; ignora valores vacíos. */
export function query(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, timeoutMs = 10_000, locale, headers: extra } = opts;
  const isForm = body instanceof FormData;

  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (locale) headers["Accept-Language"] = locale;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError(0, "No pudimos conectar con TROPILLA.");
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = (data ?? {}) as { message?: string; errors?: Record<string, string[]>; code?: string };
    throw new ApiError(res.status, payload.message ?? "La API devolvió un error.", payload.errors, payload.code);
  }
  return data as T;
}
