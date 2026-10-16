"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { requireContexto } from "./establecimiento";
import { isMockable } from "./mock/fallback";
import { mockContrato, mockGuardarContrato, terminosDe } from "./mock/contratos";
import { mockHuella } from "./mock/ofertas";
import { mockLote } from "./mock/ofertas-panel";
import { listLotes } from "./data/ofertas";
import { recorteProrrata } from "./contratos-calc";
import type { One, S } from "./schemas";

export interface ContratoFormState {
  error?: string;
  fields?: Record<string, string>;
}

const base = (est: string) => `/establecimientos/${est}/contratos`;
const num = (fd: FormData, k: string) => String(fd.get(k) ?? "").replace(/\./g, "").replace(",", ".").trim();

async function ctxGestion() {
  const ctx = await requireContexto();
  if (!ctx.can("contratos.gestionar")) throw new Error("sin_permiso");
  return ctx;
}

/** Flujo 20 (productor): crear el contrato en borrador con los términos calculados. */
export async function crearContratoAction(_prev: ContratoFormState, fd: FormData): Promise<ContratoFormState> {
  let ctx;
  try {
    ctx = await ctxGestion();
  } catch {
    return { error: "Tu rol no permite crear contratos a futuro." };
  }
  const est = ctx.activa.establecimiento_id;
  const input: S<"ContratoInput"> = {
    lote_id: String(fd.get("lote_id") ?? ""),
    cabezas: Number(fd.get("cabezas")),
    peso_vivo_estimado_kg: num(fd, "peso_vivo"),
    rendimiento_pct: num(fd, "rendimiento"),
    kg_por_token: Number(fd.get("kg_por_token") || 100),
    precio_referencia_kg: num(fd, "precio_ref"),
    descuento_pct: num(fd, "descuento"),
    anticipo_pct: num(fd, "anticipo"),
    fecha_entrega: String(fd.get("fecha_entrega") ?? ""),
    moneda: "ARS",
    tolerancia_pct: num(fd, "tolerancia") || "5",
    toma_vencimiento_horas: Number(fd.get("vencimiento") || 48),
  };
  const fields: Record<string, string> = {};
  if (!input.lote_id) fields.lote_id = "Elegí el lote.";
  if (!(input.cabezas! > 0)) fields.cabezas = "Indicá las cabezas.";
  if (!(Number(input.peso_vivo_estimado_kg) > 0)) fields.peso_vivo = "Indicá el peso vivo estimado a la entrega.";
  if (!(Number(input.precio_referencia_kg) > 0)) fields.precio_ref = "Indicá el precio de referencia por kg al gancho.";
  if (!(Number(input.descuento_pct) >= 0 && Number(input.descuento_pct) < 50)) fields.descuento = "Entre 0 y 50 %.";
  if (!(Number(input.anticipo_pct) > 0 && Number(input.anticipo_pct) <= 100)) fields.anticipo = "Entre 1 y 100 %.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha_entrega) || input.fecha_entrega <= new Date().toISOString().slice(0, 10)) fields.fecha_entrega = "La entrega tiene que ser una fecha futura.";
  if (Object.keys(fields).length) return { fields };

  let id = "";
  try {
    id = (await api<One<S<"Contrato">>>(base(est), { method: "POST", body: input })).data.id ?? "";
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) return { error: e.message };
    if (!isMockable(e)) return { error: "No pudimos crear el contrato. Probá de nuevo." };
    const lote = mockLote(input.lote_id) ?? (await listLotes(est)).data.find((l) => l.id === input.lote_id);
    id = crypto.randomUUID();
    const terminos = terminosDe(input, lote?.especie ?? "BUB", Object.keys(lote?.conteo ?? {})[0] ?? "");
    mockGuardarContrato(est, {
      id,
      lote: { id: input.lote_id, nombre: lote?.nombre ?? "Lote" },
      estado: "borrador",
      version: 1,
      terminos,
      tokens_comprometidos: 0,
      tokens_libres: terminos.tokens_totales,
      tomas: [],
      versiones: [],
      entrega: null,
      confianza: "declarado",
      publicado_en: null,
    });
  }
  redirect(`/comercializacion/contratos/${id}`);
}

export async function publicarContratoAction(fd: FormData): Promise<void> {
  const ctx = await ctxGestion();
  const est = ctx.activa.establecimiento_id;
  const id = String(fd.get("id") ?? "");
  try {
    await api(`${base(est)}/${id}/publicar`, { method: "POST" });
  } catch (e) {
    if (!isMockable(e)) throw e;
    const c = mockContrato(est, id);
    if (c) {
      const codigo = c.codigo_publico ?? `CF${Math.floor(1000 + Math.random() * 9000)}`;
      const huella = mockHuella(`contrato:${codigo}:${c.version}`);
      mockGuardarContrato(est, {
        ...c,
        estado: "publicado",
        codigo_publico: codigo,
        url_publica: `/es/contratos/${codigo}`,
        huella,
        versiones: [...(c.versiones ?? []), { version: c.version, motivo: "Publicación inicial", huella, created_at: new Date().toISOString() }],
        publicado_en: new Date().toISOString(),
      });
    }
  }
  revalidatePath("/comercializacion/contratos");
  redirect(`/comercializacion/contratos/${id}?publicado=1`);
}

/** Productor confirma «recibí» el anticipo de una toma. */
export async function confirmarPagoAction(fd: FormData): Promise<void> {
  const ctx = await ctxGestion();
  const est = ctx.activa.establecimiento_id;
  const id = String(fd.get("id") ?? "");
  const toma = String(fd.get("toma_id") ?? "");
  try {
    await api(`${base(est)}/${id}/tomas/${toma}/confirmar-pago`, { method: "POST" });
  } catch (e) {
    if (!isMockable(e)) throw e;
    const c = mockContrato(est, id);
    if (c) mockGuardarContrato(est, { ...c, tomas: (c.tomas ?? []).map((t) => (t.id === toma ? { ...t, estado: "confirmada", vence_en: null } : t)) });
  }
  redirect(`/comercializacion/contratos/${id}?ok=pago`);
}

export async function cancelarContratoAction(_prev: ContratoFormState, fd: FormData): Promise<ContratoFormState> {
  let ctx;
  try {
    ctx = await ctxGestion();
  } catch {
    return { error: "Tu rol no permite cancelar contratos." };
  }
  const est = ctx.activa.establecimiento_id;
  const id = String(fd.get("id") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (motivo.length < 10) return { fields: { motivo: "Contá el motivo (lo ven los compradores con tomas)." } };
  try {
    await api(`${base(est)}/${id}/cancelar`, { method: "POST", body: { motivo } });
  } catch (e) {
    if (!isMockable(e)) return { error: "No pudimos cancelar. Probá de nuevo." };
    const c = mockContrato(est, id);
    if (c) mockGuardarContrato(est, { ...c, estado: "cancelado", motivo_estado: motivo });
  }
  redirect(`/comercializacion/contratos/${id}?ok=cancelado`);
}

/** Mortalidad o faltante: nueva versión de términos con recorte prorrata de las tomas. */
export async function nuevaVersionAction(_prev: ContratoFormState, fd: FormData): Promise<ContratoFormState> {
  let ctx;
  try {
    ctx = await ctxGestion();
  } catch {
    return { error: "Tu rol no permite modificar contratos." };
  }
  const est = ctx.activa.establecimiento_id;
  const id = String(fd.get("id") ?? "");
  const cabezas = Number(fd.get("cabezas"));
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!(cabezas > 0)) return { fields: { cabezas: "Indicá las cabezas que quedan." } };
  if (motivo.length < 10) return { fields: { motivo: "Contá qué pasó (muerte, venta, faltante)." } };
  try {
    await api(`${base(est)}/${id}/terminos`, { method: "POST", body: { cabezas, motivo } });
  } catch (e) {
    if (!isMockable(e)) return { error: e instanceof ApiError ? e.message : "No pudimos guardar la versión." };
    const c = mockContrato(est, id);
    if (!c?.terminos) return { error: "El contrato no existe." };
    const t = c.terminos;
    const terminos = terminosDe(
      {
        lote_id: c.lote?.id ?? "",
        cabezas,
        peso_vivo_estimado_kg: t.peso_vivo_estimado_kg ?? "0",
        rendimiento_pct: t.rendimiento_pct,
        kg_por_token: t.kg_por_token,
        precio_referencia_kg: t.precio_referencia_kg ?? "0",
        descuento_pct: t.descuento_pct ?? "0",
        anticipo_pct: t.anticipo_pct ?? "0",
        fecha_entrega: t.fecha_entrega ?? "",
        tolerancia_pct: t.tolerancia_pct,
        toma_vencimiento_horas: t.toma_vencimiento_horas,
      },
      t.especie ?? "BUB",
      t.categoria ?? "",
    );
    const vivas = (c.tomas ?? []).filter((x) => x.estado === "confirmada" || x.estado === "pago_informado" || x.estado === "reservada");
    const rec = recorteProrrata(vivas.map((x) => ({ id: x.id ?? "", tokens: x.tokens_vigentes ?? x.tokens ?? 0, anticipo: Number(x.anticipo_monto ?? 0) })), terminos.tokens_totales ?? 0);
    const tomas = (c.tomas ?? []).map((x) => {
      const r = rec.find((y) => y.id === x.id);
      if (!r || r.tokensNuevos === r.tokens) return x;
      return { ...x, tokens_vigentes: r.tokensNuevos, kg: r.tokensNuevos * (t.kg_por_token ?? 100), anticipo_a_devolver: String(r.devolver), estado: "devuelta_parcial" as const };
    });
    const comprometidos = tomas.filter((x) => x.estado !== "liberada").reduce((s, x) => s + (x.tokens_vigentes ?? x.tokens ?? 0), 0);
    const version = (c.version ?? 1) + 1;
    const huella = mockHuella(`contrato:${c.codigo_publico}:${version}`);
    mockGuardarContrato(est, {
      ...c,
      version,
      terminos,
      tomas,
      tokens_comprometidos: comprometidos,
      tokens_libres: Math.max(0, (terminos.tokens_totales ?? 0) - comprometidos),
      huella,
      versiones: [...(c.versiones ?? []), { version, motivo, huella, created_at: new Date().toISOString() }],
    });
  }
  redirect(`/comercializacion/contratos/${id}?ok=version`);
}

/** Entrega: peso y rendimiento reales → kg efectivos, diferencia, tolerancia y saldo por toma. */
export async function registrarEntregaAction(_prev: ContratoFormState, fd: FormData): Promise<ContratoFormState> {
  let ctx;
  try {
    ctx = await ctxGestion();
  } catch {
    return { error: "Tu rol no permite cargar la entrega." };
  }
  const est = ctx.activa.establecimiento_id;
  const id = String(fd.get("id") ?? "");
  const cabezas = Number(fd.get("cabezas_entregadas"));
  const pesoProm = Number(num(fd, "peso_real"));
  const rend = Number(num(fd, "rendimiento_real"));
  const fields: Record<string, string> = {};
  if (!(cabezas > 0)) fields.cabezas_entregadas = "Indicá las cabezas entregadas.";
  if (!(pesoProm > 0)) fields.peso_real = "Indicá el peso vivo promedio real (romaneo).";
  if (!(rend > 30 && rend < 80)) fields.rendimiento_real = "Rendimiento real entre 30 y 80 %.";
  if (Object.keys(fields).length) return { fields };
  const body = { cabezas_entregadas: cabezas, peso_vivo_total_kg: String(Math.round(cabezas * pesoProm)), rendimiento_real_pct: String(rend) };
  try {
    await api(`${base(est)}/${id}/entrega`, { method: "POST", body });
  } catch (e) {
    if (!isMockable(e)) return { error: e instanceof ApiError ? e.message : "No pudimos registrar la entrega." };
    const c = mockContrato(est, id);
    if (!c?.terminos) return { error: "El contrato no existe." };
    const t = c.terminos;
    const kgReales = Math.floor(cabezas * pesoProm * (rend / 100));
    const kgContratados = (t.tokens_totales ?? 0) * (t.kg_por_token ?? 100);
    const factor = kgContratados ? kgReales / kgContratados : 1;
    const dentro = Math.abs(factor - 1) * 100 <= Number(t.tolerancia_pct ?? 5);
    const pe = Number(t.precio_especial_kg ?? 0);
    const liquidacion = (c.tomas ?? [])
      .filter((x) => x.estado === "confirmada" || x.estado === "devuelta_parcial")
      .map((x) => {
        const kg = Math.round((x.kg ?? 0) * (dentro ? factor : 1));
        const importe = Math.round(kg * pe);
        const anticipo = Number(x.anticipo_monto ?? 0) - Number(x.anticipo_a_devolver ?? 0);
        return { toma_id: x.id, kg_efectivos: String(kg), importe: String(importe), anticipo: String(anticipo), saldo: String(importe - anticipo) };
      });
    mockGuardarContrato(est, {
      ...c,
      estado: "entregado",
      entrega: { ...body, kg_gancho_reales: kgReales, factor: factor.toFixed(4), dentro_tolerancia: dentro, estado: dentro ? "cargada" : "a_resolver", liquidacion, confirmaciones: [] },
    });
  }
  redirect(`/comercializacion/contratos/${id}?ok=entrega`);
}
