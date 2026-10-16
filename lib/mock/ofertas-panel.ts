import "server-only";
/**
 * ⚠ DATOS DE EJEMPLO ⚠ — ofertas del panel (GET/POST /establecimientos/{e}/ofertas…, TPA-48)
 * guardadas EN MEMORIA del servidor de Next mientras la API no tenga el módulo.
 * Se pierden al reiniciar: sirven sólo para recorrer el flujo 11 de punta a punta.
 */
import type { S } from "@/lib/schemas";
import { MOCK_LOTES } from "./lotes";

type Oferta = S<"Oferta">;
const store = new Map<string, Oferta[]>();

function seed(): Oferta[] {
  const lote = MOCK_LOTES[0];
  return [
    {
      id: "01920000-0000-7000-8000-0000000f0142",
      codigo_publico: "LE0142",
      url_publica: "/es/ofertas/LE0142",
      tipo: "lote",
      especie: "BUB",
      categorias: ["BUB_BUBILLO"],
      razas: ["BUB_MEDITERRANEA"],
      lote_id: lote.id,
      cantidad: 30,
      estado: "publicada",
      mostrar: { peso: true, edad: true, sanidad: true, origen: true, documentos: true, condiciones: true, precio: false },
      condiciones: { modalidad: "en_pie", precio: "a_consultar", lugar_carga: "En el establecimiento, General Paz (Corrientes)", disponible_desde: "2026-11-02" },
      textos: { titulo: "30 bubillos Mediterráneos", sistema: "Sistema pastoril en humedal" },
      publicacion_vigente: 2,
      consultas_count: 3,
      publicada_en: "2026-10-16T10:24:00.000Z",
      row_version: 4,
    },
    {
      id: "01920000-0000-7000-8000-0000000f0157",
      codigo_publico: "LE0157",
      url_publica: "/es/ofertas/LE0157",
      tipo: "lote",
      especie: "BOV",
      categorias: ["BOV_TERNERO"],
      razas: ["BOV_BRAFORD"],
      lote_id: MOCK_LOTES[2].id,
      cantidad: 45,
      estado: "reservada",
      mostrar: { peso: true, edad: true, sanidad: true, origen: true, documentos: false, condiciones: true, precio: false },
      condiciones: { modalidad: "en_pie", precio: "a_consultar", lugar_carga: "En el establecimiento", disponible_desde: "2026-10-25" },
      textos: { titulo: "45 terneros Braford" },
      publicacion_vigente: 1,
      consultas_count: 1,
      publicada_en: "2026-10-12T15:10:00.000Z",
      row_version: 2,
    },
  ];
}

export function mockOfertas(est: string): Oferta[] {
  if (!store.has(est)) store.set(est, seed());
  return store.get(est)!;
}

export function mockOferta(est: string, id: string): Oferta | null {
  return mockOfertas(est).find((o) => o.id === id) ?? null;
}

export function mockGuardarOferta(est: string, oferta: Oferta): Oferta {
  const list = mockOfertas(est);
  const i = list.findIndex((o) => o.id === oferta.id);
  const next = { ...oferta, row_version: (oferta.row_version ?? 0) + 1 };
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  return next;
}

/** Avisos previos a publicar: retiro vigente, documento vencido, pesaje > 60 días (reactores: nunca en el mock). */
export function mockAvisos(oferta: Oferta, hoy = new Date("2026-10-16T12:00:00Z")): Array<{ codigo: string; mensaje: string; corregir?: string }> {
  const pre = (oferta.precarga ?? {}) as { peso_fecha?: string };
  const lote = MOCK_LOTES.find((l) => l.id === oferta.lote_id) ?? { extra: { retiroHasta: undefined as string | undefined }, peso_promedio_fecha: pre.peso_fecha };
  const out: Array<{ codigo: string; mensaje: string; corregir?: string }> = [];
  if (lote.extra.retiroHasta && new Date(lote.extra.retiroHasta) > hoy) {
    out.push({
      codigo: "retiro_vigente",
      mensaje: `Hay animales con período de retiro vigente hasta el ${lote.extra.retiroHasta.split("-").reverse().join("/")}. No se pueden faenar antes de esa fecha.`,
      corregir: "/sanidad",
    });
  }
  if (lote.peso_promedio_fecha) {
    const dias = Math.round((hoy.getTime() - new Date(lote.peso_promedio_fecha).getTime()) / 86_400_000);
    if (dias > 60) {
      out.push({ codigo: "pesaje_viejo", mensaje: `El último pesaje tiene ${dias} días. El comprador va a ver la fecha.`, corregir: "/hacienda" });
    }
  }
  return out;
}

export function mockLote(id: string) {
  return MOCK_LOTES.find((l) => l.id === id) ?? null;
}

/** Ofertas publicadas desde el panel demo (para que «Ver como comprador» funcione sin API). */
export function mockPublicadaPorCodigo(codigo: string): { oferta: Oferta; lote: ReturnType<typeof mockLote> } | null {
  for (const list of store.values()) {
    const o = list.find((x) => x.codigo_publico?.toLowerCase() === codigo.toLowerCase() && x.estado !== "borrador" && x.estado !== "retirada");
    if (o) return { oferta: o, lote: o.lote_id ? mockLote(o.lote_id) : null };
  }
  return null;
}
