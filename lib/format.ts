/** Formatos del panel (es-AR, zona de Corrientes). */
const TZ = "America/Argentina/Buenos_Aires";

export const nf = new Intl.NumberFormat("es-AR");

/** «2026-09-25» → «25/09/2026» (o «25/09» con corto). */
export function fecha(iso?: string | null, corto = false): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return corto ? `${d}/${m}` : `${d}/${m}/${y}`;
}

export function fechaLarga(iso?: string | null): string {
  if (!iso) return "";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(d);
}

export function fechaHora(iso?: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

/** 8 → «8 meses»; 30 → «2 años y 6 meses»; 72 → «6 años». */
export function edad(meses?: number | null, corto = false): string {
  if (meses == null) return "";
  if (meses < 24) return corto ? `${meses} m` : `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  if (corto) return m ? `${a} a ${m} m` : `${a} a`;
  return m ? `${a} años y ${m} ${m === 1 ? "mes" : "meses"}` : `${a} años`;
}

/** Fecha de hoy en Argentina (YYYY-MM-DD). */
export function hoyAR(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}
