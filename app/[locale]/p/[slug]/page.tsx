import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { PerfilView } from "@/components/public/perfil-view";
import { ContactSection } from "@/components/public/contact-section";
import { getDictionary, hasLocale, LOCALE_HTML_LANG, LOCALES } from "@/lib/i18n";
import { getPortalDict } from "@/lib/i18n/portal";
import { getPerfilPublico } from "@/lib/data/portal";
import { departamentoNombre, provinciaNombre } from "@/lib/geo";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const res = await getPerfilPublico(slug, locale);
  if (!res) return { title: getPortalDict(locale).profile.notFoundTitle, robots: { index: false } };
  const p = res.data;
  const zona = [departamentoNombre(p.secciones?.portada?.zona?.departamento), provinciaNombre(p.secciones?.portada?.zona?.provincia)].filter(Boolean).join(", ");
  const title = p.seo?.titulo ?? `${p.nombre} · ${zona}`;
  const description = p.seo?.descripcion ?? p.secciones?.portada?.historia?.slice(0, 160) ?? zona;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/p/${p.slug ?? slug}`,
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_HTML_LANG[l], `/${l}/p/${p.slug ?? slug}`])),
    },
    openGraph: { title, description, type: "profile", images: p.secciones?.portada?.fotos?.[0] ? [{ url: p.secciones.portada.fotos[0] }] : undefined },
    robots: p.seo?.indexable === false ? { index: false } : undefined,
  };
}

async function Perfil({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const res = await getPerfilPublico(slug, locale);
  if (!res) notFound();
  const dict = getDictionary(locale);
  const t = getPortalDict(locale);
  const p = res.data;
  // Slug viejo: la API sigue la redirección (301) y devuelve el perfil con el slug nuevo.
  if (p.slug && p.slug !== slug) permanentRedirect(`/${locale}/p/${p.slug}`);
  const formulario = p.secciones?.contacto?.formulario !== false;
  return (
    <>
      <SiteHeader
        locale={locale}
        dict={dict}
        path={`/p/${slug}`}
        context={[p.productor, p.nombre].filter(Boolean).join(" · ")}
        cta={formulario ? { href: "#consultar", label: t.common.contact } : undefined}
      />
      <main className="bg-base">
        <PerfilView
          p={p}
          locale={locale}
          t={t}
          contacto={formulario ? <ContactSection locale={locale} t={t} about={t.contact.about(p.nombre ?? "")} establecimiento={p.slug} /> : null}
        />
      </main>
      <SiteFooter locale={locale} dict={dict} legend={p.leyenda} />
    </>
  );
}

/** Perfil público del establecimiento (flujo 13, TPA-50): sólo lo que el productor eligió publicar. */
export default function PerfilPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-[420px] max-w-[1240px] rounded-[16px] bg-ghost" aria-hidden="true" />}>
      <Perfil params={params} />
    </Suspense>
  );
}
