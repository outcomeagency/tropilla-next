/**
 * Fecha probable de parto (TPA-28, functional/03 §3): días de gestación
 * media por especie y raza desde los parámetros del catálogo (Murrah 303,
 * Mediterránea 313, Jafarabadi 330, búfala sin raza 310, bovino 283).
 */
export type Gestaciones = Record<string, number>;

/** Mapa «ESPECIE|RAZA» → días (raza vacía = valor de la especie). */
export function gestacionesDe(parametros: Array<{ clave: string; especie?: string | null; raza?: string | null; valor: unknown }>): Gestaciones {
  const out: Gestaciones = { "BOV|": 283, "BUB|": 310 };
  for (const p of parametros) if (p.clave === "gestacion_media_dias" && p.especie) out[`${p.especie}|${p.raza ?? ""}`] = Number(p.valor);
  return out;
}

export function gestacion(g: Gestaciones, especie?: string | null, raza?: string | null): number {
  return g[`${especie ?? ""}|${raza ?? ""}`] ?? g[`${especie ?? ""}|`] ?? 283;
}

/** FPP = fecha del tacto − días de gestación + gestación media. */
export function fpp(fechaTacto: string, diasGestacion: number, dias: number): string {
  const t = Date.parse(`${fechaTacto}T12:00:00Z`) + (dias - diasGestacion) * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
