"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { isMockable } from "./mock/fallback";
import { mockGuardarOferta, mockLote, mockOferta } from "./mock/ofertas-panel";
import { categoriaNombre, razaNombre } from "./catalogo";
import type { One, S } from "./schemas";

export interface OfertaFormState {
  error?: string;
  fields?: Record<string, string>;
  saved?: boolean;
}

const base = (est: string) => `/establecimientos/${est}`;

function codigoNuevo(): string {
  return `TP${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Flujo 11, paso 1: borrador precargado desde un lote (especie, categoría, cantidad, peso con fecha, sanidad). */
export async function crearDesdeLoteAction(formData: FormData): Promise<void> {
  const ctx = await requireContexto();
  if (!ctx.can("ofertas.gestionar")) redirect("/comercializacion");
  const est = ctx.activa.establecimiento_id;
  const loteId = String(formData.get("lote_id") ?? "");
  let id = "";
  try {
    const res = await api<One<S<"Oferta">>>(`${base(est)}/ofertas/desde-lote`, {
      method: "POST",
      body: { lote_id: loteId, tipo: "lote" } satisfies S<"OfertaDesdeLoteInput">,
    });
    id = res.data.id ?? "";
  } catch (e) {
    if (!isMockable(e)) throw e;
    const lote = mockLote(loteId);
    if (!lote) redirect("/comercializacion/ofertas/nueva");
    const cat = Object.keys(lote.conteo ?? {})[0] ?? "";
    const cantidad = Object.values(lote.conteo ?? {}).reduce((a, b) => a + b, 0);
    id = crypto.randomUUID();
    mockGuardarOferta(est, {
      id,
      tipo: "lote",
      especie: lote.especie,
      categorias: [cat],
      razas: [lote.extra.raza],
      lote_id: lote.id,
      cantidad,
      estado: "borrador",
      mostrar: { peso: true, edad: true, sanidad: true, origen: true, documentos: true, condiciones: true, precio: false },
      condiciones: { modalidad: "en_pie", precio: "a_consultar", lugar_carga: "", disponible_desde: "" },
      textos: { titulo: `${cantidad} ${categoriaNombre(cat).toLowerCase()} ${razaNombre(lote.extra.raza)}`, sistema: "" },
      precarga: {
        peso_promedio_kg: lote.peso_promedio_kg,
        peso_fecha: lote.peso_promedio_fecha,
        edad_min: lote.extra.edad?.min,
        edad_max: lote.extra.edad?.max,
        sanidad: lote.extra.sanidad,
      },
      consultas_count: 0,
      row_version: 0,
    });
  }
  redirect(`/comercializacion/ofertas/${id}`);
}

/** Flujo 11, pasos 2–3: datos y «qué se muestra». */
export async function guardarOfertaAction(_prev: OfertaFormState, formData: FormData): Promise<OfertaFormState> {
  const ctx = await requireContexto();
  if (!ctx.can("ofertas.gestionar")) return { error: "Tu rol no permite editar ofertas." };
  const est = ctx.activa.establecimiento_id;
  const id = String(formData.get("id") ?? "");
  const cantidad = Number(formData.get("cantidad"));
  const titulo = String(formData.get("titulo") ?? "").trim();
  const fields: Record<string, string> = {};
  if (!titulo) fields.titulo = "Escribí un título: así aparece en el directorio y en WhatsApp.";
  if (!Number.isInteger(cantidad) || cantidad < 1) fields.cantidad = "La cantidad tiene que ser un número entero mayor a 0.";
  if (Object.keys(fields).length) return { fields };

  const puedePrecio = ctx.can("comercial.precios");
  const mostrar = Object.fromEntries(
    ["peso", "edad", "sanidad", "origen", "documentos", "condiciones", "precio"].map((k) => [k, formData.get(`mostrar_${k}`) === "on" && (k !== "precio" || puedePrecio)]),
  );
  const condiciones: Record<string, unknown> = {
    modalidad: String(formData.get("modalidad") ?? "en_pie"),
    precio: puedePrecio && formData.get("precio_monto") ? "monto" : "a_consultar",
    lugar_carga: String(formData.get("lugar_carga") ?? "").trim(),
    disponible_desde: String(formData.get("disponible_desde") ?? ""),
  };
  if (puedePrecio && formData.get("precio_monto")) {
    condiciones.precio_monto = String(formData.get("precio_monto")).replace(",", ".");
    condiciones.moneda = "ARS";
    condiciones.unidad = String(formData.get("precio_unidad") ?? "kg");
  }
  const body: S<"OfertaInput"> = {
    cantidad,
    mostrar,
    condiciones,
    textos: { titulo, sistema: String(formData.get("sistema") ?? "").trim(), descripcion: String(formData.get("descripcion") ?? "").trim() },
    row_version: Number(formData.get("row_version") ?? 0),
  };

  try {
    await api(`${base(est)}/ofertas/${id}`, { method: "PATCH", body });
  } catch (e) {
    if (e instanceof ApiError && e.code === "conflicto_row_version") {
      return { error: "Alguien más editó esta oferta mientras la tenías abierta. Recargá para ver la última versión." };
    }
    if (e instanceof ApiError && e.status === 422) return { error: e.message };
    if (!isMockable(e)) return { error: "No pudimos guardar. Probá de nuevo." };
    const actual = mockOferta(est, id);
    if (!actual) return { error: "La oferta no existe." };
    mockGuardarOferta(est, { ...actual, cantidad: body.cantidad, mostrar: body.mostrar, condiciones: body.condiciones, textos: body.textos });
  }
  revalidatePath(`/comercializacion/ofertas/${id}`);
  redirect(`/comercializacion/ofertas/${id}?paso=publicar`);
}

/** Flujo 11, paso 4: publicar (con avisos confirmados si los hay) → link + QR + PDF. */
export async function publicarOfertaAction(_prev: OfertaFormState, formData: FormData): Promise<OfertaFormState> {
  const ctx = await requireContexto();
  if (!ctx.can("ofertas.publicar")) return { error: "Tu rol no permite publicar ofertas." };
  const est = ctx.activa.establecimiento_id;
  const id = String(formData.get("id") ?? "");
  const confirmar = formData.get("confirmar_avisos") === "on";
  const hayAvisos = formData.get("hay_avisos") === "1";
  if (hayAvisos && !confirmar) return { error: "Revisá los avisos: corregilos o marcá «Publicar igual»." };
  if (ctx.me.usuario.email && ctx.me.usuario.email_verificado === false) {
    return { error: "Para publicar tenés que verificar tu email. Te mandamos el enlace al registrarte; podés reenviarlo desde el aviso de arriba." };
  }
  try {
    await api(`${base(est)}/ofertas/${id}/publicar`, { method: "POST", body: { confirmar_avisos: confirmar } satisfies S<"PublicarInput"> });
  } catch (e) {
    if (e instanceof ApiError && e.code === "requiere_confirmacion") return { error: "Hay avisos nuevos: revisalos antes de publicar." };
    if (!isMockable(e)) return { error: e instanceof ApiError ? e.message : "No pudimos publicar. Probá de nuevo." };
    const actual = mockOferta(est, id);
    if (!actual) return { error: "La oferta no existe." };
    const codigo = actual.codigo_publico ?? codigoNuevo();
    mockGuardarOferta(est, {
      ...actual,
      estado: "publicada",
      codigo_publico: codigo,
      url_publica: `/es/ofertas/${codigo}`,
      publicacion_vigente: (actual.publicacion_vigente ?? 0) + 1,
      publicada_en: new Date().toISOString(),
    });
  }
  revalidatePath("/comercializacion");
  redirect(`/comercializacion/ofertas/${id}?publicada=1`);
}

/** Reservada / vendida / retirada / volver a publicar. */
export async function cambiarEstadoOfertaAction(formData: FormData): Promise<void> {
  const ctx = await requireContexto();
  if (!ctx.can("ofertas.publicar")) redirect("/comercializacion");
  const est = ctx.activa.establecimiento_id;
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as S<"EstadoOfertaInput">["estado"];
  try {
    await api(`${base(est)}/ofertas/${id}/estado`, { method: "POST", body: { estado } satisfies S<"EstadoOfertaInput"> });
  } catch (e) {
    if (!isMockable(e)) throw e;
    const actual = mockOferta(est, id);
    if (actual) mockGuardarOferta(est, { ...actual, estado });
  }
  revalidatePath("/comercializacion");
  redirect(`/comercializacion/ofertas/${id}`);
}
