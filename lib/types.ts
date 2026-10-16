/**
 * Tipos compartidos con la API (tropilla-api, /api/v1).
 * Contrato provisorio hasta que exista el OpenAPI del MVP.
 */

export type Rol = "dueno" | "encargado" | "asesor";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

/** Respuesta de POST /auth/login (Sanctum personal access token). */
export interface LoginResponse {
  token: string;
  user: Usuario;
}

export type Especie = "bovino" | "bubalino";

/** Niveles de confianza del MVP. Nunca «certificado» ni «verificado». */
export type NivelConfianza = "declarado" | "integridad_registrada";

/** Estado de sincronización de un registro cargado en el campo. */
export type EstadoSync = "local" | "sincronizado" | "anclado";

/** Variación de un indicador respecto de un período de referencia. */
export type Delta = { value: string; direction: "up" | "down"; tone: "success" | "danger" | "neutral" };
