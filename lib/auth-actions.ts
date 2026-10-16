"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { clearSession, getToken, setSession } from "./session";
import { MOCK_ENABLED } from "./mock/fallback";
import { DEMO_EMAIL, DEMO_PASSWORD, MOCK_TOKEN_PREFIX } from "./mock/auth";
import type { One, S } from "./schemas";

/** Estado de los formularios de cuenta (useActionState). */
export interface FormState {
  error?: string;
  /** Errores por campo (422 `validacion`). */
  fields?: Record<string, string>;
  /** Valores para volver a llenar el formulario (nunca la contraseña). */
  values?: Record<string, string>;
  /** Éxito sin redirección (ej. «te mandamos el email»). */
  done?: boolean;
}

/** Sólo rutas internas: evita open redirects con ?next=https://… */
function safeNext(value: FormDataEntryValue | null, fallback = "/inicio"): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** «Email o teléfono» en un solo campo: si tiene @ es email. */
function identificador(raw: string): { email: string | null; telefono: string | null } {
  const v = raw.trim();
  if (v.includes("@")) return { email: v.toLowerCase(), telefono: null };
  return { email: null, telefono: v.replace(/[^\d+]/g, "") };
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Mapea `errors` del 422 a los nombres de campo del formulario. */
function fieldErrors(e: ApiError, map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [apiKey, formKey] of Object.entries(map)) {
    const msg = e.field(apiKey);
    if (msg) out[formKey] = msg;
  }
  return out;
}

function commonError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.unreachable) return "No pudimos conectar con TROPILLA. Probá de nuevo en unos minutos.";
    if (e.status === 429) return "Demasiados intentos. Esperá un minuto y volvé a probar.";
  }
  return "Algo falló de nuestro lado. Probá de nuevo.";
}

/* ───────────────────────── Ingresar ───────────────────────── */

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const usuario = str(formData, "usuario");
  const password = String(formData.get("password") ?? "");
  const values = { usuario };

  const fields: Record<string, string> = {};
  if (!usuario) fields.usuario = "Escribí tu email o tu teléfono.";
  if (!password) fields.password = "Escribí tu contraseña.";
  if (Object.keys(fields).length) return { fields, values };

  try {
    const res = await api<One<S<"TokenRespuesta">>>("/auth/login", {
      method: "POST",
      body: { ...identificador(usuario), password, cliente: "web" } satisfies S<"LoginInput">,
      auth: false,
    });
    await setSession(res.data.token);
  } catch (e) {
    if (e instanceof ApiError && MOCK_ENABLED && (e.routeMissing || e.unreachable)) {
      // ⚠ Sesión demo mientras la API no tenga /auth/login (lib/mock/auth.ts).
      if (usuario.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        await setSession(`${MOCK_TOKEN_PREFIX}demo`);
        redirect(safeNext(formData.get("next")));
      }
      return {
        error: e.unreachable
          ? "No pudimos conectar con TROPILLA. Probá de nuevo en unos minutos."
          : "El ingreso todavía no está habilitado en este entorno. Usá la cuenta demo.",
        values,
      };
    }
    if (e instanceof ApiError && (e.status === 401 || e.status === 422)) {
      return { error: "El email, el teléfono o la contraseña no coinciden.", values };
    }
    return { error: commonError(e), values };
  }

  redirect(safeNext(formData.get("next")));
}

/* ───────────────────────── Registro ───────────────────────── */

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const nombre = str(formData, "nombre");
  const usuario = str(formData, "usuario");
  const password = String(formData.get("password") ?? "");
  const terminos = formData.get("terminos") === "on";
  const values = { nombre, usuario };

  const fields: Record<string, string> = {};
  if (nombre.length < 3) fields.nombre = "Escribí tu nombre y apellido.";
  const id = identificador(usuario);
  if (!usuario) fields.usuario = "Escribí un email o un teléfono.";
  else if (id.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id.email)) fields.usuario = "Revisá el email: parece incompleto.";
  else if (id.telefono && id.telefono.replace(/\D/g, "").length < 8) fields.usuario = "Revisá el teléfono: incluí la característica (ej. 3794 123456).";
  if (password.length < 8) fields.password = "Usá al menos 8 caracteres.";
  if (!terminos) fields.terminos = "Para crear la cuenta tenés que aceptar los términos y la política de privacidad.";
  if (Object.keys(fields).length) return { fields, values };

  try {
    const res = await api<One<S<"TokenRespuesta">>>("/auth/register", {
      method: "POST",
      body: { nombre, ...id, password, idioma: "es", cliente: "web" } satisfies S<"RegisterInput">,
      auth: false,
    });
    await setSession(res.data.token);
  } catch (e) {
    if (e instanceof ApiError && MOCK_ENABLED && e.routeMissing) {
      // ⚠ Registro demo: la cuenta no se guarda; sirve para recorrer el onboarding.
      const payload = Buffer.from(`${nombre}|${id.email ?? id.telefono ?? ""}`, "utf8").toString("base64url");
      await setSession(`${MOCK_TOKEN_PREFIX}new.${payload}`);
      redirect("/bienvenida");
    }
    if (e instanceof ApiError && e.status === 422) {
      const f = fieldErrors(e, { nombre: "nombre", email: "usuario", telefono: "usuario", password: "password" });
      return { fields: f, error: Object.keys(f).length ? undefined : e.message, values };
    }
    return { error: commonError(e), values };
  }

  redirect("/bienvenida");
}

/* ───────────────────────── Recuperar contraseña ───────────────────────── */

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const usuario = str(formData, "usuario");
  if (!usuario) return { fields: { usuario: "Escribí el email o el teléfono de tu cuenta." } };
  try {
    await api("/auth/password/olvide", { method: "POST", body: identificador(usuario), auth: false });
  } catch (e) {
    // El endpoint siempre responde 204 (no revela si la cuenta existe). Si todavía
    // no existe en la API, mostramos el mismo mensaje: no hay nada que filtrar.
    if (!(e instanceof ApiError && e.routeMissing)) return { error: commonError(e), values: { usuario } };
  }
  return { done: true, values: { usuario } };
}

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = str(formData, "token");
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");
  const fields: Record<string, string> = {};
  if (password.length < 8) fields.password = "Usá al menos 8 caracteres.";
  if (password !== confirmacion) fields.confirmacion = "Las dos contraseñas no coinciden.";
  if (!token) return { error: "El enlace no es válido. Pedí uno nuevo." };
  if (Object.keys(fields).length) return { fields };

  try {
    await api("/auth/password/restablecer", { method: "POST", body: { token, password }, auth: false });
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      return { error: "El enlace venció o ya se usó. Pedí uno nuevo desde «Olvidé mi contraseña»." };
    }
    return { error: commonError(e) };
  }
  await clearSession();
  return { done: true };
}

/* ───────────────────────── Verificación de email ───────────────────────── */

export async function resendVerificationAction(): Promise<FormState> {
  if (!(await getToken())) redirect("/ingresar");
  try {
    await api("/auth/email/reenviar", { method: "POST" });
  } catch (e) {
    if (!(e instanceof ApiError && e.routeMissing)) return { error: commonError(e) };
  }
  return { done: true };
}

/* ───────────────────────── Salir ───────────────────────── */

export async function logoutAction(): Promise<void> {
  try {
    const token = await getToken();
    if (token && !token.startsWith(MOCK_TOKEN_PREFIX)) await api("/auth/logout", { method: "POST", timeoutMs: 4_000 });
  } catch {
    // La sesión local se cierra igual aunque la API no responda.
  }
  await clearSession();
  redirect("/ingresar");
}
