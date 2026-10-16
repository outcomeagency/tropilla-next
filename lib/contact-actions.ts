"use server";

import { api, ApiError } from "./api";
import { hasLocale, type Locale } from "./i18n";
import { getPortalDict } from "./i18n/portal";
import { isMockable } from "./mock/fallback";
import type { One, S } from "./schemas";

export interface ContactState {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  sent?: { demo: boolean };
}

const TIPOS = ["frigorifico", "exportador", "gastronomico", "institucion", "productor", "otro"] as const;
/** Menos de esto entre render y envío = bot (trampa de tiempo, además del honeypot y Turnstile). */
const MIN_MS = 2500;

/**
 * Contacto sin cuenta (flujo 19, TPA-55). Antispam en capas: honeypot `website`,
 * trampa de tiempo, Turnstile (si hay clave) y rate limit 3/h/IP de la API.
 * La confirmación sale en el idioma del comprador.
 */
export async function contactAction(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const rawLocale = String(fd.get("idioma") ?? "es");
  const locale: Locale = hasLocale(rawLocale) ? rawLocale : "es";
  const t = getPortalDict(locale).contact;
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const values = { nombre: v("nombre"), empresa: v("empresa"), pais: v("pais"), email: v("email"), telefono: v("telefono"), tipo_comprador: v("tipo_comprador"), volumen: v("volumen"), mensaje: v("mensaje") };

  // Bots: respuesta igual a un éxito para no darles señal, sin llamar a la API.
  const renderedAt = Number(fd.get("t") ?? 0);
  if (v("website") || (renderedAt && Date.now() - renderedAt < MIN_MS)) return { sent: { demo: false } };

  const fields: Record<string, string> = {};
  if (values.nombre.length < 2) fields.nombre = t.errors.name;
  if (!values.pais) fields.pais = t.errors.country;
  if (!values.email && !values.telefono) fields.email = t.errors.contact;
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fields.email = t.errors.email;
  if (!(TIPOS as readonly string[]).includes(values.tipo_comprador)) fields.tipo_comprador = t.errors.type;
  if (values.mensaje.length < 20) fields.mensaje = t.errors.message;
  if (Object.keys(fields).length) return { fields, values, error: t.errors.fix };

  const body: S<"ConsultaPublicaInput"> = {
    establecimiento_slug: v("establecimiento_slug") || null,
    oferta_codigo: v("oferta_codigo") || null,
    nombre: values.nombre,
    empresa: values.empresa || null,
    pais: values.pais,
    email: values.email || null,
    telefono: values.telefono || null,
    tipo_comprador: values.tipo_comprador as S<"ConsultaPublicaInput">["tipo_comprador"],
    volumen: values.volumen || null,
    mensaje: values.mensaje.slice(0, 4000),
    idioma: locale,
    captcha_token: v("cf-turnstile-response") || "sin-turnstile",
    website: null,
  };

  try {
    await api<One<S<"ConsultaPublicaRespuesta">>>("/public/consultas", {
      method: "POST",
      body,
      auth: false,
      locale,
      headers: { "Idempotency-Key": v("idem") || crypto.randomUUID() },
    });
    return { sent: { demo: false } };
  } catch (e) {
    if (isMockable(e)) return { sent: { demo: true } };
    if (e instanceof ApiError) {
      if (e.status === 429) return { error: t.errors.rate, values };
      if (e.status === 422) {
        const f: Record<string, string> = {};
        for (const k of ["nombre", "pais", "email", "telefono", "tipo_comprador", "mensaje"]) {
          const m = e.field(k);
          if (m) f[k === "telefono" ? "email" : k] = m;
        }
        if (e.field("captcha_token")) return { error: t.errors.spam, values };
        return { fields: f, values, error: t.errors.fix };
      }
    }
    return { error: t.errors.generic, values };
  }
}
