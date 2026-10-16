import "../globals.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RootHtml } from "@/components/root-html";
import { getDictionary, hasLocale, LOCALE_HTML_LANG, LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/** Web pública: es/en/pt prerenderizados. Cualquier otro segmento → 404. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.title, template: "%s · TROPILLA" },
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_HTML_LANG[l], `/${l}`])),
    },
  };
}

export default async function PublicLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  return <RootHtml lang={LOCALE_HTML_LANG[locale]}>{children}</RootHtml>;
}
