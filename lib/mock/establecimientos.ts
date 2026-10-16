/**
 * ⚠ DATOS DE EJEMPLO ⚠ — establecimientos de la sesión demo (lib/mock/auth.ts).
 * Reemplazado por GET /establecimientos (TPA-12).
 */
import type { S } from "@/lib/schemas";
import { mockMe } from "./auth";

const BASE: Record<string, Partial<S<"Establecimiento">>> = {
  "01920000-0000-7000-8000-000000000e01": {
    provincia_codigo: "18",
    departamento_codigo: "18063",
    localidad: "Caá Catí",
    superficie_ha: "2400",
    actividades: ["cria", "recria", "invernada"],
    especies: ["BOV", "BUB"],
  },
  "01920000-0000-7000-8000-000000000e02": {
    provincia_codigo: "18",
    departamento_codigo: "18105",
    localidad: null,
    superficie_ha: "860",
    actividades: ["cria"],
    especies: ["BOV"],
  },
  "01920000-0000-7000-8000-000000000e03": {
    provincia_codigo: "18",
    departamento_codigo: "18084",
    localidad: "Villa Olivari",
    superficie_ha: "1350",
    actividades: ["cria", "recria"],
    especies: ["BUB"],
  },
};

export function mockEstablecimientos(): S<"Establecimiento">[] {
  return mockMe().membresias.map((m) => ({
    id: m.establecimiento_id,
    nombre: m.establecimiento_nombre ?? "",
    especies: ["BOV"],
    mi_rol: m.rol,
    abilities: m.abilities,
    ...BASE[m.establecimiento_id],
  }));
}
