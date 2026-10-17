"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "./api";
import { requireContexto } from "./establecimiento";
import { decimal, estadoDeError, fdOpt, fdStr, type EventoActionState } from "./eventos-api";
import type { One, S } from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function revalidarCampos() {
  revalidatePath("/campos", "layout");
}

/** Arma el CampoAvisoInput desde el formulario del aviso. */
function avisoDesdeForm(fd: FormData): { body?: S<"CampoAvisoInput">; fields?: Record<string, string> } {
  const fields: Record<string, string> = {};
  const capacidad = Number(fdStr(fd, "capacidad_cabezas"));
  const superficie = decimal(fdStr(fd, "superficie_ha"));
  const unidad = fdStr(fd, "precio_unidad") as S<"CampoAvisoInput">["precio_unidad"];
  const valor = unidad === "a_convenir" ? null : decimal(fdStr(fd, "precio_valor"));
  const plazo = fdStr(fd, "plazo_minimo_meses");
  if (fdStr(fd, "titulo").length < 5) fields.titulo = "Poné un título de al menos 5 caracteres.";
  if (!Number.isInteger(capacidad) || capacidad < 1) fields.capacidad_cabezas = "Indicá cuántas cabezas recibe el campo.";
  if (superficie === null) fields.superficie_ha = "Usá solo números (por ejemplo, 450 o 450,5).";
  if (valor === null) fields.precio_valor = "Usá solo números (por ejemplo, 9500).";
  if (unidad !== "a_convenir" && valor === undefined) fields.precio_valor = "Indicá el valor o elegí «a convenir».";
  if (!fd.getAll("especies").length) fields.especies = "Elegí al menos una especie.";
  if (Object.keys(fields).length) return { fields };
  return {
    body: {
      titulo: fdStr(fd, "titulo"),
      descripcion: fdOpt(fd, "descripcion") ?? null,
      modalidad: fdStr(fd, "modalidad") as S<"CampoAvisoInput">["modalidad"],
      especies: fd.getAll("especies").map(String),
      categorias: fd.getAll("categorias").map(String),
      capacidad_cabezas: capacidad,
      superficie_ha: superficie ?? null,
      temporada_desde: fdStr(fd, "temporada_desde"),
      temporada_hasta: fdOpt(fd, "temporada_hasta") ?? null,
      plazo_minimo_meses: plazo ? Number(plazo) : null,
      precio_unidad: unidad,
      precio_valor: valor ?? null,
      condiciones: fdOpt(fd, "condiciones") ?? null,
      agua: fd.getAll("agua").map(String) as S<"CampoAvisoInput">["agua"],
      alambrado: (fdOpt(fd, "alambrado") ?? null) as S<"CampoAvisoInput">["alambrado"],
      instalaciones: fd.getAll("instalaciones").map(String) as S<"CampoAvisoInput">["instalaciones"],
      accesos: fdOpt(fd, "accesos") ?? null,
      provincia_codigo: fdStr(fd, "provincia_codigo"),
      departamento_codigo: fdStr(fd, "departamento_codigo"),
      localidad: fdOpt(fd, "localidad") ?? null,
      mostrar_localidad: fd.get("mostrar_localidad") === "1",
    },
  };
}

/** Crea o edita el aviso; con `despues=publicar` lo publica a continuación. */
export async function guardarAvisoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("campos.gestionar")) return { error: "Publicar campos lo hacen el dueño o la administración." };
  const est = ctx.activa.establecimiento_id;
  const { body, fields } = avisoDesdeForm(fd);
  if (!body) return { fields, error: "Revisá los datos marcados." };
  const id = fdStr(fd, "id");
  let avisoId = id;
  try {
    if (id) {
      if (!UUID.test(id)) return { error: "Aviso inválido." };
      await api(`/establecimientos/${est}/campos/avisos/${id}`, { method: "PATCH", body: { ...body, row_version: Number(fdStr(fd, "row_version")) } });
    } else {
      avisoId = (await api<One<S<"CampoAviso">>>(`/establecimientos/${est}/campos/avisos`, { method: "POST", body })).data.id;
    }
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el aviso.");
  }
  let publicado = false;
  if (fd.get("despues") === "publicar") {
    try {
      await api(`/establecimientos/${est}/campos/avisos/${avisoId}/publicar`, { method: "POST" });
      publicado = true;
    } catch (e) {
      revalidarCampos();
      const st = estadoDeError(e, {}, "Guardamos el aviso, pero no pudimos publicarlo.");
      if (!id) redirect(`/campos/mis-avisos/${avisoId}?error=${encodeURIComponent(st.error ?? "")}`);
      return st;
    }
  }
  revalidarCampos();
  if (!id) redirect(`/campos/mis-avisos/${avisoId}?ok=${publicado ? "publicado" : "creado"}`);
  return { ok: { mensaje: publicado ? "Aviso guardado y publicado." : "Cambios guardados." } };
}

export async function estadoAvisoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("campos.gestionar")) return { error: "Tu rol no puede cambiar el estado del aviso." };
  const id = fdStr(fd, "id");
  const accion = fdStr(fd, "accion");
  if (!UUID.test(id) || !["publicar", "pausar", "cerrar"].includes(accion)) return { error: "Acción inválida." };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/campos/avisos/${id}/${accion}`, {
      method: "POST",
      body: accion === "cerrar" ? { motivo: fdStr(fd, "motivo") } : {},
    });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos cambiar el estado del aviso.");
  }
  revalidarCampos();
  return { ok: { mensaje: accion === "publicar" ? "Aviso publicado." : accion === "pausar" ? "Aviso pausado: no aparece en el mercado." : "Aviso cerrado." } };
}

export async function consultarCampoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("campos.consultar")) return { error: "Consultar campos lo hacen el dueño o la administración." };
  const aviso = fdStr(fd, "aviso");
  if (!UUID.test(aviso)) return { error: "Aviso inválido." };
  const cabezas = Number(fdStr(fd, "cabezas"));
  const fields: Record<string, string> = {};
  if (fdStr(fd, "mensaje").length < 10) fields.mensaje = "Contá en al menos 10 caracteres qué hacienda querés llevar y cuándo.";
  if (!Number.isInteger(cabezas) || cabezas < 1) fields.cabezas = "Indicá cuántas cabezas.";
  if (fd.get("consentimiento") !== "1") fields.consentimiento = "Para consultar tenés que aceptar compartir tu contacto.";
  if (Object.keys(fields).length) return { fields, error: "Revisá los datos marcados." };
  try {
    await api(`/campos/${aviso}/consultas`, {
      method: "POST",
      body: {
        establecimiento_id: ctx.activa.establecimiento_id,
        mensaje: fdStr(fd, "mensaje"),
        especie: fdStr(fd, "especie"),
        cabezas,
        desde: fdOpt(fd, "desde") ?? null,
        consentimiento: true,
      },
    });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos enviar la consulta.");
  }
  revalidarCampos();
  return { ok: { mensaje: "Consulta enviada. Te avisamos cuando responda." } };
}

export async function reportarCampoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  await requireContexto();
  const aviso = fdStr(fd, "aviso");
  if (!UUID.test(aviso)) return { error: "Aviso inválido." };
  if (fdStr(fd, "detalle").length < 20) return { fields: { detalle: "Contá qué pasó en al menos 20 caracteres: fecha, qué viste o qué se acordó." } };
  try {
    await api(`/campos/${aviso}/disputas`, {
      method: "POST",
      body: { motivo: fdStr(fd, "motivo"), detalle: fdStr(fd, "detalle"), consulta_id: fdOpt(fd, "consulta_id") ?? null },
    });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos enviar el reporte.");
  }
  revalidarCampos();
  return { ok: { mensaje: "Reporte enviado. El equipo de TROPILLA lo revisa y te avisa la resolución." } };
}

export async function descargoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("campos.gestionar")) return { error: "Tu rol no puede responder reportes." };
  const aviso = fdStr(fd, "aviso");
  const disputa = fdStr(fd, "disputa");
  if (!UUID.test(aviso) || !UUID.test(disputa)) return { error: "Reporte inválido." };
  if (fdStr(fd, "descargo").length < 10) return { fields: { descargo: "Escribí tu descargo en al menos 10 caracteres." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/campos/avisos/${aviso}/disputas/${disputa}/descargo`, { method: "POST", body: { descargo: fdStr(fd, "descargo") } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar el descargo.");
  }
  revalidarCampos();
  return { ok: { mensaje: "Descargo enviado al equipo de TROPILLA." } };
}

export async function avanzarConsultaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  const lado = fdStr(fd, "lado") === "recibidas" ? "recibidas" : "enviadas";
  if (!ctx.can(lado === "recibidas" ? "campos.gestionar" : "campos.consultar")) return { error: "Tu rol no puede actualizar consultas." };
  const consulta = fdStr(fd, "consulta");
  if (!UUID.test(consulta)) return { error: "Consulta inválida." };
  const estado = fdStr(fd, "estado");
  if (estado === "respondida" && fdStr(fd, "respuesta").length < 3) return { fields: { respuesta: "Escribí la respuesta." } };
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/campos/consultas/${lado}/${consulta}`, {
      method: "PATCH",
      body: { estado, respuesta: fdOpt(fd, "respuesta") ?? null, nota: fdOpt(fd, "nota") ?? null },
    });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos actualizar la consulta.");
  }
  revalidarCampos();
  return { ok: { mensaje: "Consulta actualizada." } };
}

export async function resolverDisputaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.me.usuario.es_staff) return { error: "La moderación la hace el equipo de TROPILLA." };
  const disputa = fdStr(fd, "disputa");
  if (!UUID.test(disputa)) return { error: "Disputa inválida." };
  try {
    await api(`/staff/campos/disputas/${disputa}/resolver`, {
      method: "POST",
      body: { estado: fdStr(fd, "estado"), resolucion: fdOpt(fd, "resolucion") ?? null, accion: fdOpt(fd, "accion") ?? null },
    });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos registrar la resolución.");
  }
  revalidarCampos();
  return { ok: { mensaje: "Resolución registrada y notificada a las partes." } };
}

export async function verificarAvisoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.me.usuario.es_staff) return { error: "La verificación la hace el equipo de TROPILLA." };
  const aviso = fdStr(fd, "aviso");
  if (!UUID.test(aviso)) return { error: "Aviso inválido." };
  try {
    await api(`/staff/campos/avisos/${aviso}/verificacion`, { method: "PUT", body: { nivel: fdStr(fd, "nivel"), nota: fdStr(fd, "nota") } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos guardar la verificación.");
  }
  revalidarCampos();
  return { ok: { mensaje: "Nivel de verificación actualizado." } };
}
