import "server-only";
import { api, ApiError } from "./api";
import type { One, S } from "./schemas";
import { uuidv7 } from "./uuid";

export { uuidv7 };

/** Resultado común de una Server Action que registra/corrige un evento. */
export interface EventoActionState {
  error?: string;
  /** Advertencias de coherencia (422 requiere_confirmacion): se muestran y el usuario confirma. */
  advertencias?: string[];
  /** Errores por campo (422 validacion). Claves = nombres del formulario. */
  fields?: Record<string, string>;
  ok?: { mensaje: string; id?: string; cantidad?: number };
}

/**
 * Traduce un error de la API a estado de formulario. `campos` mapea claves de
 * la API (`payload.peso_kg`) a nombres del formulario (`peso_kg`).
 */
export function estadoDeError(e: unknown, campos: Record<string, string> = {}, fallback = "No pudimos guardar. Probá de nuevo."): EventoActionState {
  if (e instanceof ApiError) {
    if (e.code === "requiere_confirmacion") {
      const adv = e.advertencias?.length ? e.advertencias : Object.values(e.errors ?? {}).flat();
      return { advertencias: adv.length ? adv : [e.message] };
    }
    if (e.status === 422) {
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(e.errors ?? {})) {
        const name = campos[k] ?? campos[k.replace(/^payload\./, "")] ?? k.replace(/^payload\./, "");
        if (v[0]) fields[name] = v[0];
      }
      const msgs = Object.values(fields);
      return { fields, error: msgs.length === 1 ? msgs[0] : msgs.length ? "Revisá los datos marcados." : e.message };
    }
    if (e.status === 409) {
      if (e.code === "conflicto_row_version") return { error: "Alguien guardó cambios mientras editabas. Recargá la página para ver la versión nueva y volvé a aplicar lo tuyo." };
      if (e.code === "version_no_vigente") return { error: "Este evento ya tiene una versión más nueva. Abrí la vigente para corregirla." };
      return { error: e.message };
    }
    if (e.status === 403) return { error: "Tu rol no permite hacer esto en este establecimiento." };
    if (e.unreachable) return { error: "No pudimos conectar con TROPILLA. Tus datos siguen acá: probá de nuevo." };
    if (e.routeMissing) return { error: "Esta acción todavía no está habilitada en la API. Tus datos no se guardaron." };
  }
  return { error: fallback };
}

/** POST …/eventos (web: el servidor arma el sobre, la huella y la cadena; api-v1 §5.1). */
export async function postEvento(est: string, body: S<"EventoInput">) {
  return api<One<S<"Evento">>>(`/establecimientos/${est}/eventos`, { method: "POST", body: { ...body, id: body.id || uuidv7() } }).then((r) => r.data);
}

/** Lectores de FormData tolerantes. */
export const fdStr = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const fdOpt = (fd: FormData, k: string) => fdStr(fd, k) || undefined;
export const isFecha = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
/** «412,5» → «412.5» (string decimal canónico, api-v1 §5). undefined si vacío; null si inválido. */
export function decimal(s: string): string | undefined | null {
  const t = s.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!t) return undefined;
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return t.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
