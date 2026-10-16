"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { getCatalogos } from "./data/catalogos";
import { getEvento } from "./data/eventos";
import { camposEditables, escribir } from "./correccion";
import { decimal, estadoDeError, fdStr, isFecha, uuidv7, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

/** Ability para corregir según el módulo del tipo (api-v1 §6: `<modulo>.corregir`). */
function abilityDe(tipo: string) {
  const m = tipo.split(".")[0];
  return m === "establecimiento" ? "establecimiento_eventos.crear" : `${m}.corregir`;
}

function motivoValido(fd: FormData, fields: Record<string, string>) {
  const motivo = fdStr(fd, "motivo");
  if (motivo.length < 5) fields.motivo = "Contá por qué (al menos unas palabras): queda en la historia.";
  else if (motivo.length > 500) fields.motivo = "Hasta 500 caracteres.";
  return motivo;
}

/**
 * Corregir un evento (TPA-26): versión nueva con motivo obligatorio. Se parte
 * del payload vigente (lo que no se edita acá —animales, crías— se conserva
 * tal cual) y se aplican los campos corregidos según el JSON Schema del tipo.
 */
export async function corregirEventoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  const id = fdStr(fd, "evento_id");
  let vigente: S<"Evento">;
  try {
    vigente = (await getEvento(est, id)).evento ?? {};
  } catch (e) {
    return estadoDeError(e, {}, "No encontramos el evento.");
  }
  const tipo = vigente.tipo ?? "";
  if (!ctx.can(abilityDe(tipo))) return { error: "Tu rol no permite corregir este tipo de evento." };

  const fields: Record<string, string> = {};
  const motivo = motivoValido(fd, fields);
  const fecha = fdStr(fd, "ocurrido_en");
  if (!isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha.";

  const cat = await getCatalogos();
  const campos = camposEditables(cat.tiposEvento.find((t) => t.codigo === tipo)?.schema);
  const payload = structuredClone(vigente.payload ?? {}) as Record<string, unknown>;
  for (const c of campos) {
    const raw = fdStr(fd, `p:${c.path}`);
    if (c.kind === "bool") {
      escribir(payload, c.path, fd.get(`p:${c.path}`) === "on");
      continue;
    }
    if (!raw) {
      if (c.requerido) fields[`p:${c.path}`] = "Este dato es obligatorio.";
      else escribir(payload, c.path, undefined);
      continue;
    }
    if (c.kind === "decimal") {
      const d = decimal(raw);
      if (!d) fields[`p:${c.path}`] = "Un número (ej. 412,5).";
      else escribir(payload, c.path, d);
    } else if (c.kind === "int") {
      if (!/^\d{1,6}$/.test(raw)) fields[`p:${c.path}`] = "Un número entero.";
      else escribir(payload, c.path, Number(raw));
    } else if (c.kind === "fecha") {
      if (!isFecha(raw)) fields[`p:${c.path}`] = "Fecha inválida.";
      else escribir(payload, c.path, raw);
    } else if (c.kind === "enum" && c.opciones && !c.opciones.some(([v]) => v === raw)) {
      fields[`p:${c.path}`] = "Elegí una opción de la lista.";
    } else {
      escribir(payload, c.path, raw.slice(0, c.kind === "textarea" ? 2000 : 120));
    }
  }
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  let nuevo: S<"Evento">;
  try {
    const r = await api<One<S<"Evento">>>(`/establecimientos/${est}/eventos/${id}/correcciones`, {
      method: "POST",
      body: {
        id: fdStr(fd, "idem") || uuidv7(),
        payload,
        ocurrido_en: fecha,
        observaciones: fdStr(fd, "observaciones").slice(0, 2000) || null,
        motivo,
        confirmar_advertencias: fd.get("confirmar") === "1",
      },
    });
    nuevo = r.data;
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar la corrección. Probá de nuevo.");
  }
  revalidatePath("/hacienda", "layout");
  redirect(`/hacienda/eventos/${nuevo.id ?? id}?ok=corregido`);
}

/** Anular un evento con motivo: queda tachado en la historia y se recalculan los derivados. */
export async function anularEventoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  const tipo = fdStr(fd, "tipo");
  if (!ctx.can(abilityDe(tipo))) return { error: "Tu rol no permite anular este tipo de evento." };
  const fields: Record<string, string> = {};
  const motivo = motivoValido(fd, fields);
  if (Object.keys(fields).length) return { fields, error: fields.motivo };
  const id = fdStr(fd, "evento_id");
  let nuevo: S<"Evento">;
  try {
    const r = await api<One<S<"Evento">>>(`/establecimientos/${ctx.activa.establecimiento_id}/eventos/${id}/anulaciones`, {
      method: "POST",
      body: { id: fdStr(fd, "idem") || uuidv7(), motivo },
    });
    nuevo = r.data;
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos anular el evento. Probá de nuevo.");
  }
  revalidatePath("/hacienda", "layout");
  redirect(`/hacienda/eventos/${nuevo.id ?? id}?ok=anulado`);
}
