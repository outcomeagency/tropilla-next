"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { getToken } from "./session";
import type { One, S } from "./schemas";

/** Server Actions de la gobernanza del tablero agregado (TPA-75). Solo equipo: la API devuelve 404 a cualquier otro. */
export interface AgregadosState {
  error?: string;
  fields?: Record<string, string>;
  ok?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function sesion() {
  if (!(await getToken())) redirect("/ingresar?next=/datos/gobernanza");
}

function error(e: unknown, fallback: string): AgregadosState {
  if (e instanceof ApiError) {
    if (e.status === 422) {
      const fields = Object.fromEntries(Object.entries(e.errors ?? {}).map(([k, v]) => [k.replace(/\.\d+$/, ""), v[0] ?? ""]));
      return { fields, error: Object.keys(fields).length ? "Revisá los datos marcados." : e.message };
    }
    if (e.code === "conflicto_row_version") return { error: "Otra persona cambió esta licencia mientras la editabas. Recargá y volvé a intentar." };
    if (e.status === 404) return { error: "Esta acción es solo para el equipo de TROPILLA." };
    if (e.unreachable) return { error: "No pudimos conectar con TROPILLA. Probá de nuevo." };
    return { error: e.message };
  }
  return { error: fallback };
}

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const entero = (fd: FormData, k: string) => Number.parseInt(texto(fd, k), 10);

export async function nuevaPoliticaAction(_prev: AgregadosState, fd: FormData): Promise<AgregadosState> {
  await sesion();
  const body = {
    k_minimo: entero(fd, "k_minimo"),
    dominancia_max_pct: entero(fd, "dominancia_max_pct"),
    redondeo_cabezas: entero(fd, "redondeo_cabezas"),
    consultas_por_dia: entero(fd, "consultas_por_dia"),
    desglose_escala: fd.get("desglose_escala") === "on",
    nota: texto(fd, "nota"),
  };
  if (body.nota.length < 10) return { fields: { nota: "Contá en al menos 10 caracteres por qué cambia la política." } };
  try {
    const r = await api<One<S<"AgregadosPolitica">>>("/agregados/politicas", { method: "POST", body });
    revalidatePath("/datos/gobernanza");
    return { ok: `Política v${r.data.version} vigente. El gate vuelve a pendiente hasta revisarla.` };
  } catch (e) {
    return error(e, "No pudimos guardar la política.");
  }
}

export async function ejecutarPruebaAction(): Promise<void> {
  await sesion();
  let id = "";
  try {
    id = (await api<One<S<"AgregadosPrueba">>>("/agregados/pruebas", { method: "POST", timeoutMs: 30_000 })).data.id;
  } catch {
    redirect("/datos/gobernanza?error=prueba");
  }
  revalidatePath("/datos/gobernanza");
  redirect(`/datos/gobernanza?prueba=${id}`);
}

export async function revisarAspectoAction(_prev: AgregadosState, fd: FormData): Promise<AgregadosState> {
  await sesion();
  const body = { aspecto: texto(fd, "aspecto"), resultado: texto(fd, "resultado") === "observado" ? "observado" : "aprobado", nota: texto(fd, "nota") };
  if (body.nota.length < 10) return { fields: { nota: "Dejá constancia de qué revisaste (al menos 10 caracteres)." } };
  try {
    await api("/agregados/revisiones", { method: "POST", body });
    revalidatePath("/datos/gobernanza");
    return { ok: body.resultado === "aprobado" ? "Aspecto aprobado." : "Observación registrada." };
  } catch (e) {
    if (e instanceof ApiError && e.code === "prueba_pendiente") return { error: "Primero corré la prueba de reidentificación y verificá que salga aprobada con la política vigente." };
    return error(e, "No pudimos registrar la revisión.");
  }
}

export async function crearLicenciaAction(_prev: AgregadosState, fd: FormData): Promise<AgregadosState> {
  await sesion();
  const cupo = texto(fd, "consultas_por_dia");
  const body = {
    nombre: texto(fd, "nombre"),
    tipo: texto(fd, "tipo"),
    finalidad: texto(fd, "finalidad"),
    contrato_version: texto(fd, "contrato_version"),
    vigente_hasta: texto(fd, "vigente_hasta") || null,
    consultas_por_dia: cupo ? Number.parseInt(cupo, 10) : null,
    metricas: fd.getAll("metricas").map(String),
  };
  if (!body.metricas.length) return { fields: { metricas: "Elegí al menos una métrica." } };
  try {
    await api("/agregados/clientes", { method: "POST", body });
    revalidatePath("/datos/licencias");
    return { ok: `Licencia de ${body.nombre} creada. Sumá a sus integrantes por email.` };
  } catch (e) {
    return error(e, "No pudimos crear la licencia.");
  }
}

export async function cambiarLicenciaAction(_prev: AgregadosState, fd: FormData): Promise<AgregadosState> {
  await sesion();
  const id = texto(fd, "cliente");
  if (!UUID.test(id)) return { error: "Licencia inválida." };
  const body: Record<string, unknown> = { row_version: entero(fd, "row_version") };
  if (fd.has("estado")) body.estado = texto(fd, "estado") === "suspendido" ? "suspendido" : "activo";
  if (fd.has("metricas_editadas")) {
    body.metricas = fd.getAll("metricas").map(String);
    if (!(body.metricas as string[]).length) return { fields: { metricas: "Elegí al menos una métrica." } };
  }
  if (fd.has("vigente_hasta")) body.vigente_hasta = texto(fd, "vigente_hasta") || null;
  if (fd.has("consultas_por_dia")) body.consultas_por_dia = texto(fd, "consultas_por_dia") ? entero(fd, "consultas_por_dia") : null;
  try {
    await api(`/agregados/clientes/${id}`, { method: "PATCH", body });
    revalidatePath("/datos/licencias");
    return { ok: "Licencia actualizada." };
  } catch (e) {
    return error(e, "No pudimos actualizar la licencia.");
  }
}

export async function agregarIntegranteAction(_prev: AgregadosState, fd: FormData): Promise<AgregadosState> {
  await sesion();
  const id = texto(fd, "cliente");
  if (!UUID.test(id)) return { error: "Licencia inválida." };
  try {
    await api(`/agregados/clientes/${id}/miembros`, { method: "POST", body: { email: texto(fd, "email") } });
    revalidatePath("/datos/licencias");
    return { ok: "Integrante sumado. Ya puede consultar el tablero con esta licencia." };
  } catch (e) {
    return error(e, "No pudimos sumar al integrante.");
  }
}

export async function quitarIntegranteAction(fd: FormData): Promise<void> {
  await sesion();
  const id = texto(fd, "cliente");
  const usuario = texto(fd, "usuario");
  if (UUID.test(id) && UUID.test(usuario)) {
    await api(`/agregados/clientes/${id}/miembros/${usuario}`, { method: "DELETE" }).catch(() => undefined);
  }
  revalidatePath("/datos/licencias");
}
