/**
 * Cálculo de términos de un contrato a futuro (functional/01 §10 quater, TPA-56).
 * Mismo cálculo que `POST …/contratos/calcular`; la web lo usa para la vista en
 * vivo y la API es la que manda al guardar. Decisiones de Claude Design (dudas 4 y 5):
 * 100 kg al gancho por token, redondeo hacia abajo, el resto queda del productor.
 */
export interface TerminosInput {
  cabezas: number;
  pesoVivo: number;
  rendimientoPct: number;
  kgPorToken: number;
  precioRef: number;
  descuentoPct: number;
  anticipoPct: number;
}

export interface Terminos {
  kgGancho: number;
  tokens: number;
  kgResto: number;
  precioEspecial: number;
  anticipoPorToken: number;
  valorTotalEspecial: number;
  anticipoTotal: number;
}

export function calcularTerminos(i: TerminosInput): Terminos {
  const kgGancho = Math.floor(i.cabezas * i.pesoVivo * (i.rendimientoPct / 100));
  const tokens = i.kgPorToken > 0 ? Math.floor(kgGancho / i.kgPorToken) : 0;
  const kgResto = kgGancho - tokens * i.kgPorToken;
  const precioEspecial = Math.round(i.precioRef * (1 - i.descuentoPct / 100) * 100) / 100;
  const anticipoPorToken = Math.round(precioEspecial * i.kgPorToken * (i.anticipoPct / 100) * 100) / 100;
  return {
    kgGancho,
    tokens,
    kgResto,
    precioEspecial,
    anticipoPorToken,
    valorTotalEspecial: Math.round(tokens * i.kgPorToken * precioEspecial),
    anticipoTotal: Math.round(tokens * anticipoPorToken),
  };
}

/** Recorte prorrata por mortalidad/faltante: tokens nuevos repartidos según lo tomado. */
export function recorteProrrata(tomas: Array<{ id: string; tokens: number; anticipo: number }>, tokensNuevos: number) {
  const tomados = tomas.reduce((s, t) => s + t.tokens, 0);
  if (tomados <= tokensNuevos) return tomas.map((t) => ({ ...t, tokensNuevos: t.tokens, devolver: 0 }));
  const factor = tokensNuevos / tomados;
  return tomas.map((t) => {
    const n = Math.floor(t.tokens * factor);
    return { ...t, tokensNuevos: n, devolver: Math.round((t.anticipo / t.tokens) * (t.tokens - n)) };
  });
}

export const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const ars2 = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 });
