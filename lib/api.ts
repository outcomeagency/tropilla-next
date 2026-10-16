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
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** false para endpoints públicos (login, portal). */
  auth?: boolean;
  /** Corta la espera para no colgar el render si la API no responde. */
  timeoutMs?: number;
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
  const { method = "GET", body, auth = true, timeoutMs = 10_000 } = opts;
  const isForm = body instanceof FormData;

  const headers: Record<string, string> = { Accept: "application/json" };
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
    const payload = (data ?? {}) as { message?: string; errors?: Record<string, string[]> };
    throw new ApiError(res.status, payload.message ?? "La API devolvió un error.", payload.errors);
  }
  return data as T;
}
