"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, fdStr, isFecha, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

/** Server Actions del matching de camiones jaula (TPA-73): pedidos del productor y mesa del concierge (staff). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ITEM = /^[a-z_]{1,40}$/;

const intOpt = (fd: FormData, k: string) => {
  const s = fdStr(fd, k).replace(/\./g, "");
  return s === "" ? null : Number.parseInt(s, 10);
};
const numOpt = (fd: FormData, k: string) => {
  const s = fdStr(fd, k).replace(/\./g, "").replace(",", ".");
  return s === "" ? null : Number(s);
};
const txt = (fd: FormData, k: string, max: number) => fdStr(fd, k).slice(0, max) || null;

async function productor(ability: "fletes.gestionar" | "fletes.ver" = "fletes.gestionar") {
  const ctx = await requireContexto();
  if (!ctx.can(ability)) return null;
  return ctx.activa.establecimiento_id;
}

async function staff() {
  const ctx = await requireContexto();
  return ctx.me.usuario.es_staff ? ctx : null;
}

/* ───────────── Productor ───────────── */

export async function pedirFleteAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const est = await productor();
  if (!est) return { error: "Tu rol no permite pedir fletes en este establecimiento." };
  const body = {
    origen_departamento_codigo: fdStr(fd, "origen_departamento_codigo") || null,
    destino_provincia_codigo: fdStr(fd, "destino_provincia_codigo"),
    destino_localidad: fdStr(fd, "destino_localidad").slice(0, 120),
    motivo: fdStr(fd, "motivo"),
    fecha_desde: fdStr(fd, "fecha_desde"),
    fecha_hasta: fdStr(fd, "fecha_hasta"),
    especie_codigo: fdStr(fd, "especie_codigo"),
    categoria: txt(fd, "categoria", 80),
    cabezas: intOpt(fd, "cabezas"),
    kg_promedio: intOpt(fd, "kg_promedio"),
    jaula_preferida: fdStr(fd, "jaula_preferida") || null,
    observaciones: txt(fd, "observaciones", 1000),
    telefono_contacto: fdStr(fd, "telefono_contacto"),
    consentimiento: fd.get("consentimiento") === "1",
  };
  if (!isFecha(body.fecha_desde) || !isFecha(body.fecha_hasta)) return { fields: { fecha_desde: "Elegí las fechas." }, error: "Elegí las fechas." };
  let id = "";
  try {
    id = (await api<One<S<"FletePedido">>>(`/establecimientos/${est}/fletes/pedidos`, { method: "POST", body })).data.id;
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos enviar el pedido.");
  }
  revalidatePath("/fletes");
  redirect(`/fletes/${id}`);
}

async function accionPedido(fd: FormData, ruta: (est: string, pedido: string) => string, body: Record<string, unknown>, fallback: string, mensaje: string): Promise<EventoActionState> {
  const est = await productor();
  const pedido = fdStr(fd, "pedido");
  if (!est) return { error: "Tu rol no permite gestionar fletes en este establecimiento." };
  if (!UUID.test(pedido)) return { error: "Pedido inválido." };
  try {
    await api(ruta(est, pedido), { method: "POST", body });
  } catch (e) {
    return estadoDeError(e, {}, fallback);
  }
  revalidatePath(`/fletes/${pedido}`);
  revalidatePath("/fletes");
  return { ok: { mensaje } };
}

export async function aceptarPropuestaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const propuesta = fdStr(fd, "propuesta");
  if (!UUID.test(propuesta)) return { error: "Propuesta inválida." };
  return accionPedido(fd, (e, p) => `/establecimientos/${e}/fletes/pedidos/${p}/propuestas/${propuesta}/aceptar`, {}, "No pudimos aceptar la propuesta.", "Propuesta aceptada.");
}

export async function rechazarPropuestaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const propuesta = fdStr(fd, "propuesta");
  if (!UUID.test(propuesta)) return { error: "Propuesta inválida." };
  return accionPedido(
    fd,
    (e, p) => `/establecimientos/${e}/fletes/pedidos/${p}/propuestas/${propuesta}/rechazar`,
    { motivo: fdStr(fd, "motivo"), detalle: txt(fd, "detalle", 300) },
    "No pudimos rechazar la propuesta.",
    "Propuesta rechazada.",
  );
}

export async function cancelarPedidoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  return accionPedido(fd, (e, p) => `/establecimientos/${e}/fletes/pedidos/${p}/cancelar`, { motivo: txt(fd, "motivo", 300) }, "No pudimos cancelar el pedido.", "Pedido cancelado.");
}

function cuerpoResultado(fd: FormData) {
  return { resultado: fdStr(fd, "resultado"), costo: numOpt(fd, "costo"), km: intOpt(fd, "km"), nota: txt(fd, "nota", 500) };
}

export async function resultadoPedidoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  return accionPedido(fd, (e, p) => `/establecimientos/${e}/fletes/pedidos/${p}/resultado`, cuerpoResultado(fd), "No pudimos registrar el resultado.", "Resultado registrado.");
}

export async function checklistFleteAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const est = await productor();
  const pedido = fdStr(fd, "pedido");
  const item = fdStr(fd, "item");
  if (!est) return { error: "Tu rol no permite editar el checklist." };
  if (!UUID.test(pedido) || !ITEM.test(item)) return { error: "Ítem inválido." };
  try {
    await api(`/establecimientos/${est}/fletes/pedidos/${pedido}/checklist/${item}`, { method: "PUT", body: { estado: fdStr(fd, "estado") || "pendiente", nota: txt(fd, "nota", 500) } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el ítem.");
  }
  revalidatePath(`/fletes/${pedido}`);
  return { ok: { mensaje: "Guardado." } };
}

/* ───────────── Concierge (staff) ───────────── */

const SIN_STAFF: EventoActionState = { error: "La mesa de fletes es del equipo de TROPILLA." };

async function conciergePost(path: string, body: Record<string, unknown>, fallback: string, mensaje: string, revalidar: string[], method: "POST" | "PUT" | "PATCH" = "POST"): Promise<EventoActionState> {
  if (!(await staff())) return SIN_STAFF;
  try {
    await api(`/fletes/concierge${path}`, { method, body });
  } catch (e) {
    return estadoDeError(e, {}, fallback);
  }
  for (const r of revalidar) revalidatePath(r);
  return { ok: { mensaje } };
}

export async function tomarPedidoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const pedido = fdStr(fd, "pedido");
  if (!UUID.test(pedido)) return { error: "Pedido inválido." };
  return conciergePost(`/pedidos/${pedido}/tomar`, {}, "No pudimos tomar el pedido.", "Pedido en gestión.", [`/fletes/concierge/pedidos/${pedido}`, "/fletes/concierge"]);
}

export async function proponerAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const pedido = fdStr(fd, "pedido");
  if (!UUID.test(pedido)) return { error: "Pedido inválido." };
  const body = {
    transportista_id: fdStr(fd, "transportista_id"),
    disponibilidad_id: fdStr(fd, "disponibilidad_id") || null,
    fecha_propuesta: fdStr(fd, "fecha_propuesta"),
    tarifa_estimada: numOpt(fd, "tarifa_estimada"),
    nota: txt(fd, "nota", 500),
  };
  return conciergePost(`/pedidos/${pedido}/propuestas`, body, "No pudimos enviar la propuesta.", "Propuesta enviada al productor.", [`/fletes/concierge/pedidos/${pedido}`, "/fletes/concierge"]);
}

export async function retirarPropuestaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const propuesta = fdStr(fd, "propuesta");
  const pedido = fdStr(fd, "pedido");
  if (!UUID.test(propuesta) || !UUID.test(pedido)) return { error: "Propuesta inválida." };
  return conciergePost(`/propuestas/${propuesta}/retirar`, { motivo: txt(fd, "motivo", 300) }, "No pudimos retirar la propuesta.", "Propuesta retirada.", [`/fletes/concierge/pedidos/${pedido}`]);
}

export async function resultadoConciergeAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const pedido = fdStr(fd, "pedido");
  if (!UUID.test(pedido)) return { error: "Pedido inválido." };
  return conciergePost(`/pedidos/${pedido}/resultado`, cuerpoResultado(fd), "No pudimos registrar el resultado.", "Resultado registrado.", [`/fletes/concierge/pedidos/${pedido}`, "/fletes/concierge"]);
}

export async function crearTransportistaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  if (!(await staff())) return SIN_STAFF;
  const body = {
    nombre: fdStr(fd, "nombre"),
    cuit: fdStr(fd, "cuit") || null,
    contacto_nombre: fdStr(fd, "contacto_nombre"),
    telefono: fdStr(fd, "telefono"),
    email: fdStr(fd, "email") || null,
    base_departamento_codigo: fdStr(fd, "base_departamento_codigo"),
    notas: txt(fd, "notas", 1000),
    consentimiento: fd.get("consentimiento") === "1",
  };
  let id = "";
  try {
    id = (await api<One<S<"FleteTransportista">>>("/fletes/concierge/transportistas", { method: "POST", body })).data.id;
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos dar de alta al transportista.");
  }
  revalidatePath("/fletes/concierge/transportistas");
  redirect(`/fletes/concierge/transportistas/${id}`);
}

export async function activoTransportistaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const t = fdStr(fd, "transportista");
  if (!UUID.test(t)) return { error: "Transportista inválido." };
  const activo = fdStr(fd, "activo") === "1";
  return conciergePost(`/transportistas/${t}`, { activo }, "No pudimos guardar.", activo ? "Transportista activo." : "Transportista inactivo.", [`/fletes/concierge/transportistas/${t}`, "/fletes/concierge/transportistas"], "PATCH");
}

export async function documentoTransportistaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const t = fdStr(fd, "transportista");
  const item = fdStr(fd, "item");
  if (!UUID.test(t) || !ITEM.test(item)) return { error: "Documento inválido." };
  const body = { estado: fdStr(fd, "estado"), metodo: fdStr(fd, "metodo") || null, vence_el: fdStr(fd, "vence_el") || null, nota: txt(fd, "nota", 500) };
  return conciergePost(`/transportistas/${t}/documentos/${item}`, body, "No pudimos guardar la verificación.", "Verificación guardada.", [`/fletes/concierge/transportistas/${t}`], "PUT");
}

export async function crearDisponibilidadAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const t = fdStr(fd, "transportista");
  if (!UUID.test(t)) return { error: "Transportista inválido." };
  const especies = fd.getAll("especies").map(String).filter((e) => e === "BOV" || e === "BUB");
  const body = {
    origen_departamento_codigo: fdStr(fd, "origen_departamento_codigo"),
    destino_provincia_codigo: fdStr(fd, "destino_provincia_codigo") || null,
    desde: fdStr(fd, "desde"),
    hasta: fdStr(fd, "hasta"),
    jaula: fdStr(fd, "jaula"),
    capacidad_cabezas: intOpt(fd, "capacidad_cabezas"),
    especies: especies.length ? especies : undefined,
    es_retorno: fd.get("es_retorno") === "1",
    tarifa_km: numOpt(fd, "tarifa_km"),
    notas: txt(fd, "notas", 500),
  };
  return conciergePost(`/transportistas/${t}/disponibilidades`, body, "No pudimos cargar la disponibilidad.", "Disponibilidad cargada.", [`/fletes/concierge/transportistas/${t}`, "/fletes/concierge"]);
}

export async function cerrarDisponibilidadAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const d = fdStr(fd, "disponibilidad");
  const t = fdStr(fd, "transportista");
  if (!UUID.test(d) || !UUID.test(t)) return { error: "Disponibilidad inválida." };
  return conciergePost(`/disponibilidades/${d}/cerrar`, {}, "No pudimos cerrar la disponibilidad.", "Disponibilidad cerrada.", [`/fletes/concierge/transportistas/${t}`]);
}
