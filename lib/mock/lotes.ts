/**
 * ⚠ DATOS DE EJEMPLO ⚠ — lotes de manejo (GET /establecimientos/{e}/lotes, TPA-20).
 * Mismos lotes para cualquier establecimiento mientras la API no los publique.
 */
import type { S } from "@/lib/schemas";

export interface MockLoteExtra {
  /** Para los avisos previos a publicar (GET …/ofertas/{o}/avisos). */
  retiroHasta?: string;
  edad?: { min: number; max: number };
  raza: string;
  sanidad: Array<{ evento: string; detalle: string; fecha: string; confianza: "declarado" | "integridad_registrada" }>;
}

export const MOCK_LOTES: Array<S<"Lote"> & { extra: MockLoteExtra }> = [
  {
    id: "01920000-0000-7000-8000-00000000b012",
    nombre: "B-12 · Bubillos recría 2024",
    especie: "BUB",
    proposito: "venta",
    anonimo: false,
    potrero: { id: "p1", nombre: "Estero Grande" },
    cabezas_individuales: 30,
    cabezas_anonimas: 0,
    conteo: { BUB_BUBILLO: 30 },
    peso_promedio_kg: "468",
    peso_promedio_fecha: "2026-10-10",
    gdp_promedio_kg_dia: "0.61",
    extra: {
      raza: "BUB_MEDITERRANEA",
      edad: { min: 24, max: 28 },
      sanidad: [
        { evento: "Aftosa", detalle: "2ª campaña 2026", fecha: "2026-05-14", confianza: "integridad_registrada" },
        { evento: "Rabia paresiante", detalle: "Refuerzo anual", fecha: "2026-06-02", confianza: "integridad_registrada" },
      ],
    },
  },
  {
    id: "01920000-0000-7000-8000-00000000b008",
    nombre: "B-08 · Búfalas en servicio",
    especie: "BUB",
    proposito: "cria",
    anonimo: false,
    potrero: { id: "p2", nombre: "Bañado Norte" },
    cabezas_individuales: 28,
    cabezas_anonimas: 0,
    conteo: { BUB_BUFALA: 28 },
    peso_promedio_kg: "585",
    peso_promedio_fecha: "2026-08-30",
    gdp_promedio_kg_dia: null,
    extra: {
      raza: "BUB_MEDITERRANEA",
      edad: { min: 48, max: 96 },
      sanidad: [{ evento: "Brucelosis", detalle: "Sangrado negativo", fecha: "2026-03-11", confianza: "integridad_registrada" }],
    },
  },
  {
    id: "01920000-0000-7000-8000-00000000c003",
    nombre: "L-03 · Terneros destete 2026",
    especie: "BOV",
    proposito: "venta",
    anonimo: false,
    potrero: { id: "p3", nombre: "Lote 3" },
    cabezas_individuales: 45,
    cabezas_anonimas: 0,
    conteo: { BOV_TERNERO: 45 },
    peso_promedio_kg: "186",
    peso_promedio_fecha: "2026-10-03",
    gdp_promedio_kg_dia: "0.74",
    extra: {
      raza: "BOV_BRAFORD",
      edad: { min: 6, max: 8 },
      sanidad: [{ evento: "Clostridiales", detalle: "Dos dosis", fecha: "2026-09-01", confianza: "integridad_registrada" }],
    },
  },
  {
    id: "01920000-0000-7000-8000-00000000c005",
    nombre: "L-05 · Vaquillonas de reposición",
    especie: "BOV",
    proposito: "recria",
    anonimo: true,
    potrero: { id: "p5", nombre: "Lote 5" },
    cabezas_individuales: 12,
    cabezas_anonimas: 40,
    conteo: { BOV_VAQUILLONA: 52 },
    peso_promedio_kg: "298",
    peso_promedio_fecha: "2026-06-20",
    gdp_promedio_kg_dia: null,
    extra: { raza: "BOV_BRAFORD", edad: { min: 15, max: 18 }, sanidad: [] },
  },
  {
    id: "01920000-0000-7000-8000-00000000c007",
    nombre: "L-07 · Novillos invernada",
    especie: "BOV",
    proposito: "venta",
    anonimo: false,
    potrero: { id: "p7", nombre: "La Loma" },
    cabezas_individuales: 80,
    cabezas_anonimas: 0,
    conteo: { BOV_NOVILLO: 80 },
    peso_promedio_kg: "402",
    peso_promedio_fecha: "2026-09-28",
    gdp_promedio_kg_dia: "0.58",
    extra: {
      raza: "BOV_BRANGUS",
      edad: { min: 26, max: 30 },
      retiroHasta: "2026-10-30",
      sanidad: [{ evento: "Antiparasitario (ivermectina)", detalle: "Retiro de 35 días", fecha: "2026-09-25", confianza: "declarado" }],
    },
  },
];
