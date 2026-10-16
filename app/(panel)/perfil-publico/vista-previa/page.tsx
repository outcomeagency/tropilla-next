import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { PerfilView } from "@/components/public/perfil-view";
import { FilterTabs, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconEye } from "@/components/icons";
import { requireContexto } from "@/lib/establecimiento";
import { getPerfilConfig, getPerfilPreview } from "@/lib/data/perfil";
import { aceptarPreviewAction } from "@/lib/perfil-actions";
import { getPortalDict } from "@/lib/i18n/portal";
import { hasLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Vista previa del perfil" };

async function Preview({ searchParams }: { searchParams: Promise<{ idioma?: string }> }) {
  const ctx = await requireContexto();
  const { idioma = "es" } = await searchParams;
  const locale = hasLocale(idioma) ? idioma : "es";
  // Both endpoints lazily initialize the profile row; load it before requesting the preview
  // so a new establishment cannot race two inserts against the same primary key.
  const cfg = await getPerfilConfig(ctx.activa.establecimiento_id);
  const p = await getPerfilPreview(ctx.activa.establecimiento_id, locale);
  const t = getPortalDict(locale);
  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:top-0 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/perfil-publico" className={buttonClass("ghost", "sm")}>
            <IconArrowLeft size={16} /> Editar
          </Link>
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <IconEye size={18} className="text-campo" /> Así ve tu perfil un comprador
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs
            label="Idioma de la vista previa"
            items={(["es", "en", "pt"] as const).map((l) => ({ href: `/perfil-publico/vista-previa?idioma=${l}`, label: l.toUpperCase(), active: l === locale }))}
          />
          {ctx.can("perfil.publicar") && !cfg.preview_aceptada_en && (
            <form action={aceptarPreviewAction}>
              <button type="submit" className={buttonClass("primary", "sm")}>
                <IconCheckCircle size={16} /> Se ve bien, aceptar
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-base" lang={locale}>
        <PerfilView p={p} locale={locale} t={t} />
        <p className="border-t border-border bg-surface px-5 py-3 text-[12.5px] text-muted">{p.leyenda}</p>
      </div>
    </>
  );
}

export default function VistaPreviaPage(props: { searchParams: Promise<{ idioma?: string }> }) {
  return (
    <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Preview searchParams={props.searchParams} />
    </Suspense>
  );
}
