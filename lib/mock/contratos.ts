import "server-only";
/**
 * ⚠ DATOS DE EJEMPLO ⚠ — contratos a futuro (…/contratos, TPA-56) en memoria del
 * servidor mientras la API no tenga el módulo. Se pierden al reiniciar.
 */
import { calcularTerminos } from "@/lib/contratos-calc";
import type { S } from "@/lib/schemas";
import { mockHuella } from "./ofertas";

type Contrato = S<"Contrato">;
const store = new Map<string, Contrato[]>();

export function terminosDe(input: S<"ContratoInput">, especie: "BOV" | "BUB", categoria: string): S<"TerminosContrato"> {
  const t = calcularTerminos({
    cabezas: input.cabezas ?? 0,
    pesoVivo: Number(input.peso_vivo_estimado_kg),
    rendimientoPct: Number(input.rendimiento_pct ?? (especie === "BUB" ? 53 : 58)),
    kgPorToken: input.kg_por_token ?? 100,
    precioRef: Number(input.precio_referencia_kg),
    descuentoPct: Number(input.descuento_pct),
    anticipoPct: Number(input.anticipo_pct),
  });
  return {
    cabezas: input.cabezas,
    especie,
    categoria,
    peso_vivo_estimado_kg: input.peso_vivo_estimado_kg,
    rendimiento_pct: String(input.rendimiento_pct ?? (especie === "BUB" ? 53 : 58)),
    kg_gancho_totales: t.kgGancho,
    kg_por_token: input.kg_por_token ?? 100,
    tokens_totales: t.tokens,
    precio_referencia_kg: input.precio_referencia_kg,
    descuento_pct: input.descuento_pct,
    precio_especial_kg: String(t.precioEspecial),
    anticipo_pct: input.anticipo_pct,
    anticipo_por_token: String(t.anticipoPorToken),
    moneda: "ARS",
    fecha_entrega: input.fecha_entrega,
    tolerancia_pct: input.tolerancia_pct ?? "5",
    toma_vencimiento_horas: input.toma_vencimiento_horas ?? 48,
  };
}

function seed(): Contrato[] {
  const terminos = terminosDe(
    {
      lote_id: "01920000-0000-7000-8000-00000000b012",
      cabezas: 30,
      peso_vivo_estimado_kg: "520",
      rendimiento_pct: "53",
      kg_por_token: 100,
      precio_referencia_kg: "6800",
      descuento_pct: "12",
      anticipo_pct: "30",
      fecha_entrega: "2027-03-15",
    },
    "BUB",
    "BUB_BUBILLO",
  );
  const pe = Number(terminos.precio_especial_kg);
  const apt = Number(terminos.anticipo_por_token);
  const toma = (id: string, nombre: string, empresa: string, tokens: number, estado: S<"Toma">["estado"], dias: number, vence?: string): S<"Toma"> => ({
    id,
    comprador: { id: `c-${id}`, nombre, empresa },
    tokens,
    tokens_vigentes: estado === "liberada" ? 0 : tokens,
    kg: tokens * 100,
    precio_especial_kg: String(pe),
    anticipo_monto: String(Math.round(apt * tokens)),
    anticipo_a_devolver: "0",
    estado,
    vence_en: vence ?? null,
    created_at: new Date(Date.UTC(2026, 9, 16 - dias, 13)).toISOString(),
    movimientos: [],
  });
  const tomas = [
    toma("t1", "Martín Benítez", "Frigorífico Las Marías", 30, "confirmada", 9),
    toma("t2", "Carla Romero", "Carnes del Iberá S.R.L.", 15, "pago_informado", 1, "2026-10-17T13:00:00.000Z"),
    toma("t3", "Diego Acosta", "Exportadora Paraná", 10, "liberada", 6),
  ];
  const comprometidos = tomas.filter((t) => t.estado !== "liberada").reduce((s, t) => s + (t.tokens ?? 0), 0);
  return [
    {
      id: "01920000-0000-7000-8000-0000000c0001",
      codigo_publico: "CF0007",
      url_publica: "/es/contratos/CF0007",
      lote: { id: "01920000-0000-7000-8000-00000000b012", nombre: "B-12 · Bubillos recría 2024" },
      estado: "parcialmente_tomado",
      version: 1,
      terminos,
      tokens_comprometidos: comprometidos,
      tokens_libres: (terminos.tokens_totales ?? 0) - comprometidos,
      tomas,
      versiones: [{ version: 1, motivo: "Publicación inicial", huella: mockHuella("contrato:CF0007:1"), created_at: "2026-10-05T14:00:00.000Z" }],
      entrega: null,
      huella: mockHuella("contrato:CF0007:1"),
      confianza: "integridad_registrada",
      publicado_en: "2026-10-05T14:00:00.000Z",
    },
  ];
}

export function mockContratos(est: string): Contrato[] {
  if (!store.has(est)) store.set(est, seed());
  return store.get(est)!;
}

export function mockContrato(est: string, id: string): Contrato | null {
  return mockContratos(est).find((c) => c.id === id) ?? null;
}

export function mockGuardarContrato(est: string, c: Contrato): Contrato {
  const list = mockContratos(est);
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  return c;
}

/** Todos los contratos publicados (para la ficha pública demo). */
export function mockContratoPorCodigo(codigo: string): Contrato | null {
  for (const list of store.values()) {
    const c = list.find((x) => x.codigo_publico?.toLowerCase() === codigo.toLowerCase());
    if (c) return c;
  }
  const seedC = seed()[0];
  return seedC.codigo_publico?.toLowerCase() === codigo.toLowerCase() ? seedC : null;
}

/* ── Comprador (TPA-57) ── */

const compradores = new Map<string, S<"Comprador">>();
const tomasDe = new Map<string, Array<{ codigo: string; tomaId: string }>>();

export function mockComprador(userId: string): S<"Comprador"> | null {
  return compradores.get(userId) ?? null;
}

export function mockGuardarComprador(userId: string, c: S<"Comprador">): S<"Comprador"> {
  compradores.set(userId, c);
  return c;
}

function buscar(codigo: string): { est: string; c: Contrato } | null {
  for (const [est, list] of store.entries()) {
    const c = list.find((x) => x.codigo_publico?.toLowerCase() === codigo.toLowerCase());
    if (c) return { est, c };
  }
  return null;
}

/** Tomar N tokens: falla si supera los libres (409 tokens_insuficientes en la API). */
export function mockTomar(codigo: string, userId: string, comprador: { nombre: string; empresa?: string | null }, tokens: number): S<"Toma"> | "insuficientes" | null {
  let hit = buscar(codigo);
  if (!hit) {
    const seedC = seed()[0];
    if (seedC.codigo_publico?.toLowerCase() !== codigo.toLowerCase()) return null;
    store.set("demo-publico", [seedC]);
    hit = { est: "demo-publico", c: seedC };
  }
  const { est, c } = hit;
  if (tokens > (c.tokens_libres ?? 0)) return "insuficientes";
  const t = c.terminos ?? {};
  const toma: S<"Toma"> = {
    id: crypto.randomUUID(),
    contrato_id: c.id,
    comprador: { id: userId, nombre: comprador.nombre, empresa: comprador.empresa ?? null },
    tokens,
    tokens_vigentes: tokens,
    kg: tokens * (t.kg_por_token ?? 100),
    precio_especial_kg: t.precio_especial_kg,
    anticipo_monto: String(Math.round(Number(t.anticipo_por_token ?? 0) * tokens)),
    anticipo_a_devolver: "0",
    estado: "reservada",
    vence_en: new Date(Date.now() + (t.toma_vencimiento_horas ?? 48) * 3_600_000).toISOString(),
    created_at: new Date().toISOString(),
    movimientos: [],
  };
  const comprometidos = (c.tokens_comprometidos ?? 0) + tokens;
  mockGuardarContrato(est, {
    ...c,
    tomas: [...(c.tomas ?? []), toma],
    tokens_comprometidos: comprometidos,
    tokens_libres: (t.tokens_totales ?? 0) - comprometidos,
    estado: comprometidos >= (t.tokens_totales ?? 0) ? "completo" : "parcialmente_tomado",
  });
  tomasDe.set(userId, [...(tomasDe.get(userId) ?? []), { codigo: c.codigo_publico ?? codigo, tomaId: toma.id! }]);
  return toma;
}

export function mockMisTomas(userId: string): Array<{ toma: S<"Toma">; contrato: Contrato }> {
  return (tomasDe.get(userId) ?? [])
    .map(({ codigo, tomaId }) => {
      const hit = buscar(codigo);
      const toma = hit?.c.tomas?.find((x) => x.id === tomaId);
      return hit && toma ? { toma, contrato: hit.c } : null;
    })
    .filter((x): x is { toma: S<"Toma">; contrato: Contrato } => !!x);
}

export function mockInformarPago(userId: string, tomaId: string): boolean {
  for (const [est, list] of store.entries()) {
    for (const c of list) {
      const t = c.tomas?.find((x) => x.id === tomaId && x.comprador?.id === userId);
      if (t) {
        mockGuardarContrato(est, { ...c, tomas: c.tomas!.map((x) => (x.id === tomaId ? { ...x, estado: "pago_informado" } : x)) });
        return true;
      }
    }
  }
  return false;
}
