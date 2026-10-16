/**
 * Correcciones de eventos (TPA-26): qué campos del payload se pueden corregir
 * desde la web, derivados del JSON Schema v1 del tipo (catálogo), y el diff
 * entre versiones para «Ver cambios». Sin dependencias de servidor.
 */
import type { JsonSchema } from "@/lib/data/catalogos";
import { ETIQUETAS, VALORES } from "@/lib/eventos-hacienda";

export type Kind = "enum" | "decimal" | "int" | "text" | "textarea" | "fecha" | "bool" | "codigo" | "uuid";

/** Referencias que la web sabe ofrecer como lista (potreros, lotes). */
const UUID_EDITABLES = ["potrero_destino_id", "lote_destino_id"];

export interface CampoEditable {
  path: string;
  label: string;
  kind: Kind;
  opciones?: Array<[string, string]>;
  requerido: boolean;
}

function resolver(s: JsonSchema | undefined, defs: Record<string, JsonSchema>): JsonSchema | undefined {
  if (s?.$ref) return resolver({ ...defs[s.$ref.split("/").pop() ?? ""], ...(s.enum ? { enum: s.enum } : {}) }, defs) ?? s;
  return s;
}

function kindDe(ref: string | undefined, s: JsonSchema): Kind | null {
  const nombre = ref?.split("/").pop();
  if (s.enum) return "enum";
  if (nombre === "decimal" || nombre === "decimal_pos") return "decimal";
  if (nombre === "texto") return "textarea";
  if (nombre === "texto_corto") return "text";
  if (nombre === "fecha") return "fecha";
  if (nombre === "codigo") return "codigo";
  if (nombre === "uuid") return "uuid";
  if (s.type === "integer") return "int";
  if (s.type === "boolean") return "bool";
  if (s.type === "string") return (s.maxLength ?? 200) > 200 ? "textarea" : "text";
  return null;
}

/** Campos escalares (y un nivel de objetos anidados) editables del tipo. Arrays (animales, crías) no se corrigen desde acá. */
export function camposEditables(schema: JsonSchema | null | undefined): CampoEditable[] {
  if (!schema?.properties) return [];
  const defs = schema.$defs ?? {};
  const req = new Set(schema.required ?? []);
  const out: CampoEditable[] = [];
  const visitar = (props: Record<string, JsonSchema>, prefijo: string, requeridos: Set<string>) => {
    for (const [k, raw] of Object.entries(props)) {
      const s = resolver(raw, defs) ?? raw;
      if (s.type === "object" && s.properties) {
        if (!prefijo) visitar(s.properties, `${k}.`, new Set(s.required ?? []));
        continue;
      }
      const kind = kindDe(raw.$ref, s);
      if (!kind) continue;
      if (kind === "uuid" && !UUID_EDITABLES.includes(k)) continue;
      if (["sugerida", "regla_id"].includes(k)) continue;
      const base = ETIQUETAS[k] ?? k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
      out.push({
        path: prefijo + k,
        label: prefijo ? `${ETIQUETAS[prefijo.slice(0, -1)] ?? prefijo.slice(0, -1)} · ${base}` : base,
        kind,
        opciones: s.enum ? (s.enum as unknown[]).filter((v) => typeof v === "string").map((v) => [String(v), VALORES[String(v)] ?? String(v)]) : undefined,
        requerido: requeridos.has(k),
      });
    }
  };
  visitar(schema.properties, "", req);
  return out;
}

export function leer(obj: Record<string, unknown> | undefined, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function escribir(obj: Record<string, unknown>, path: string, v: unknown) {
  const ks = path.split(".");
  let o = obj;
  for (const k of ks.slice(0, -1)) {
    if (!o[k] || typeof o[k] !== "object") o[k] = {};
    o = o[k] as Record<string, unknown>;
  }
  const last = ks.at(-1)!;
  if (v === undefined) delete o[last];
  else o[last] = v;
  // Objetos que quedaron vacíos se sacan (el schema no admite {} con requeridos).
  if (ks.length > 1 && !Object.keys(o).length) delete obj[ks[0]];
}

export interface Cambio {
  campo: string;
  antes: unknown;
  despues: unknown;
}

/** Diferencias entre dos versiones (payload aplanado + fecha + observaciones). */
export function diff(
  a: { payload?: Record<string, unknown>; ocurrido_en?: string; observaciones?: string | null },
  b: { payload?: Record<string, unknown>; ocurrido_en?: string; observaciones?: string | null },
): Cambio[] {
  const plano = (p: Record<string, unknown> = {}, pre = ""): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(p).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? Object.entries(plano(v as Record<string, unknown>, `${pre}${k}.`)) : [[pre + k, v]])),
    );
  const pa = plano(a.payload);
  const pb = plano(b.payload);
  const out: Cambio[] = [];
  if ((a.ocurrido_en ?? "").slice(0, 10) !== (b.ocurrido_en ?? "").slice(0, 10)) out.push({ campo: "Fecha", antes: a.ocurrido_en?.slice(0, 10), despues: b.ocurrido_en?.slice(0, 10) });
  for (const k of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
    if (JSON.stringify(pa[k]) !== JSON.stringify(pb[k])) {
      const [p, h] = k.split(".");
      out.push({ campo: h ? `${ETIQUETAS[p] ?? p} · ${ETIQUETAS[h] ?? h}` : (ETIQUETAS[p] ?? p.replace(/_/g, " ")), antes: pa[k], despues: pb[k] });
    }
  }
  if ((a.observaciones ?? "") !== (b.observaciones ?? "")) out.push({ campo: "Observaciones", antes: a.observaciones, despues: b.observaciones });
  return out;
}
