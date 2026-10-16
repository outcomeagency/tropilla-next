import "server-only";
import { api } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { One, S } from "@/lib/schemas";

/** Configuración del perfil público del establecimiento (TPA-50). */
export async function getPerfilConfig(est: string) {
  return (await api<One<S<"Perfil">>>(`/establecimientos/${est}/perfil`)).data;
}

/** Vista previa «como la ve el comprador» con la config actual (aunque no esté publicado). */
export async function getPerfilPreview(est: string, locale: Locale) {
  return (await api<One<S<"PerfilPublico">>>(`/establecimientos/${est}/perfil/preview?locale=${locale}`, { locale })).data;
}
