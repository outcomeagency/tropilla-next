import { en } from "./en";
import { es, type Dictionary } from "./es";
import { pt } from "./pt";

/** Idiomas de la web pública. El panel es sólo español. */
export const LOCALES = ["es", "en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_LABEL: Record<Locale, string> = { es: "ES", en: "EN", pt: "PT" };
export const LOCALE_HTML_LANG: Record<Locale, string> = { es: "es-AR", en: "en", pt: "pt-BR" };

const DICTIONARIES: Record<Locale, Dictionary> = { es, en, pt };

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
