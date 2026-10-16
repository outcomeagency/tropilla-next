"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError, query } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, fdStr, isFecha, postEvento, type EventoActionState } from "./eventos-api";
import { hoyAR } from "./format";
import { MOTIVOS_RETIRO, TIPOS_IDENTIFICACION, TIPOS_REGISTRO, tipoIdentLabel } from "./identificaciones";
import type { Many, S } from "./schemas";

export interface IdentificacionState extends EventoActionState {
  /** 409 identificacion_duplicada: el animal que ya la tiene vigente («Abrir ficha»). */
  duplicado?: { id: string; nombre: string; categoria?: string };
}

const CAMPOS = {
  "payload.identificacion.valor": "valor",
  "payload.identificacion.entidad": "entidad",
  "payload.identificacion.tipo_registro": "tipo_registro",
  "payload.identificacion.colocada_en": "fecha",
  "payload.identificacion.tipo": "tipo",
  ocurrido_en: "fecha",
};

/**
 * Colocación, reposición o retiro de una identificación (evento
 * `hacienda.identificacion`, TPA-19). La reposición deja la anterior como no
 * vigente: el historial no se pierde. El motivo viaja en `observaciones`.
 */
export async function identificacionAction(_prev: IdentificacionState, fd: FormData): Promise<IdentificacionState> {
  const ctx = await requireContexto();
  if (!ctx.can("hacienda.crear")) return { error: "Tu rol no permite cargar identificaciones." };
  const est = ctx.activa.establecimiento_id;
  const animalId = fdStr(fd, "animal_id");
  const accion = fdStr(fd, "accion");
  const tipo = fdStr(fd, "tipo");
  const valor = fdStr(fd, "valor").replace(/\s+/g, " ");
  const fecha = fdStr(fd, "fecha");
  const reemplaza = fdStr(fd, "reemplaza_valor") ? { tipo: fdStr(fd, "reemplaza_tipo"), valor: fdStr(fd, "reemplaza_valor") } : null;
  const motivo = fdStr(fd, "motivo");

  const fields: Record<string, string> = {};
  if (!animalId || !["colocacion", "reposicion", "retiro"].includes(accion)) return { error: "No pudimos identificar el animal. Recargá la página." };
  if (!TIPOS_IDENTIFICACION.some((t) => t.k === tipo)) fields.tipo = "Elegí el tipo de identificación.";
  if (!valor) fields.valor = "Cargá el número o la marca.";
  else if (valor.length > 64) fields.valor = "Máximo 64 caracteres.";
  else if (tipo === "rfid" && accion !== "retiro" && !/^\d{15}$/.test(valor.replace(/\s/g, ""))) fields.valor = "El RFID tiene 15 dígitos (sólo números).";
  if (tipo === "registro_genealogico" && accion !== "retiro") {
    if (!fdStr(fd, "entidad")) fields.entidad = "Indicá la entidad (AACB, SRA…).";
    const tr = fdStr(fd, "tipo_registro");
    if (tr && !(TIPOS_REGISTRO as readonly string[]).includes(tr)) fields.tipo_registro = "Tipo de registro inválido.";
  }
  if (!isFecha(fecha)) fields.fecha = "Indicá la fecha.";
  else if (fecha > hoyAR(new Date())) fields.fecha = "La fecha no puede ser futura.";
  if (accion !== "colocacion" && !motivo) fields.motivo = "Elegí el motivo.";
  if (motivo === "otro" && !fdStr(fd, "motivo_otro")) fields.motivo_otro = "Contá brevemente el motivo.";
  if (accion === "reposicion" && !reemplaza) return { error: "Falta la identificación que se reemplaza. Recargá la página." };
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  const identificacion: Record<string, string> = { tipo, valor };
  if (accion !== "retiro") {
    identificacion.colocada_en = fecha;
    if (tipo === "registro_genealogico") {
      identificacion.entidad = fdStr(fd, "entidad");
      if (fdStr(fd, "tipo_registro")) identificacion.tipo_registro = fdStr(fd, "tipo_registro");
    }
  }
  const motivoTxt = motivo ? (motivo === "otro" ? fdStr(fd, "motivo_otro") : MOTIVOS_RETIRO.find((m) => m.k === motivo)?.l) : "";
  const obs = [motivoTxt ? `Motivo: ${motivoTxt}.` : "", fdStr(fd, "observaciones")].filter(Boolean).join(" ");

  try {
    await postEvento(est, {
      id: fdStr(fd, "idem") || undefined,
      tipo: "hacienda.identificacion",
      sujetos: { tipo: "animales", animal_ids: [animalId] },
      payload: { accion, identificacion, ...(reemplaza && accion === "reposicion" ? { reemplaza } : {}) },
      ocurrido_en: fecha,
      observaciones: obs || null,
      confirmar_advertencias: fd.get("confirmar") === "1",
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === "identificacion_duplicada") {
      const duplicado = await quienLaTiene(est, tipo, valor, animalId);
      return {
        error: `${tipoIdentLabel(tipo)} ${valor} ya está vigente en otro animal de este establecimiento.`,
        fields: { valor: "Ya está en uso." },
        duplicado,
      };
    }
    return estadoDeError(e, CAMPOS);
  }
  revalidatePath(`/hacienda/${animalId}`);
  revalidatePath("/hacienda");
  const msg = accion === "retiro" ? `${tipoIdentLabel(tipo)} ${valor} retirada.` : accion === "reposicion" ? `${tipoIdentLabel(tipo)} repuesta: ahora ${valor}.` : `${tipoIdentLabel(tipo)} ${valor} agregada.`;
  return { ok: { mensaje: msg } };
}

/** Busca el animal que ya tiene vigente esa identificación (GET …/animales/identificador). */
async function quienLaTiene(est: string, tipo: string, valor: string, excepto: string): Promise<IdentificacionState["duplicado"]> {
  try {
    const r = await api<Many<S<"AnimalResumen">>>(`/establecimientos/${est}/animales/identificador${query({ valor, tipo })}`);
    const a = r.data.find((x) => x.id !== excepto);
    if (!a?.id) return undefined;
    return { id: a.id, nombre: a.identificacion_principal ?? "Sin caravana", categoria: a.categoria_nombre ?? a.categoria };
  } catch {
    return undefined;
  }
}
