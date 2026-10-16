"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { getToken, setSession } from "./session";
import { setActiveEstablecimiento } from "./establecimiento";
import { MOCK_ENABLED } from "./mock/fallback";
import { MOCK_TOKEN_PREFIX } from "./mock/auth";
import type { One, S } from "./schemas";

export interface OnboardingState {
  error?: string;
  fields?: Record<string, string>;
  /** Paso al que volver para corregir. */
  step?: number;
}

const STEP_OF: Record<string, number> = {
  tipo: 0,
  productor_nombre: 0,
  cuit: 0,
  nombre: 1,
  provincia: 1,
  departamento: 1,
  localidad: 1,
  superficie: 1,
  renspa: 1,
  especies: 2,
  actividades: 2,
};

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/**
 * Alta de productor + primer establecimiento (flujo 1, TPA-10). El usuario
 * queda Dueño. CUIT y RENSPA se mandan pero nunca se publican (privados por
 * contrato: sólo dueño/admin los ven).
 */
export async function onboardingAction(_prev: OnboardingState, fd: FormData): Promise<OnboardingState> {
  const token = await getToken();
  if (!token) redirect("/ingresar?next=/bienvenida");

  const tipo = str(fd, "tipo") as "persona_humana" | "sociedad";
  const especies = fd.getAll("especies").map(String) as Array<"BOV" | "BUB">;
  const actividades = fd.getAll("actividades").map(String);
  const cuit = str(fd, "cuit").replace(/\D/g, "");
  const superficie = str(fd, "superficie").replace(",", ".");

  const fields: Record<string, string> = {};
  if (!["persona_humana", "sociedad"].includes(tipo)) fields.tipo = "Elegí si sos persona o sociedad.";
  if (str(fd, "productor_nombre").length < 2) fields.productor_nombre = "Escribí el nombre o la razón social.";
  if (cuit && cuit.length !== 11) fields.cuit = "El CUIT tiene 11 números.";
  if (str(fd, "nombre").length < 2) fields.nombre = "Escribí el nombre del establecimiento.";
  if (!str(fd, "provincia")) fields.provincia = "Elegí la provincia.";
  if (!str(fd, "departamento")) fields.departamento = "Elegí el departamento.";
  if (superficie && !/^\d+(\.\d+)?$/.test(superficie)) fields.superficie = "Usá sólo números (ej. 2400).";
  if (!especies.length) fields.especies = "Marcá al menos una especie.";
  if (!actividades.length) fields.actividades = "Marcá al menos una actividad.";
  if (Object.keys(fields).length) {
    return { fields, step: Math.min(...Object.keys(fields).map((k) => STEP_OF[k] ?? 0)) };
  }

  const garrapata = str(fd, "garrapata");
  const body: S<"OnboardingInput"> = {
    productor: { tipo, nombre: str(fd, "productor_nombre"), cuit: cuit || null },
    establecimiento: {
      nombre: str(fd, "nombre"),
      provincia_codigo: str(fd, "provincia"),
      departamento_codigo: str(fd, "departamento"),
      localidad: str(fd, "localidad") || null,
      superficie_ha: superficie || null,
      renspa: str(fd, "renspa") || null,
      especies,
      actividades,
      zonas_sanitarias: {
        aftosa_zona: str(fd, "aftosa") || null,
        garrapata: (garrapata || null) as S<"ZonasSanitarias">["garrapata"],
        rabia_endemica: fd.get("rabia") === "on",
        fasciola_endemica: fd.get("fasciola") === "on",
      },
    },
  };

  let creado = "";
  try {
    const res = await api<One<S<"Establecimiento">>>("/onboarding", { method: "POST", body });
    await setActiveEstablecimiento(res.data.id);
    creado = res.data.nombre;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 422) {
        const map: Record<string, string> = {
          "productor.tipo": "tipo",
          "productor.nombre": "productor_nombre",
          "productor.cuit": "cuit",
          "establecimiento.nombre": "nombre",
          "establecimiento.provincia_codigo": "provincia",
          "establecimiento.departamento_codigo": "departamento",
          "establecimiento.superficie_ha": "superficie",
          "establecimiento.renspa": "renspa",
          "establecimiento.especies": "especies",
          "establecimiento.actividades": "actividades",
        };
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(map)) {
          const m = e.field(k);
          if (m) f[v] = m;
        }
        const step = Object.keys(f).length ? Math.min(...Object.keys(f).map((k) => STEP_OF[k] ?? 0)) : undefined;
        return { fields: f, step, error: Object.keys(f).length ? "Revisá los datos marcados." : e.message };
      }
      if (MOCK_ENABLED && (e.routeMissing || e.unreachable) && token.startsWith(MOCK_TOKEN_PREFIX)) {
        // ⚠ Sesión demo: el alta no se guarda; seguimos con el establecimiento de ejemplo.
        await setSession(`${MOCK_TOKEN_PREFIX}demo`);
        redirect(`/bienvenida/listo?establecimiento=${encodeURIComponent(body.establecimiento.nombre ?? "")}&demo=1`);
      }
      if (e.routeMissing) {
        return { error: "El alta de establecimientos todavía no está habilitada en este entorno. Probá más tarde: tus datos no se guardaron." };
      }
      if (e.unreachable) return { error: "No pudimos conectar con TROPILLA. Tus datos siguen acá: probá de nuevo." };
    }
    return { error: "Algo falló al guardar. Tus datos siguen acá: probá de nuevo." };
  }
  redirect(`/bienvenida/listo?establecimiento=${encodeURIComponent(creado)}`);
}
