/**
 * Tipos compartidos con la API (tropilla-api, /api/v1).
 * Tipos de UI. Los de la API salen de lib/schemas.ts (OpenAPI).
 */

/** Usuario y sesión: ver lib/schemas.ts (generado desde el OpenAPI). */

export type Especie = "bovino" | "bubalino";

/** Niveles de confianza del MVP. Nunca «certificado» ni «verificado». */
export type NivelConfianza = "declarado" | "integridad_registrada";

/** Estado de sincronización de un registro cargado en el campo. */
export type EstadoSync = "local" | "sincronizado" | "anclado";

/** Variación de un indicador respecto de un período de referencia. */
export type Delta = { value: string; direction: "up" | "down"; tone: "success" | "danger" | "neutral" };
