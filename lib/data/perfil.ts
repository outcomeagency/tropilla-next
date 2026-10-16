import "server-only";
import { api } from "@/lib/api";
import { withMock } from "@/lib/mock/fallback";
import { mockPerfil } from "@/lib/mock/perfil-panel";
import { mockPerfilPublico } from "@/lib/mock/perfiles";
import type { Locale } from "@/lib/i18n";
import type { One, S } from "@/lib/schemas";

export function getPerfilConfig(est: string, nombre: string) {
  return withMock(async () => (await api<One<S<"Perfil">>>(`/establecimientos/${est}/perfil`)).data, () => mockPerfil(est, nombre));
}

/** Vista previa «como la ve el comprador» con la config actual (aunque no esté publicado). */
export function getPerfilPreview(est: string, nombre: string, locale: Locale) {
  return withMock(
    async () => (await api<One<S<"PerfilPublico">>>(`/establecimientos/${est}/perfil/preview?locale=${locale}`, { locale })).data,
    () => {
      const cfg = mockPerfil(est, nombre);
      const base = mockPerfilPublico("la-esperanza", locale)!;
      const activa = (s: string) => (cfg.secciones?.[s] as { activa?: boolean } | undefined)?.activa !== false;
      const sec = base.secciones ?? {};
      return {
        ...base,
        slug: cfg.slug,
        nombre,
        secciones: {
          portada: activa("portada") ? { ...sec.portada, historia: String(cfg.textos?.historia ?? sec.portada?.historia ?? "") } : null,
          actividad: activa("actividad") ? sec.actividad : null,
          rodeo: activa("rodeo") ? sec.rodeo : null,
          sanidad: activa("sanidad") ? sec.sanidad : null,
          trazabilidad: activa("trazabilidad") ? sec.trazabilidad : null,
          documentos: activa("documentos") ? sec.documentos : null,
          ofertas: activa("ofertas") ? sec.ofertas : null,
          contacto: { formulario: activa("contacto") },
        },
      } satisfies S<"PerfilPublico">;
    },
  );
}
