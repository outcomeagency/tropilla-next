/**
 * ⚠ DATOS DE EJEMPLO — REEMPLAZAR POR LA API ⚠
 *
 * Datos fijos de brain/design/prompt-claude-design.md §4 para maquetar el panel
 * mientras no existen los endpoints. Cada export indica el endpoint que lo va a
 * reemplazar. Nada fuera de las páginas del panel debe importar este archivo, y
 * cuando un endpoint exista se borra el export correspondiente.
 */

import type { Estado } from "./status";
import type { Delta, Especie, NivelConfianza } from "./types";

/** → GET /establecimientos (selector de la sidebar). */
export const MOCK_ESTABLECIMIENTO = {
  nombre: "La Esperanza",
  ubicacion: "General Paz, Corrientes",
  productor: "Agropecuaria Don Ramón S.A.",
  hectareas: 2400,
};

/** → GET /auth/me cuando la API no responde (sólo para la maqueta). */
export const MOCK_USUARIO = { nombre: "Ramón Ferreyra", rol: "Dueño" };

/** → GET /establecimientos/{id}/resumen */
export const MOCK_RESUMEN = {
  fecha: "Viernes 16 de octubre",
  ultimaSync: "hace 2 min",
  kpis: [
    { id: "total", label: "cabezas totales", value: 1620, icon: "chart", delta: { value: "+4%", direction: "up", tone: "success" }, hint: "vs. mes anterior", href: "/hacienda" },
    { id: "bovinos", label: "Bovinos", value: 1240, icon: "cow", delta: { value: "+2%", direction: "up", tone: "success" }, hint: "vs. mes anterior", href: "/hacienda?especie=bovino" },
    { id: "bubalinos", label: "Bubalinos", value: 380, icon: "buffalo", delta: { value: "+8%", direction: "up", tone: "success" }, hint: "vs. mes anterior", href: "/hacienda?especie=bubalino" },
    { id: "prenez", label: "Preñez bubalina", value: "78%", icon: "heart", delta: { value: "−3%", direction: "down", tone: "danger" }, hint: "vs. campaña anterior", href: "/reproduccion" },
  ] satisfies Array<{
    id: string;
    label: string;
    value: number | string;
    icon: "chart" | "cow" | "buffalo" | "heart";
    delta: Delta;
    hint: string;
    href: string;
  }>,
};

export interface CategoriaStock {
  categoria: string;
  cabezas: number;
}

/** → GET /establecimientos/{id}/existencias (proyección por especie y categoría). */
export const MOCK_EXISTENCIAS: Record<Especie, CategoriaStock[]> = {
  bovino: [
    { categoria: "Vacas", cabezas: 620 },
    { categoria: "Vaquillonas", cabezas: 180 },
    { categoria: "Terneros/as", cabezas: 310 },
    { categoria: "Novillos", cabezas: 110 },
    { categoria: "Toros", cabezas: 20 },
  ],
  bubalino: [
    { categoria: "Búfalas", cabezas: 190 },
    { categoria: "Bubillas", cabezas: 60 },
    { categoria: "Bucerros/as", cabezas: 95 },
    { categoria: "Bubillos", cabezas: 30 },
    { categoria: "Búfalos toro", cabezas: 5 },
  ],
};

export interface Pendiente {
  id: string;
  icon: "syringe" | "calendar" | "file" | "message" | "list";
  titulo: string;
  detalle?: string;
  bajada: string;
  estado: Estado;
  href: string;
}

/** → GET /establecimientos/{id}/pendientes?semana=actual */
export const MOCK_PENDIENTES: Pendiente[] = [
  { id: "p1", icon: "syringe", titulo: "Refuerzo de rabia", detalle: "12 bucerros", bajada: "Vence en 3 días", estado: "urgente", href: "/sanidad" },
  { id: "p2", icon: "calendar", titulo: "4 partos probables esta semana", bajada: "Según servicio y diagnóstico", estado: "informativo", href: "/reproduccion" },
  { id: "p3", icon: "file", titulo: "Certificado de aftosa vence en 15 días", bajada: "Renovalo con tu veterinario", estado: "pendiente", href: "/documentos" },
  { id: "p4", icon: "message", titulo: "2 consultas de compradores sin responder", bajada: "Desde el portal y WhatsApp", estado: "por_revisar", href: "/comercializacion" },
  { id: "p5", icon: "list", titulo: "8 animales con recategorización sugerida", bajada: "Según peso y edad", estado: "sugerencia", href: "/hacienda" },
];

export interface Actividad {
  id: string;
  fecha: string;
  evento: string;
  sujeto: string;
  especie: Especie;
  autor: string;
  confianza: NivelConfianza;
}

/** → GET /establecimientos/{id}/eventos?limit=6 (timeline append-only). */
export const MOCK_ACTIVIDAD: Actividad[] = [
  { id: "e1", fecha: "16 oct 2026 · 10:24", evento: "Vacunación (rabia)", sujeto: "Lote B-12 (12 animales)", especie: "bubalino", autor: "María Gómez", confianza: "integridad_registrada" },
  { id: "e2", fecha: "16 oct 2026 · 09:15", evento: "Nacimiento", sujeto: "Caravana 5843", especie: "bubalino", autor: "Juan Pérez", confianza: "declarado" },
  { id: "e3", fecha: "15 oct 2026 · 16:42", evento: "Control de preñez", sujeto: "Lote B-08 (28 animales)", especie: "bubalino", autor: "Lucía Torres", confianza: "integridad_registrada" },
  { id: "e4", fecha: "15 oct 2026 · 11:20", evento: "Traslado entre potreros", sujeto: "Lote 3 → Lote 5", especie: "bovino", autor: "Ramón Ferreyra", confianza: "declarado" },
  { id: "e5", fecha: "14 oct 2026 · 14:08", evento: "Cambio de categoría", sujeto: "Caravana 4721", especie: "bovino", autor: "Sofía Rojas", confianza: "integridad_registrada" },
  { id: "e6", fecha: "14 oct 2026 · 10:33", evento: "Carga de documento", sujeto: "Cert. aftosa N° 28491", especie: "bovino", autor: "Ramón Ferreyra", confianza: "declarado" },
];
