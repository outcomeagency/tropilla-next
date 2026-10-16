"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { estadoDeError, fdStr, isFecha, uuidv7, type EventoActionState } from "./eventos-api";
import { ddmmAMmdd } from "./plan-sanitario";
import { TIPOS_PRODUCTO, VIAS } from "./sanidad";

const en = (lista: readonly (readonly [string, string])[], v: string) => lista.some(([c]) => c === v);

function dias(fd: FormData, k: string, fields: Record<string, string>): number | null {
  const s = fdStr(fd, k);
  if (!s) return null;
  if (!/^\d{1,3}$/.test(s)) {
    fields[k] = "Días enteros, de 0 a 999.";
    return null;
  }
  return Number(s);
}

/** Alta o edición de un producto del catálogo del establecimiento (TPA-31). La dosis es texto declarado: TROPILLA no prescribe. */
export async function guardarProductoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite editar el catálogo de productos." };
  const est = ctx.activa.establecimiento_id;
  const id = fdStr(fd, "id");
  const fields: Record<string, string> = {};

  const nombre = fdStr(fd, "nombre_comercial").slice(0, 120);
  if (nombre.length < 2) fields.nombre_comercial = "Escribí el nombre como figura en el envase.";
  const tipo = fdStr(fd, "tipo");
  if (!en(TIPOS_PRODUCTO, tipo)) fields.tipo = "Elegí el tipo de producto.";
  const via = fdStr(fd, "via");
  if (via && !en(VIAS, via)) fields.via = "Elegí la vía.";
  const carne = dias(fd, "retiro_carne_dias", fields);
  const leche = dias(fd, "retiro_leche_dias", fields);
  const especies = fd.getAll("especies").map(String).filter((e) => e === "BOV" || e === "BUB");
  if (!especies.length) fields.especies = "Elegí al menos una especie.";
  const enfermedades = [...new Set(fd.getAll("enfermedades").map(String).filter(Boolean))];

  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  const body = {
    nombre_comercial: nombre,
    principio_activo: fdStr(fd, "principio_activo").slice(0, 120) || null,
    tipo,
    via: via || null,
    dosis_declarada: fdStr(fd, "dosis_declarada").slice(0, 200) || null,
    retiro_carne_dias: carne,
    retiro_leche_dias: leche,
    especies,
    enfermedades,
    notas: fdStr(fd, "notas").slice(0, 2000) || null,
  };

  try {
    if (id) {
      await api(`/establecimientos/${est}/productos-sanitarios/${id}`, { method: "PATCH", body: { ...body, row_version: Number(fdStr(fd, "row_version") || "1") } });
    } else {
      await api(`/establecimientos/${est}/productos-sanitarios`, {
        method: "POST",
        body: { ...body, id: fdStr(fd, "idem") || uuidv7(), sugerido_codigo: fdStr(fd, "sugerido_codigo") || null },
      });
    }
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el producto.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: id ? `Guardamos los cambios de ${nombre}.` : `${nombre} quedó en tu catálogo.` } };
}

/** Archivar con motivo: deja de ofrecerse al registrar; lo aplicado queda en la historia. */
export async function archivarProductoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return { error: "Tu rol no permite archivar productos." };
  const motivo = fdStr(fd, "motivo").slice(0, 500);
  if (!motivo) return { fields: { motivo: "Contá por qué (ej. «se dejó de usar», «cambio de marca»)." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/productos-sanitarios/${fdStr(fd, "id")}/archivar`, { method: "POST", body: { motivo } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos archivar el producto.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: "Producto archivado. Lo ya aplicado sigue en la historia." } };
}

/* ───────────── Plan sanitario (TPA-33) ───────────── */

/** Aplica plantillas al plan. La API exige aceptar el aviso «Validá este plan con tu veterinario». */
export async function aplicarPlantillasAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("plan.editar")) return { error: "Tu rol no permite editar el plan sanitario." };
  const plantillas = [...new Set(fd.getAll("plantillas").map(String).filter(Boolean))];
  if (!plantillas.length) return { fields: { plantillas: "Elegí al menos una plantilla." }, error: "Elegí al menos una plantilla." };
  if (fd.get("aviso_aceptado") !== "on") return { fields: { aviso_aceptado: "Para seguir, confirmá que lo vas a validar con tu veterinario." }, error: "Falta confirmar el aviso veterinario." };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/plan-sanitario/plantillas`, { method: "POST", body: { plantillas, aviso_aceptado: true } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos aplicar las plantillas.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: `Sumamos ${plantillas.length} ${plantillas.length === 1 ? "plantilla" : "plantillas"} al plan. Revisá fechas y productos con tu veterinario.` } };
}

const TIPOS_EVENTO_PLAN = ["sanidad.vacunacion", "sanidad.desparasitacion", "sanidad.tratamiento", "sanidad.prueba_diagnostica", "sanidad.analisis_laboratorio"];

/** Disparador desde el formulario (fecha fija, ventana por fechas o meses, relativo, periódico, manual). */
function disparadorDe(fd: FormData, fields: Record<string, string>, previo?: Record<string, unknown>) {
  const tipo = fdStr(fd, "disparador_tipo");
  const base = { ...(previo ?? {}), tipo } as Record<string, unknown>;
  const ddmm = (k: string) => {
    const v = ddmmAMmdd(fdStr(fd, k));
    if (!v) fields[k] = "Día/mes, por ejemplo 01/03.";
    return v ?? undefined;
  };
  const entero = (k: string, min = 1, max = 3650) => {
    const v = fdStr(fd, k);
    if (!/^\d{1,4}$/.test(v) || Number(v) < min || Number(v) > max) {
      fields[k] = "Un número de días.";
      return undefined;
    }
    return Number(v);
  };
  switch (tipo) {
    case "fecha_fija":
      return { ...base, fecha: ddmm("fecha"), desde: undefined, hasta: undefined, meses: undefined };
    case "ventana": {
      const meses = fd.getAll("meses").map(Number).filter((m) => m >= 1 && m <= 12);
      if (fdStr(fd, "ventana_modo") === "meses") {
        if (!meses.length) fields.meses = "Elegí al menos un mes.";
        return { ...base, meses, desde: undefined, hasta: undefined };
      }
      return { ...base, desde: ddmm("desde"), hasta: ddmm("hasta"), meses: undefined };
    }
    case "relativo":
      return { ...base, evento: base.evento ?? "nacimiento", dias: base.semanas ? undefined : entero("dias", 0) };
    case "periodico":
      return { ...base, cada_dias: entero("cada_dias") };
    case "manual":
      return base;
    default:
      fields.disparador_tipo = "Elegí cuándo se hace.";
      return base;
  }
}

/** Editar un ítem del plan (fechas, producto, nombre, activo) o crear uno manual. Todo editable: es una sugerencia. */
export async function guardarItemPlanAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("plan.editar")) return { error: "Tu rol no permite editar el plan sanitario." };
  const est = ctx.activa.establecimiento_id;
  const id = fdStr(fd, "id");
  const fields: Record<string, string> = {};
  const nombre = fdStr(fd, "nombre").slice(0, 200);
  if (nombre.length < 2) fields.nombre = "Poné un nombre (ej. «Carbunclo a los terneros»).";
  let previo: Record<string, unknown> | undefined;
  try {
    previo = JSON.parse(fdStr(fd, "disparador_previo") || "null") ?? undefined;
  } catch {
    previo = undefined;
  }
  const disparador = disparadorDe(fd, fields, previo);
  const body: Record<string, unknown> = {
    nombre,
    disparador: Object.fromEntries(Object.entries(disparador).filter(([, v]) => v !== undefined)),
    producto_id: fdStr(fd, "producto_id") || null,
    activo: fd.get("activo") === "on",
  };
  if (!id) {
    const tipoEvento = fdStr(fd, "tipo_evento");
    if (!TIPOS_EVENTO_PLAN.includes(tipoEvento)) fields.tipo_evento = "Elegí qué se hace.";
    const especie = fdStr(fd, "especie");
    Object.assign(body, {
      id: fdStr(fd, "idem") || uuidv7(),
      tipo_evento: tipoEvento,
      enfermedad: fdStr(fd, "enfermedad") || null,
      especie: especie === "BOV" || especie === "BUB" ? especie : null,
      alcance: { categorias: [] },
      activo: true,
    });
  } else {
    body.row_version = Number(fdStr(fd, "row_version") || "1");
  }
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };
  try {
    await api(`/establecimientos/${est}/plan-sanitario/items${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", body });
  } catch (e) {
    return estadoDeError(e, { "disparador.fecha": "fecha", "disparador.desde": "desde", "disparador.hasta": "hasta" }, "No pudimos guardar el ítem del plan.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: id ? `Guardamos «${nombre}». Las tareas pendientes se recalculan con las fechas nuevas.` : `«${nombre}» quedó en el plan.` } };
}

export async function archivarItemPlanAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("plan.editar")) return { error: "Tu rol no permite editar el plan sanitario." };
  const motivo = fdStr(fd, "motivo").slice(0, 500);
  if (!motivo) return { fields: { motivo: "Contá por qué se saca del plan." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/plan-sanitario/items/${fdStr(fd, "id")}/archivar`, { method: "POST", body: { motivo } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos sacar el ítem del plan.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: "Ítem archivado: deja de generar tareas." } };
}

/* ───────────── Tareas ───────────── */

export async function omitirTareaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("tareas.gestionar")) return { error: "Tu rol no permite gestionar tareas." };
  const motivo = fdStr(fd, "motivo").slice(0, 500);
  if (!motivo) return { fields: { motivo: "Contá por qué no se hace (ej. «la hizo el vacunador de FUCOSA»)." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/tareas/${fdStr(fd, "id")}/omitir`, { method: "POST", body: { motivo } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos omitir la tarea.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: "Tarea omitida con su motivo." } };
}

export async function reprogramarTareaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("tareas.gestionar")) return { error: "Tu rol no permite gestionar tareas." };
  const desde = fdStr(fd, "fecha_desde");
  const vence = fdStr(fd, "vence_en");
  const fields: Record<string, string> = {};
  if (desde && !isFecha(desde)) fields.fecha_desde = "Fecha inválida.";
  if (!isFecha(vence)) fields.vence_en = "Indicá hasta cuándo.";
  else if (desde && desde > vence) fields.vence_en = "Tiene que ser posterior al inicio.";
  if (Object.keys(fields).length) return { fields, error: Object.values(fields)[0] };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/tareas/${fdStr(fd, "id")}`, {
      method: "PATCH",
      body: { fecha_desde: desde || null, fecha_hasta: vence, vence_en: vence, row_version: Number(fdStr(fd, "row_version") || "1") },
    });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos reprogramar la tarea.");
  }
  revalidatePath("/sanidad", "layout");
  return { ok: { mensaje: "Tarea reprogramada." } };
}
