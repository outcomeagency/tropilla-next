/**
 * Plan sanitario (TPA-33): lectura humana de disparadores, repeticiones, alcances y
 * condiciones de las plantillas. Todo sale de datos del catálogo; acá sólo se traduce.
 */

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export type Disparador = { tipo?: string; desde?: string; hasta?: string; meses?: number[]; fecha?: string; evento?: string; dias?: number; semanas?: number[]; cada_dias?: number; configurable?: boolean; segun?: string };
export type Repeticion = { cada?: string; luego?: string; refuerzo_dias?: { min?: number; max?: number }; repetir_dias?: number; hasta?: string } | null;
export type Alcance = { categorias?: string[]; excluye_bueyes?: boolean; excluye_vientres?: boolean; excluye_reproductores?: boolean; reposicion?: boolean; lote_ids?: string[] };
export type Condicion = { op?: string; campo?: string; valor?: unknown; alguna?: Condicion[]; todas?: Condicion[] } | null;

/** «03-01» → «1 de marzo». */
export function diaMes(mmdd?: string): string {
  if (!mmdd || !/^\d{2}-\d{2}$/.test(mmdd)) return "";
  const [m, d] = mmdd.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

/** «03-01» ↔ «01/03» para los campos editables. */
export const mmddADdmm = (s?: string) => (s && /^\d{2}-\d{2}$/.test(s) ? `${s.slice(3)}/${s.slice(0, 2)}` : "");
export function ddmmAMmdd(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12 || d < 1 || d > new Date(Date.UTC(2024, mes, 0)).getUTCDate()) return null;
  return `${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function lista(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`;
}

export function cuando(d: Disparador | undefined): string {
  if (!d) return "";
  switch (d.tipo) {
    case "ventana":
      if (d.meses?.length) return `En ${lista(d.meses.map((m) => MESES[m - 1]))}`;
      if (d.desde && d.hasta) return `Entre el ${diaMes(d.desde)} y el ${diaMes(d.hasta)}`;
      return "Ventana a definir";
    case "fecha_fija":
      return d.fecha ? `El ${diaMes(d.fecha)}` : "Fecha a definir";
    case "relativo": {
      const ev = d.evento === "nacimiento" ? "del nacimiento" : `de ${d.evento ?? "el evento"}`;
      if (d.semanas?.length) return `A las ${lista(d.semanas.map(String))} semanas ${ev}`;
      return `A los ${d.dias ?? 0} días ${ev}`;
    }
    case "periodico":
      return `Cada ${d.cada_dias ?? "?"} días`;
    case "manual":
      return d.segun === "coprologico" ? "Según el resultado del coprológico" : "Cuando lo programes";
    default:
      return d.tipo ?? "";
  }
}

export function repite(r: Repeticion): string {
  if (!r) return "";
  const out: string[] = [];
  if (r.refuerzo_dias) out.push(`refuerzo entre ${r.refuerzo_dias.min ?? "?"} y ${r.refuerzo_dias.max ?? "?"} días después de la primera dosis`);
  if (r.cada === "anual" || r.luego === "anual") out.push("todos los años");
  if (r.repetir_dias) out.push(`se repite a los ${r.repetir_dias} días`);
  if (r.hasta === "destete") out.push("hasta el destete");
  return out.join(" · ");
}

export function aQuienes(a: Alcance | undefined, nombreCategoria: (c: string) => string, nombreLote?: (id: string) => string): string {
  if (!a) return "Toda la hacienda";
  if (a.lote_ids?.length && nombreLote) return lista(a.lote_ids.map(nombreLote));
  if (a.excluye_vientres || a.excluye_reproductores || a.excluye_bueyes) return "Menores (sin vientres, reproductores ni bueyes)";
  if (a.reposicion) return "Hembras de reposición";
  if (a.categorias?.length) return lista(a.categorias.map(nombreCategoria));
  return "Toda la hacienda";
}

const CAMPOS: Record<string, (v: unknown, op?: string) => string> = {
  "zona.rabia_endemica": (v) => (v ? "zona endémica de rabia" : "zona sin rabia"),
  interdiccion_vigente: (v) => (v ? "interdicción vigente" : "sin interdicción"),
  "zona.fasciola_endemica": (v) => (v ? "zona con fasciola (saguaypé)" : "zona sin fasciola"),
  "zona.garrapata": (v, op) => (op === "ne" && v === "libre" ? "zona con garrapata" : `garrapata: ${String(v)}`),
};

export function condicionTexto(c: Condicion): string {
  if (!c) return "";
  if (c.alguna?.length) return c.alguna.map(condicionTexto).filter(Boolean).join(" o ");
  if (c.todas?.length) return c.todas.map(condicionTexto).filter(Boolean).join(" y ");
  const f = c.campo ? CAMPOS[c.campo] : undefined;
  return f ? f(c.valor, c.op) : `${c.campo ?? ""}`;
}

/** Segmentos [inicio, fin] en fracción del año (0–1) para la grilla anual; fecha fija = punto. */
export function segmentosAnio(d: Disparador | undefined): Array<{ desde: number; hasta: number; punto?: boolean }> {
  if (!d) return [];
  const frac = (mmdd: string) => {
    const [m, dd] = mmdd.split("-").map(Number);
    const dia = Math.floor((Date.UTC(2025, m - 1, dd) - Date.UTC(2025, 0, 1)) / 86_400_000);
    return dia / 365;
  };
  if (d.tipo === "ventana" && d.meses?.length) return d.meses.map((m) => ({ desde: (m - 1) / 12, hasta: m / 12 }));
  if (d.tipo === "ventana" && d.desde && d.hasta) {
    const a = frac(d.desde);
    const b = frac(d.hasta) + 1 / 365;
    return a <= b ? [{ desde: a, hasta: b }] : [{ desde: a, hasta: 1 }, { desde: 0, hasta: b }];
  }
  if (d.tipo === "fecha_fija" && d.fecha) {
    const a = frac(d.fecha);
    return [{ desde: a, hasta: a, punto: true }];
  }
  return [];
}
