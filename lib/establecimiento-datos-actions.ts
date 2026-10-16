"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { decimal, estadoDeError, fdStr, isFecha, postEvento, type EventoActionState } from "./eventos-api";
import type { S } from "./schemas";

const GARRAPATA = ["erradicacion", "control", "libre"] as const;

/**
 * Guardar datos del establecimiento, zonas sanitarias y ubicación (TPA-13), y
 * del productor si el rol puede ver privados. Concurrencia optimista por
 * `row_version` (409 → mensaje claro, nunca pisar lo de otro).
 */
export async function guardarEstablecimientoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("establecimiento.editar")) return { error: "Tu rol no permite editar los datos del establecimiento." };
  const est = ctx.activa.establecimiento_id;

  const fields: Record<string, string> = {};
  const nombre = fdStr(fd, "nombre");
  if (!nombre) fields.nombre = "Poné el nombre del establecimiento.";
  const sup = decimal(fdStr(fd, "superficie_ha"));
  if (sup === null) fields.superficie_ha = "Usá sólo números (ej. 2400 o 2400,5).";
  const especies = fd.getAll("especies").map(String).filter((e) => e === "BOV" || e === "BUB") as Array<"BOV" | "BUB">;
  if (!especies.length) fields.especies = "Marcá al menos una especie.";
  const actividades = fd.getAll("actividades").map(String);
  if (!actividades.length) fields.actividades = "Marcá al menos una actividad.";
  const provincia = fdStr(fd, "provincia_codigo");
  const departamento = fdStr(fd, "departamento_codigo");
  if (!provincia) fields.provincia_codigo = "Elegí la provincia.";
  if (!departamento || !departamento.startsWith(provincia)) fields.departamento_codigo = "Elegí el departamento.";

  const lat = decimalSigned(fdStr(fd, "lat"));
  const lon = decimalSigned(fdStr(fd, "lon"));
  const conUbicacion = ctx.can("establecimiento.ver_privados");
  if (conUbicacion && (lat === null || lon === null || (lat === undefined) !== (lon === undefined))) fields.lat = "Marcá el punto en el mapa o completá latitud y longitud.";
  if (lat && (Number(lat) < -56 || Number(lat) > -21)) fields.lat = "La latitud no corresponde a la Argentina.";
  if (lon && (Number(lon) < -74 || Number(lon) > -53)) fields.lat = "La longitud no corresponde a la Argentina.";

  const garrapata = fdStr(fd, "garrapata");
  if (garrapata && !GARRAPATA.includes(garrapata as (typeof GARRAPATA)[number])) fields.garrapata = "Elegí una zona de garrapata.";
  if (Object.keys(fields).length) return { fields, error: "Revisá los datos marcados." };

  const body: S<"EstablecimientoInput"> = {
    nombre,
    provincia_codigo: provincia,
    departamento_codigo: departamento,
    localidad: fdStr(fd, "localidad") || null,
    superficie_ha: sup ?? null,
    especies,
    actividades,
    instalaciones: fd.getAll("instalaciones").map(String),
    historia: fdStr(fd, "historia") || null,
    zonas_sanitarias: {
      aftosa_zona: fdStr(fd, "aftosa_zona") || null,
      garrapata: (garrapata || null) as S<"ZonasSanitarias">["garrapata"],
      rabia_endemica: fd.get("rabia_endemica") === "on",
      fasciola_endemica: fd.get("fasciola_endemica") === "on",
    },
    row_version: fdStr(fd, "row_version"),
  };
  if (conUbicacion) {
    body.renspa = fdStr(fd, "renspa") || null;
    body.ubicacion = lat && lon ? { lat, lon } : null;
  }

  try {
    await api(`/establecimientos/${est}`, { method: "PATCH", body });
  } catch (e) {
    return estadoDeError(e, { "zonas_sanitarias.garrapata": "garrapata", "ubicacion.lat": "lat", "ubicacion.lon": "lat" }, "No pudimos guardar los datos. Probá de nuevo.");
  }

  // Productor (razón social, CUIT, contacto): sólo quien ve privados.
  const productorId = fdStr(fd, "productor_id");
  if (productorId && conUbicacion && fdStr(fd, "productor_row_version")) {
    const pbody: S<"ProductorInput"> = {
      nombre: fdStr(fd, "productor_nombre"),
      cuit: fdStr(fd, "cuit").replace(/\D/g, "") || null,
      contacto: {
        email: fdStr(fd, "contacto_email") || null,
        telefono: fdStr(fd, "contacto_telefono") || null,
        whatsapp: fdStr(fd, "contacto_whatsapp") || null,
      },
      row_version: Number(fdStr(fd, "productor_row_version")),
    };
    try {
      await api(`/productores/${productorId}`, { method: "PATCH", body: pbody });
    } catch (e) {
      const st = estadoDeError(e, { nombre: "productor_nombre", cuit: "cuit" }, "Guardamos el establecimiento, pero no los datos del productor.");
      return { ...st, error: `Guardamos el establecimiento, pero no los datos del productor: ${st.error ?? ""}` };
    }
  }

  revalidatePath("/establecimiento");
  redirect("/establecimiento?ok=datos");
}

/** Interdicción sanitaria declarada (evento `establecimiento.interdiccion`). */
export async function interdiccionAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("establecimiento_eventos.crear")) return { error: "Tu rol no permite registrar interdicciones." };
  const motivo = fdStr(fd, "motivo");
  const inicio = fdStr(fd, "inicio");
  const fields: Record<string, string> = {};
  if (motivo !== "rabia" && motivo !== "otra") fields.motivo = "Elegí el motivo.";
  if (motivo === "otra" && !fdStr(fd, "motivo_otro")) fields.motivo_otro = "Contá brevemente el motivo.";
  if (!isFecha(inicio)) fields.inicio = "Indicá desde cuándo rige.";
  const estimado = fdStr(fd, "levantamiento_estimado");
  if (estimado && !isFecha(estimado)) fields.levantamiento_estimado = "Fecha inválida.";
  if (estimado && estimado < inicio) fields.levantamiento_estimado = "Tiene que ser posterior al inicio.";
  if (Object.keys(fields).length) return { fields };

  const payload: Record<string, string> = { motivo, inicio };
  if (motivo === "otra") payload.motivo_otro = fdStr(fd, "motivo_otro");
  if (estimado) payload.levantamiento_estimado = estimado;
  try {
    await postEvento(ctx.activa.establecimiento_id, {
      id: fdStr(fd, "idem") || undefined,
      tipo: "establecimiento.interdiccion",
      sujetos: { tipo: "establecimiento" },
      payload,
      ocurrido_en: inicio,
      observaciones: fdStr(fd, "observaciones") || null,
      confirmar_advertencias: fd.get("confirmar") === "1",
    });
  } catch (e) {
    return estadoDeError(e);
  }
  revalidatePath("/establecimiento");
  return { ok: { mensaje: "Interdicción registrada." } };
}

export async function levantarInterdiccionAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("establecimiento_eventos.crear")) return { error: "Tu rol no permite levantar interdicciones." };
  const eventoId = fdStr(fd, "interdiccion_evento_id");
  const fecha = fdStr(fd, "fecha");
  if (!isFecha(fecha)) return { fields: { fecha: "Indicá la fecha del levantamiento." } };
  try {
    await postEvento(ctx.activa.establecimiento_id, {
      id: fdStr(fd, "idem") || undefined,
      tipo: "establecimiento.levantamiento_interdiccion",
      sujetos: { tipo: "establecimiento" },
      payload: { interdiccion_evento_id: eventoId, fecha },
      ocurrido_en: fecha,
      confirmar_advertencias: fd.get("confirmar") === "1",
    });
  } catch (e) {
    return estadoDeError(e);
  }
  revalidatePath("/establecimiento");
  return { ok: { mensaje: "Interdicción levantada." } };
}

/** «-27,7512» → «-27.7512». */
function decimalSigned(s: string): string | undefined | null {
  const t = s.replace(/\s/g, "").replace(",", ".");
  if (!t) return undefined;
  if (!/^-?\d{1,3}(\.\d{1,8})?$/.test(t)) return null;
  // Decimal canónico (api-v1 §5): sin ceros sobrantes.
  return t.includes(".") ? t.replace(/0+$/, "").replace(/\.$/, "") : t;
}
