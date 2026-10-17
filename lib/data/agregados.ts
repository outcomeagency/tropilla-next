import "server-only";
import { redirect } from "next/navigation";
import { api as apiBase, ApiError, query } from "@/lib/api";
import type { Many, One, S } from "@/lib/schemas";

/** Tablero agregado (TPA-75). Fuente única: dataset sintético; toda consulta descuenta cupo y queda auditada. */
export type Contexto = S<"AgregadosContexto">;
export type Tablero = S<"AgregadosTablero">;
export type Gobernanza = S<"AgregadosGobernanza">;
export type Licencia = S<"AgregadosLicencia">;
export type Cliente = S<"AgregadosCliente">;
export type Prueba = S<"AgregadosPrueba">;
export type Consulta = S<"AgregadosConsulta">;
export type Metrica = "existencias" | "cobertura_sanitaria" | "precios";

export interface ParametrosTablero {
  cliente?: string;
  metrica: string;
  especie: string;
  geo?: string;
  escala?: boolean;
  desde?: string;
  hasta?: string;
}

/** Token vencido o revocado → cerrar sesión (la cookie la borra /salir). */
async function api<T>(path: string, opts?: Parameters<typeof apiBase>[1]): Promise<T> {
  try {
    return await apiBase<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && e.unauthorized) redirect("/salir");
    throw e;
  }
}

export function queryTablero(p: ParametrosTablero): string {
  return query({ cliente: p.cliente, metrica: p.metrica, especie: p.especie, geo: p.geo, escala: p.escala ? 1 : undefined, desde: p.desde, hasta: p.hasta });
}

export async function getContextoAgregados(): Promise<Contexto> {
  return (await api<One<Contexto>>("/agregados/contexto")).data;
}

/** Consulta el cubo. Los rechazos de licencia/cupo vuelven como mensaje para mostrarlos en la página. */
export async function getTablero(p: ParametrosTablero): Promise<{ data: Tablero } | { error: string; code?: string }> {
  try {
    return { data: (await api<One<Tablero>>(`/agregados/tablero${queryTablero(p)}`)).data };
  } catch (e) {
    if (e instanceof ApiError && [403, 404, 422, 429].includes(e.status)) {
      return { error: e.status === 404 ? "No encontramos esa licencia entre las tuyas." : e.message, code: e.code };
    }
    throw e;
  }
}

export async function getConsultas(cliente?: string, cursor?: string) {
  return api<Many<Consulta>>(`/agregados/consultas${query({ cliente, cursor, limit: 50 })}`);
}

export async function getGobernanza(): Promise<Gobernanza | null> {
  try {
    return (await api<One<Gobernanza>>("/agregados/gobernanza")).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getPrueba(id: string): Promise<Prueba> {
  return (await api<One<Prueba>>(`/agregados/pruebas/${encodeURIComponent(id)}`)).data;
}

export async function getClientes(): Promise<Cliente[] | null> {
  try {
    return (await api<Many<Cliente>>("/agregados/clientes")).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getMiembros(cliente: string) {
  return (await api<Many<{ usuario: { id: string; nombre: string; email: string }; desde: string }>>(`/agregados/clientes/${cliente}/miembros`)).data;
}
