"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { decimal, estadoDeError, fdStr, isFecha, postEvento, uuidv7, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

const PROPOSITOS = ["cria", "recria", "engorde", "reproductores", "venta", "descarte"];

/** Conteo por categoría desde inputs `c_<CODIGO>` (sólo enteros > 0). */
function conteoDe(fd: FormData): { conteo: Record<string, number>; invalido: boolean } {
  const conteo: Record<string, number> = {};
  let invalido = false;
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("c_")) continue;
    const s = String(v).trim();
    if (!s) continue;
    if (!/^\d{1,6}$/.test(s)) {
      invalido = true;
      continue;
    }
    const n = Number(s);
    if (n > 0) conteo[k.slice(2)] = n;
  }
  return { conteo, invalido };
}

const total = (c: Record<string, number>) => Object.values(c).reduce((s, n) => s + n, 0);

function volver(id: string, ok: string, n: string, extra = ""): never {
  revalidatePath("/hacienda/lotes");
  revalidatePath("/hacienda");
  redirect(`/hacienda/lotes/${id}?ok=${ok}&n=${n}${extra}`);
}

/**
 * Crear o editar un lote (TPA-20). Al crear, puede llevar el conteo inicial
 * (alta de existencia sobre el lote) y el potrero (traslado): son eventos, no
 * campos, así quedan en la historia del lote con autor y huella.
 */
export async function guardarLoteAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite crear ni editar lotes." };
  const est = ctx.activa.establecimiento_id;
  const id = fdStr(fd, "id");
  const fields: Record<string, string> = {};

  const nombre = fdStr(fd, "nombre");
  if (!nombre) fields.nombre = "Poné un nombre que todos reconozcan (ej. «Vientres Murrah»).";
  else if (nombre.length > 80) fields.nombre = "Hasta 80 caracteres.";
  const especie = fdStr(fd, "especie");
  if (!id && especie !== "BOV" && especie !== "BUB") fields.especie = "Elegí la especie: un lote no mezcla especies.";
  const proposito = fdStr(fd, "proposito");
  if (proposito && !PROPOSITOS.includes(proposito)) fields.proposito = "Elegí un propósito de la lista.";
  const anonimo = fd.get("anonimo") === "1";

  const { conteo, invalido } = conteoDe(fd);
  if (invalido) fields.conteo = "Usá números enteros de cabezas.";
  const potrero = fdStr(fd, "potrero_id");
  const fecha = fdStr(fd, "ocurrido_en");
  if (!id && (total(conteo) > 0 || potrero) && !isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha del conteo.";
  if (Object.keys(fields).length) return { fields, error: "Revisá los datos marcados." };

  const body: S<"LoteInput"> = { nombre, proposito: proposito || null, anonimo, notas: fdStr(fd, "notas") || null };

  if (id) {
    try {
      await api(`/establecimientos/${est}/lotes/${id}`, { method: "PATCH", body: { ...body, row_version: fdStr(fd, "row_version") } });
    } catch (e) {
      return estadoDeError(e, {}, "No pudimos guardar el lote. Probá de nuevo.");
    }
    volver(id, "editado", fdStr(fd, "idem") || uuidv7());
  }

  let loteId = fdStr(fd, "idem") || uuidv7();
  try {
    const res = await api<One<S<"Lote">>>(`/establecimientos/${est}/lotes`, { method: "POST", body: { ...body, id: loteId, especie: especie as "BOV" | "BUB" } });
    loteId = res.data.id ?? loteId;
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos crear el lote. Probá de nuevo.");
  }

  // El lote ya existe: si un evento inicial falla, se avisa en la ficha (no se pierde el lote).
  let pendiente = "";
  if (total(conteo) > 0) {
    try {
      await postEvento(est, {
        id: fdStr(fd, "idem_alta") || undefined,
        tipo: "hacienda.alta",
        sujetos: { tipo: "lote", lote_id: loteId, conteo },
        payload: { motivo: "inventario_inicial" },
        ocurrido_en: fecha,
        confirmar_advertencias: true,
      });
    } catch {
      pendiente = "conteo";
    }
  }
  if (potrero && !pendiente) {
    try {
      await postEvento(est, {
        id: fdStr(fd, "idem_traslado") || undefined,
        tipo: "hacienda.traslado",
        sujetos: { tipo: "lote", lote_id: loteId },
        payload: { potrero_destino_id: potrero },
        ocurrido_en: fecha,
        confirmar_advertencias: true,
      });
    } catch {
      pendiente = "potrero";
    }
  }
  volver(loteId, pendiente ? `creado_sin_${pendiente}` : "creado", uuidv7());
}

/** Archivar (nunca borrar): sólo sin cabezas; su historia queda. */
export async function archivarLoteAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite archivar lotes." };
  const motivo = fdStr(fd, "motivo");
  if (!motivo) return { fields: { motivo: "Contá por qué se archiva (ej. «se vendió completo»)." } };
  if (motivo.length > 500) return { fields: { motivo: "Hasta 500 caracteres." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/lotes/${fdStr(fd, "id")}/archivar`, { method: "POST", body: { motivo } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos archivar el lote.");
  }
  revalidatePath("/hacienda/lotes");
  redirect("/hacienda/lotes?ok=archivado");
}

const BAJA_MOTIVOS = ["venta", "traslado_externo", "otro"];

/**
 * Eventos grupales sobre el lote (TPA-20): traslado de potrero, sumar cabezas
 * (alta por conteo), pesaje promedio y bajas por conteo (muerte o salida).
 * El servidor arma sobre, huella y cadena; las advertencias piden «Guardar igual».
 */
export async function eventoLoteAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("hacienda.crear")) return { error: "Tu rol no permite cargar eventos." };
  const est = ctx.activa.establecimiento_id;
  const loteId = fdStr(fd, "lote_id");
  const op = fdStr(fd, "op");
  const fecha = fdStr(fd, "ocurrido_en");
  const fields: Record<string, string> = {};
  if (!isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha.";

  let tipo = "";
  let sujetos: S<"EventoInput">["sujetos"] = { tipo: "lote", lote_id: loteId };
  let payload: Record<string, unknown> = {};

  if (op === "traslado") {
    const destino = fdStr(fd, "potrero_destino_id");
    if (!destino) fields.potrero_destino_id = "Elegí el potrero de destino.";
    tipo = "hacienda.traslado";
    payload = { potrero_destino_id: destino, ...(fdStr(fd, "potrero_origen_id") ? { potrero_origen_id: fdStr(fd, "potrero_origen_id") } : {}) };
  } else if (op === "alta" || op === "baja") {
    const { conteo, invalido } = conteoDe(fd);
    if (invalido) fields.conteo = "Usá números enteros de cabezas.";
    else if (!total(conteo)) fields.conteo = op === "alta" ? "Cargá cuántas cabezas suman, al menos en una categoría." : "Cargá cuántas cabezas salen, al menos en una categoría.";
    if (op === "baja" && !fields.conteo) {
      const pasadas = Object.entries(conteo).filter(([c, n]) => n > Number(fdStr(fd, `d_${c}`) || "0"));
      if (pasadas.length) fields.conteo = "No pueden salir más cabezas de las que tiene el lote en esa categoría.";
    }
    sujetos = { tipo: "lote", lote_id: loteId, conteo };
    if (op === "alta") {
      tipo = "hacienda.alta";
      payload = { motivo: "alta_rapida" };
    } else if (fdStr(fd, "baja") === "muerte") {
      const causa = fdStr(fd, "causa");
      if (!causa) fields.causa = "Elegí la causa.";
      tipo = "hacienda.muerte";
      payload = { causa, ...(causa === "otra" && fdStr(fd, "causa_otra") ? { causa_otra: fdStr(fd, "causa_otra").slice(0, 120) } : {}) };
    } else {
      const motivo = fdStr(fd, "motivo");
      if (!BAJA_MOTIVOS.includes(motivo)) fields.motivo = "Elegí el motivo de la salida.";
      tipo = "hacienda.egreso";
      payload = { motivo, ...(fdStr(fd, "comprador") ? { comprador: fdStr(fd, "comprador").slice(0, 120) } : {}) };
    }
  } else if (op === "pesaje") {
    const peso = decimal(fdStr(fd, "peso_kg"));
    if (!peso || Number(peso) <= 0) fields.peso_kg = "Cargá el peso promedio en kg (ej. 412,5).";
    const cant = fdStr(fd, "cantidad");
    if (!/^\d{1,6}$/.test(cant) || Number(cant) < 1) fields.cantidad = "¿Cuántas cabezas se pesaron?";
    const metodo = fdStr(fd, "metodo");
    if (!["balanza", "cinta", "estimado"].includes(metodo)) fields.metodo = "Elegí cómo se pesó.";
    tipo = "hacienda.pesaje";
    payload = { modo: "promedio", peso_kg: peso, cantidad: Number(cant), metodo, desbaste: fd.get("desbaste") === "on" };
  } else {
    return { error: "Acción desconocida." };
  }
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  const idem = fdStr(fd, "idem") || uuidv7();
  try {
    await postEvento(est, {
      id: idem,
      tipo,
      sujetos,
      payload,
      ocurrido_en: fecha,
      observaciones: fdStr(fd, "observaciones") || null,
      confirmar_advertencias: fd.get("confirmar") === "1",
    });
  } catch (e) {
    return estadoDeError(e, { "sujetos.conteo": "conteo", "payload.potrero_destino_id": "potrero_destino_id" }, "No pudimos registrar el evento. Probá de nuevo.");
  }
  volver(loteId, op === "baja" ? (tipo === "hacienda.muerte" ? "muerte" : "egreso") : op, idem);
}

/**
 * Individualizar desde un lote anónimo: cada cabeza que se caravanea nace del
 * lote (resta del conteo) y hereda su historia grupal (vacunas, pesajes, traslados).
 */
export async function individualizarAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("hacienda.crear")) return { error: "Tu rol no permite cargar eventos." };
  const est = ctx.activa.establecimiento_id;
  const loteId = fdStr(fd, "lote_id");
  const especie = fdStr(fd, "especie");
  const categoria = fdStr(fd, "categoria");
  const sexo = fdStr(fd, "sexo");
  const fecha = fdStr(fd, "ocurrido_en");
  const disponibles = Number(fdStr(fd, "disponibles") || "0");
  const caravanas = fd.getAll("caravana").map((v) => String(v).trim());
  const fields: Record<string, string> = {};

  if (!categoria) fields.categoria = "Elegí la categoría.";
  if (sexo !== "M" && sexo !== "H") fields.sexo = "Elegí el sexo.";
  if (!isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha.";
  if (!caravanas.length) fields.caravanas = "Agregá al menos un animal.";
  else if (disponibles && caravanas.length > disponibles) fields.caravanas = `El lote tiene ${disponibles} cabezas de esa categoría.`;
  const llenas = caravanas.filter(Boolean);
  if (llenas.some((c) => c.length > 64)) fields.caravanas = "Cada caravana, hasta 64 caracteres.";
  else if (new Set(llenas.map((c) => c.toUpperCase())).size !== llenas.length) fields.caravanas = "Hay caravanas repetidas.";
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  const raza = fdStr(fd, "raza");
  const colocada = fecha;
  const animales = caravanas.map((c, i) => ({
    animal_id: fdStr(fd, `aid_${i}`) || uuidv7(),
    especie,
    sexo,
    categoria,
    ...(raza ? { raza } : {}),
    ...(c ? { identificaciones: [{ tipo: "caravana_visual", valor: c, colocada_en: colocada }] } : {}),
  }));

  const idem = fdStr(fd, "idem") || uuidv7();
  try {
    await postEvento(est, {
      id: idem,
      tipo: "hacienda.individualizacion",
      sujetos: { tipo: "lote", lote_id: loteId, conteo: { [categoria]: animales.length } },
      payload: { animales },
      ocurrido_en: fecha,
      observaciones: fdStr(fd, "observaciones") || null,
      confirmar_advertencias: fd.get("confirmar") === "1",
    });
  } catch (e) {
    return estadoDeError(e, { "payload.animales": "caravanas" }, "No pudimos individualizar. Probá de nuevo.");
  }
  volver(loteId, "individualizado", idem, `&cant=${animales.length}`);
}
