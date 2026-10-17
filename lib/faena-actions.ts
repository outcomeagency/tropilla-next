"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { decimal, estadoDeError, fdStr, isFecha, uuidv7, type EventoActionState } from "./eventos-api";
import { crearDocumentoConArchivo, MAX_BYTES_DOCUMENTO, MIMES_DOCUMENTO } from "./archivos";
import type { One, S } from "./schemas";

/** Una res tal como la carga la persona (kg como texto, coma o punto). */
export type ResFila = {
  garron: string;
  identificacion?: string;
  media_a_kg?: string;
  media_b_kg?: string;
  peso_kg?: string;
  categoria?: string;
  tipificacion?: string;
  decomiso?: string;
};

export interface PlanillaState {
  error?: string;
  reses?: ResFila[];
  errores?: Array<{ fila: number; mensaje: string }>;
}

export interface FaenaState extends EventoActionState {
  /** Original ya subido en un intento anterior (el input de archivo se vacía al reintentar). */
  documento_id?: string;
}

const PLANILLA = /\.(csv|txt|xlsx)$/i;
const sinPermiso = "El resultado de faena trae precios y liquidaciones: sólo lo cargan el dueño y la administración.";

/** Lee la planilla digital del frigorífico (CSV/XLSX) y devuelve las reses para revisar; no guarda nada. */
export async function leerPlanillaFaenaAction(fd: FormData): Promise<PlanillaState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: sinPermiso };
  const a = fd.get("archivo");
  if (!(a instanceof File) || !a.size) return { error: "Elegí la planilla del frigorífico." };
  if (!PLANILLA.test(a.name)) return { error: "Para leer las reses subí la planilla en CSV o Excel (.xlsx). Un PDF o una foto se adjunta como original." };
  if (a.size > 5 * 1024 * 1024) return { error: "La planilla supera los 5 MB." };
  const body = new FormData();
  body.set("archivo", a, a.name);
  try {
    const r = await api<{ data: { reses: Array<Record<string, string | null>>; errores: Array<{ fila: number; mensaje: string }> } }>(
      `/establecimientos/${ctx.activa.establecimiento_id}/faena/planilla`,
      { method: "POST", body, timeoutMs: 30_000 },
    );
    const reses = r.data.reses.map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v == null ? "" : String(v).replace(".", ",")])) as ResFila);
    return { reses: reses.map((x) => ({ ...x, garron: x.garron ?? "" })), errores: r.data.errores };
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) return { error: e.field("archivo") ? `${e.message} ${e.field("archivo")}` : e.message };
    return { error: estadoDeError(e, {}, "No pudimos leer la planilla.").error };
  }
}

function kg(v: string | undefined): string | undefined {
  const d = decimal(v ?? "");
  return d === null ? (v ?? "").trim() : d;
}

/** Registra el romaneo de una tropa (una fila por res). Sube el original si lo hay y vincula la venta. */
export async function registrarResultadoFaenaAction(_prev: FaenaState, fd: FormData): Promise<FaenaState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: sinPermiso };
  const est = ctx.activa.establecimiento_id;
  const fields: Record<string, string> = {};
  const frigorifico = fdStr(fd, "frigorifico");
  const fecha = fdStr(fd, "fecha_faena");
  if (!frigorifico) fields.frigorifico = "Indicá el frigorífico.";
  if (!isFecha(fecha)) fields.fecha_faena = "Indicá la fecha de faena.";
  let reses: ResFila[] = [];
  try {
    reses = (JSON.parse(fdStr(fd, "reses") || "[]") as ResFila[]).filter((r) => Object.values(r).some((v) => String(v ?? "").trim()));
  } catch {
    return { error: "No pudimos leer la tabla de reses. Recargá la página." };
  }
  if (!reses.length) fields.reses = "Cargá al menos una res (garrón y peso).";
  const cabezas = fdStr(fd, "cabezas_declaradas");
  if (cabezas && !(Number(cabezas) >= 1)) fields.cabezas_declaradas = "Cantidad inválida.";

  const a = fd.get("archivo");
  const file = a instanceof File && a.size ? a : null;
  const esPlanilla = !!file && PLANILLA.test(file.name);
  if (file && !esPlanilla) {
    if (file.size > MAX_BYTES_DOCUMENTO) fields.archivo = "El archivo supera los 10 MB.";
    else if (file.type && !MIMES_DOCUMENTO.includes(file.type)) fields.archivo = "Adjuntá un PDF, una foto o la planilla (CSV/XLSX).";
  }
  let documentoId = fdStr(fd, "documento_id");
  const importado = fdStr(fd, "origen") === "importado";
  if (importado && !file && !documentoId) fields.archivo = "Adjuntá la planilla que leíste: queda como original del frigorífico.";
  if (Object.keys(fields).length) return { fields, documento_id: documentoId || undefined, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };

  const tropa = fdStr(fd, "tropa_numero");
  let creado = "";
  try {
    if (file && !documentoId) {
      const doc = await crearDocumentoConArchivo(
        est,
        file,
        {
          tipo: "resultado_faena",
          titulo: `Romaneo ${frigorifico}${tropa ? ` · tropa ${tropa}` : ""}`.slice(0, 200),
          emisor: { nombre: frigorifico.slice(0, 200), identificacion: fdStr(fd, "frigorifico_cuit") || null },
          emitido_en: fecha,
        },
        { id: uuidv7(), version_id: uuidv7() },
      );
      documentoId = doc.id ?? "";
    }
    const opt = (k: string) => fdStr(fd, k) || undefined;
    const body: S<"ResultadoFaenaInput"> = {
      id: fdStr(fd, "id") || uuidv7(),
      frigorifico,
      frigorifico_cuit: opt("frigorifico_cuit"),
      faenador_numero: opt("faenador_numero"),
      fecha_faena: fecha,
      tropa_numero: tropa || undefined,
      romaneo_numero: opt("romaneo_numero"),
      dte_numero: opt("dte_numero"),
      cabezas_declaradas: cabezas ? Number(cabezas) : undefined,
      tipificador: opt("tipificador"),
      origen: importado ? "importado" : "declarado",
      documento_id: documentoId || undefined,
      operacion_id: opt("operacion_id"),
      observaciones: opt("observaciones"),
      confirmar_advertencias: fdStr(fd, "confirmar") === "1",
      reses: reses.map((r) => ({
        garron: r.garron.trim(),
        identificacion: r.identificacion?.trim() || undefined,
        media_a_kg: kg(r.media_a_kg),
        media_b_kg: kg(r.media_b_kg),
        peso_kg: kg(r.peso_kg),
        categoria: r.categoria?.trim() || undefined,
        tipificacion: r.tipificacion?.trim() || undefined,
        decomiso: r.decomiso?.trim() || undefined,
      })),
    };
    const r = await api<One<S<"ResultadoFaenaDetalle">>>(`/establecimientos/${est}/faena/resultados`, { method: "POST", body });
    creado = r.data.id;
  } catch (e) {
    if (e instanceof Error && !("status" in e)) return { error: e.message, documento_id: documentoId || undefined };
    return { ...estadoDeError(e, {}, "No pudimos registrar el resultado de faena."), documento_id: documentoId || undefined };
  }
  revalidatePath("/comercializacion/faena", "layout");
  redirect(`/comercializacion/faena/${creado}?ok=registrado`);
}

async function patch(id: string, body: Record<string, unknown>) {
  const ctx = await requireContexto();
  await api(`/establecimientos/${ctx.activa.establecimiento_id}/faena/resultados/${id}`, { method: "PATCH", body });
  revalidatePath(`/comercializacion/faena/${id}`);
  revalidatePath("/comercializacion/faena");
}

/** Vincula (o cambia) la venta con la que se concilia el romaneo. */
export async function vincularVentaFaenaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: sinPermiso };
  const op = fdStr(fd, "operacion_id");
  try {
    await patch(fdStr(fd, "id"), { operacion_id: op || null, row_version: Number(fdStr(fd, "row_version")) });
    return { ok: { mensaje: op ? "Venta vinculada: la conciliación se recalculó." : "Se quitó la venta vinculada." } };
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos vincular la venta.");
  }
}

/** Liquidación tal como la emitió el frigorífico o consignataria. */
export async function guardarLiquidacionFaenaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: sinPermiso };
  const fields: Record<string, string> = {};
  const num = (k: string, etiqueta: string) => {
    const v = decimal(fdStr(fd, k));
    if (v === null) fields[k] = `${etiqueta}: número inválido.`;
    return v ?? undefined;
  };
  const f = fdStr(fd, "liq_fecha");
  if (f && !isFecha(f)) fields.liq_fecha = "Fecha inválida.";
  const deducciones: Array<{ concepto: string; importe: string }> = [];
  const conceptos = fd.getAll("ded_concepto").map(String);
  const importes = fd.getAll("ded_importe").map(String);
  conceptos.forEach((c, i) => {
    const imp = decimal(importes[i] ?? "");
    if (!c.trim() && !imp) return;
    if (!c.trim()) fields[`ded_${i}`] = "Falta el concepto de una deducción.";
    else if (!imp) fields[`ded_${i}`] = `«${c.trim()}»: importe inválido.`;
    else deducciones.push({ concepto: c.trim().slice(0, 120), importe: imp });
  });
  const liquidacion = {
    numero: fdStr(fd, "liq_numero") || null,
    fecha: f || null,
    emisor: fdStr(fd, "liq_emisor") || null,
    kg: num("liq_kg", "Kg liquidados"),
    precio_kg: num("liq_precio_kg", "Precio por kg"),
    bruto: num("liq_bruto", "Bruto"),
    neto: num("liq_neto", "Neto"),
    moneda: fdStr(fd, "liq_moneda") === "USD" ? "USD" : "ARS",
    deducciones,
  };
  if (!liquidacion.kg && !liquidacion.bruto && !liquidacion.neto) fields.liq_kg = "Cargá al menos los kg, el bruto o el neto de la liquidación.";
  if (Object.keys(fields).length) return { fields, error: Object.keys(fields).length === 1 ? Object.values(fields)[0] : "Revisá los datos marcados." };
  try {
    await patch(fdStr(fd, "id"), { liquidacion, row_version: Number(fdStr(fd, "row_version")) });
    return { ok: { mensaje: "Liquidación guardada. La conciliación la compara con las reses." } };
  } catch (e) {
    return estadoDeError(e, { "liquidacion.kg": "liq_kg", "liquidacion.bruto": "liq_bruto", "liquidacion.neto": "liq_neto", "liquidacion.precio_kg": "liq_precio_kg" }, "No pudimos guardar la liquidación.");
  }
}

/** Adjunta la liquidación (PDF/foto) o la factura: queda en Documentos y vinculada al resultado. */
export async function adjuntarFaenaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: sinPermiso };
  const cual = fdStr(fd, "cual") === "factura" ? "factura" : "liquidacion";
  if (cual === "factura" && !ctx.can("documentos.fiscal")) return { error: "Tu rol no permite cargar documentos fiscales." };
  const a = fd.get("archivo");
  const file = a instanceof File && a.size ? a : null;
  if (!file) return { fields: { archivo: "Elegí el PDF o la foto." }, error: "Elegí el PDF o la foto." };
  if (file.size > MAX_BYTES_DOCUMENTO) return { fields: { archivo: "Supera los 10 MB." }, error: "El archivo supera los 10 MB." };
  if (file.type && !MIMES_DOCUMENTO.includes(file.type)) return { fields: { archivo: "Subí un PDF o una foto." }, error: "Subí un PDF o una foto (JPG, PNG, WebP)." };
  const titulo = fdStr(fd, "titulo");
  try {
    const doc = await crearDocumentoConArchivo(
      ctx.activa.establecimiento_id,
      file,
      { tipo: cual === "factura" ? "factura" : "liquidacion_hacienda", titulo: (titulo || (cual === "factura" ? "Factura de la venta a faena" : "Liquidación de hacienda")).slice(0, 200) },
      { id: uuidv7(), version_id: uuidv7() },
    );
    await patch(fdStr(fd, "id"), { [cual === "factura" ? "factura_documento_id" : "liquidacion_documento_id"]: doc.id, row_version: Number(fdStr(fd, "row_version")) });
    revalidatePath("/documentos", "layout");
    return { ok: { mensaje: cual === "factura" ? "Factura adjuntada." : "Liquidación adjuntada." } };
  } catch (e) {
    if (e instanceof Error && !("status" in e)) return { error: e.message };
    return estadoDeError(e, {}, "No pudimos adjuntar el archivo.");
  }
}

/** Anula el resultado con motivo (queda en el historial; para corregir reses se vuelve a cargar). */
export async function anularResultadoFaenaAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  if (!ctx.can("comercial.precios")) return { error: sinPermiso };
  const motivo = fdStr(fd, "motivo");
  if (motivo.length < 3) return { fields: { motivo: "Contá por qué se anula (ej. «era de otra tropa»)." }, error: "Contá por qué se anula." };
  const id = fdStr(fd, "id");
  try {
    await api(`/establecimientos/${ctx.activa.establecimiento_id}/faena/resultados/${id}/anular`, { method: "POST", body: { motivo: motivo.slice(0, 500) } });
  } catch (e) {
    return estadoDeError(e, {}, "No pudimos anular el resultado.");
  }
  revalidatePath("/comercializacion/faena", "layout");
  redirect(`/comercializacion/faena/${id}?ok=anulado`);
}
