import "server-only";
import { cookies } from "next/headers";
import { api, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

export type Importacion = S<"Importacion"> & { id: string; estado: NonNullable<S<"Importacion">["estado"]> };
export type ImportacionFila = S<"ImportacionFila">;

/** Cookie con la última planilla sin confirmar (`<establecimiento>:<importacion>`): retomar la revisión. */
export const IMPORTACION_COOKIE = "tropilla_imp";

/** Tope de filas que se traen para la previsualización (la API pagina de a 100). */
export const MAX_FILAS = 3000;

const base = (est: string, id: string) => `/establecimientos/${est}/importaciones/${id}`;

export function getImportacion(est: string, id: string) {
  return api<One<Importacion>>(base(est, id)).then((r) => r.data);
}

/** Todas las filas de la planilla (recorre el cursor). La tabla filtra y pagina del lado del cliente. */
export async function listFilas(est: string, id: string): Promise<{ filas: ImportacionFila[]; truncada: boolean }> {
  const filas: ImportacionFila[] = [];
  let cursor: string | undefined;
  do {
    const r = await api<Many<ImportacionFila>>(`${base(est, id)}/filas${query({ limit: 100, cursor })}`);
    filas.push(...r.data);
    cursor = r.meta?.next_cursor ?? undefined;
  } while (cursor && filas.length < MAX_FILAS);
  return { filas, truncada: !!cursor };
}

/** Importación pendiente de este establecimiento (si la cookie apunta a una). */
export async function importacionPendienteId(est: string): Promise<string | null> {
  const v = (await cookies()).get(IMPORTACION_COOKIE)?.value ?? "";
  const [e, id] = v.split(":");
  return e === est && id ? id : null;
}
