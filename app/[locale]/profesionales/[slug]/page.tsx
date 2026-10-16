import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { api, ApiError, query } from "@/lib/api";
import { hasLocale, LOCALES, LOCALE_HTML_LANG, type Locale } from "@/lib/i18n";
import type { One, S } from "@/lib/schemas";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getDictionary } from "@/lib/i18n";
import { Card, CardBody, Notice } from "@/components/ui";
import { IconMap, IconUser } from "@/components/icons";
import { Photo } from "@/components/public/photo";

type Params = Promise<{ locale: string; slug: string }>;
const COPY: Record<Locale, { title: string; declared: string; specialties: string; zones: string; languages: string; contact: string }> = {
  es: { title: "Perfil profesional", declared: "Matrícula declarada", specialties: "Especialidades", zones: "Zonas de trabajo", languages: "Idiomas", contact: "Este profesional publica sus datos de contacto desde su perfil." },
  en: { title: "Professional profile", declared: "Declared license", specialties: "Specialties", zones: "Service areas", languages: "Languages", contact: "This professional shares contact details through their profile." },
  pt: { title: "Perfil profissional", declared: "Registro declarado", specialties: "Especialidades", zones: "Áreas de trabalho", languages: "Idiomas", contact: "Este profissional compartilha seus dados de contato pelo perfil." },
};

async function profile(slug: string, locale: Locale) {
  try { return (await api<One<S<"ProfesionalPublico">>>(`/public/profesionales/${encodeURIComponent(slug)}${query({ locale })}`, { auth: false, locale })).data; }
  catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!hasLocale(raw)) return {};
  const p = await profile(slug, raw);
  if (!p) return { title: COPY[raw].title, robots: { index: false } };
  const title = p.nombre ?? COPY[raw].title;
  return { title, description: p.bio ?? title, alternates: { canonical: `/${raw}/profesionales/${slug}`, languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_HTML_LANG[l], `/${l}/profesionales/${slug}`])) } };
}

async function ProfesionalPublico({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  if (!hasLocale(raw)) notFound();
  const p = await profile(slug, raw);
  if (!p) notFound();
  const t = COPY[raw];
  const zonas = p.zonas as { provincias?: string[]; departamentos?: string[] } | undefined;
  const dict = getDictionary(raw);
  return <><SiteHeader locale={raw} dict={dict} path={`/profesionales/${slug}`} context={p.nombre ?? t.title} /><main className="min-h-[70vh] bg-base px-4 py-10"><div className="mx-auto max-w-[840px] space-y-5">
    <Card><CardBody className="p-7"><div className="flex items-start gap-4">{p.foto?.url || p.foto_url ? <Photo src={p.foto ?? p.foto_url} alt={p.foto?.alt ?? p.nombre ?? t.title} sizes="96px" className="h-24 w-24 shrink-0 rounded-full border border-border" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-campo-50 text-monte"><IconUser size={27} /></span>}<div><p className="text-sm font-medium text-monte">{p.profesion}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{p.nombre}</h1>{p.matricula_declarada && <p className="mt-2 text-sm text-muted">{t.declared}: {p.matricula_declarada}</p>}</div></div>
      {p.bio && <p className="mt-6 whitespace-pre-line text-[15px] leading-7 text-ink">{p.bio}</p>}</CardBody></Card>
    {(p.especialidades?.length || zonas?.provincias?.length || p.idiomas?.length) ? <Card><CardBody className="grid gap-5 sm:grid-cols-2">
      {p.especialidades?.length ? <section><h2 className="text-sm font-semibold text-ink">{t.specialties}</h2><p className="mt-1 text-sm text-muted">{p.especialidades.join(" · ")}</p></section> : null}
      {zonas?.provincias?.length || zonas?.departamentos?.length ? <section><h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><IconMap size={16} />{t.zones}</h2><p className="mt-1 text-sm text-muted">{[...(zonas.provincias ?? []), ...(zonas.departamentos ?? [])].join(" · ")}</p></section> : null}
      {p.idiomas?.length ? <section><h2 className="text-sm font-semibold text-ink">{t.languages}</h2><p className="mt-1 text-sm text-muted">{p.idiomas.join(" · ")}</p></section> : null}
    </CardBody></Card> : null}
    {p.establecimientos?.length ? <Card><CardBody><h2 className="text-sm font-semibold text-ink">Trabaja con estos establecimientos</h2><ul className="mt-2 space-y-1 text-sm text-muted">{p.establecimientos.map((e) => <li key={e.slug}>{e.nombre}</li>)}</ul></CardBody></Card> : null}
    <Notice tone="info" title="Información declarada">TROPILLA registra lo que comparte cada profesional. La plataforma no valida matrículas ni especialidades.</Notice>
  </div></main><SiteFooter locale={raw} dict={dict} /></>;
}

export default function ProfesionalPublicoPage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="mx-auto mt-8 h-[420px] max-w-[840px] rounded-[var(--radius-card)] bg-ghost" aria-hidden="true" />}><ProfesionalPublico params={params} /></Suspense>;
}
