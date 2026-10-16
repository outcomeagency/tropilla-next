/**
 * Categorías de manejo y razas (modelo-datos §5) con nombres en es/en/pt para
 * filtros y fichas públicas. Mientras `/catalogos` no publique los nombres
 * traducidos, se usa esta tabla; los códigos son los del contrato.
 */
import type { Locale } from "@/lib/i18n";

type T = Record<Locale, string>;

export const CATEGORIAS: Array<{ codigo: string; especie: "BOV" | "BUB"; nombres: T }> = [
  { codigo: "BOV_TERNERO", especie: "BOV", nombres: { es: "Terneros", en: "Bull calves", pt: "Bezerros" } },
  { codigo: "BOV_TERNERA", especie: "BOV", nombres: { es: "Terneras", en: "Heifer calves", pt: "Bezerras" } },
  { codigo: "BOV_NOVILLITO", especie: "BOV", nombres: { es: "Novillitos", en: "Young steers", pt: "Garrotes" } },
  { codigo: "BOV_NOVILLO", especie: "BOV", nombres: { es: "Novillos", en: "Steers", pt: "Bois" } },
  { codigo: "BOV_VAQUILLONA", especie: "BOV", nombres: { es: "Vaquillonas", en: "Heifers", pt: "Novilhas" } },
  { codigo: "BOV_VACA", especie: "BOV", nombres: { es: "Vacas", en: "Cows", pt: "Vacas" } },
  { codigo: "BOV_TORITO", especie: "BOV", nombres: { es: "Toritos", en: "Young bulls", pt: "Tourinhos" } },
  { codigo: "BOV_TORO", especie: "BOV", nombres: { es: "Toros", en: "Bulls", pt: "Touros" } },
  { codigo: "BUB_BUCERRO", especie: "BUB", nombres: { es: "Bucerros", en: "Buffalo bull calves", pt: "Bezerros bubalinos" } },
  { codigo: "BUB_BUCERRA", especie: "BUB", nombres: { es: "Bucerras", en: "Buffalo heifer calves", pt: "Bezerras bubalinas" } },
  { codigo: "BUB_BUBILLITO", especie: "BUB", nombres: { es: "Bubillitos", en: "Young buffalo steers", pt: "Garrotes bubalinos" } },
  { codigo: "BUB_BUBILLO", especie: "BUB", nombres: { es: "Bubillos", en: "Buffalo steers", pt: "Bois bubalinos" } },
  { codigo: "BUB_BUBILLA", especie: "BUB", nombres: { es: "Bubillas", en: "Buffalo heifers", pt: "Novilhas bubalinas" } },
  { codigo: "BUB_BUFALA", especie: "BUB", nombres: { es: "Búfalas", en: "Buffalo cows", pt: "Búfalas" } },
  { codigo: "BUB_BUTORITO", especie: "BUB", nombres: { es: "Butoritos", en: "Young buffalo bulls", pt: "Tourinhos bubalinos" } },
  { codigo: "BUB_BUFALO_TORO", especie: "BUB", nombres: { es: "Búfalos toro", en: "Buffalo bulls", pt: "Touros bubalinos" } },
];

export const RAZAS: Array<{ codigo: string; especie: "BOV" | "BUB"; nombre: string }> = [
  { codigo: "BOV_BRAFORD", especie: "BOV", nombre: "Braford" },
  { codigo: "BOV_BRANGUS", especie: "BOV", nombre: "Brangus" },
  { codigo: "BOV_HEREFORD", especie: "BOV", nombre: "Hereford" },
  { codigo: "BOV_ANGUS", especie: "BOV", nombre: "Aberdeen Angus" },
  { codigo: "BOV_BRAHMAN", especie: "BOV", nombre: "Brahman" },
  { codigo: "BOV_NELORE", especie: "BOV", nombre: "Nelore" },
  { codigo: "BOV_CRIOLLO", especie: "BOV", nombre: "Criollo" },
  { codigo: "BOV_CRUZA_CEBUINA", especie: "BOV", nombre: "Cruza cebuina" },
  { codigo: "BUB_MEDITERRANEA", especie: "BUB", nombre: "Mediterránea" },
  { codigo: "BUB_MURRAH", especie: "BUB", nombre: "Murrah" },
  { codigo: "BUB_JAFARABADI", especie: "BUB", nombre: "Jafarabadi" },
  { codigo: "BUB_CRUZA", especie: "BUB", nombre: "Cruza bubalina" },
];

const CAT = new Map(CATEGORIAS.map((c) => [c.codigo, c]));
const RAZA = new Map(RAZAS.map((r) => [r.codigo, r]));

export function categoriaNombre(codigo: string, locale: Locale = "es"): string {
  return CAT.get(codigo)?.nombres[locale] ?? codigo;
}

export function razaNombre(codigo: string): string {
  return RAZA.get(codigo)?.nombre ?? codigo;
}
