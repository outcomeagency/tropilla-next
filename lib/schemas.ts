/**
 * Alias legibles de los schemas del contrato (lib/api-types.ts, generado con
 * `npm run api:types` desde brain/technical/openapi-v1.yaml). No editar
 * lib/api-types.ts a mano: regenerarlo cuando cambie el YAML.
 */
import type { components } from "./api-types";

export type Schemas = components["schemas"];
export type S<K extends keyof Schemas> = Schemas[K];

/** Envoltorio de objeto único y de colección (api-v1 §5). */
export interface One<T> {
  data: T;
}
export interface Many<T> {
  data: T[];
  meta?: { next_cursor?: string | null; prev_cursor?: string | null; limit?: number };
}

export type RolMembresia = S<"MembresiaResumen">["rol"];
export type EspecieCodigo = "BOV" | "BUB";
