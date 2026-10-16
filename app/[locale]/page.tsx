import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { ProducerCard } from "@/components/public/producer-card";
import { Photo } from "@/components/public/photo";
import { Card, EmptyState, TrustBadge, buttonClass, inputClass } from "@/components/ui";
import { IconArrowRight, IconPin, IconSearch } from "@/components/icons";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { getPortalDict } from "@/lib/i18n/portal";
import { getDirectorio } from "@/lib/data/portal";

/**
 * Home del portal público (placeholder). Patrón de la landing de Pya'e +
 * preview 03: una sola idea en el hero, Montserrat sólo en titulares, sin
 * maquetas falsas. El directorio real llega con la API (/portal/productores).
 */
async function Destacados({ locale }: { locale: Locale }) {
  const p = getPortalDict(locale);
  const { data } = await getDirectorio({}, locale, 3);
  if (!data.length) {
    return (
      <Card className="mt-6">
        <EmptyState icon={<IconSearch size={24} />} title={p.directory.emptyTitle} description={p.directory.emptyBody} />
      </Card>
    );
  }
  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.slice(0, 3).map((it) => (
          <ProducerCard key={it.slug} p={it} locale={locale} t={p} />
        ))}
        {data.length < 3 && (
          <Link
            href="/registro"
            className="group flex flex-col justify-between gap-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-hover)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-campo-50 text-monte">
              <IconPin size={22} />
            </span>
            <span>
              <span className="block text-[19px] font-semibold leading-snug tracking-[-0.01em] text-ink">{p.directory.producerCta}</span>
              <span className="mt-2 block text-[14px] leading-relaxed text-muted">{p.directory.producerCtaBody}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[14px] font-medium text-campo group-hover:underline">
              {p.directory.producerCtaAction} <IconArrowRight size={16} />
            </span>
          </Link>
        )}
      </div>
    </>
  );
}

async function HeroPhoto({ locale }: { locale: Locale }) {
  const { data } = await getDirectorio({}, locale, 6);
  const featured = data.find((producer) => producer.foto?.url || producer.foto_url);
  return <Photo src={featured?.foto ?? featured?.foto_url} alt={featured?.foto?.alt ?? featured?.nombre ?? "Establecimiento ganadero del NEA"} sizes="(min-width:1024px) 520px, 100vw" className="aspect-[5/4] rounded-[16px] border border-border" preload />;
}

export default async function PortalHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const p = getPortalDict(locale);

  return (
    <>
      <SiteHeader locale={locale} dict={t} />

      <main>
        {/* Hero */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-[clamp(16px,4vw,40px)] py-[clamp(40px,7vw,88px)] lg:grid-cols-[6fr_5fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{t.hero.eyebrow}</p>
              <h1 className="mt-4 font-display text-[clamp(36px,5.2vw,64px)] font-bold leading-[1.04] tracking-[-0.03em] text-ink">
                {t.hero.title}
              </h1>
              <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed text-muted">{t.hero.lead}</p>

              <form action={`/${locale}/directorio`} role="search" className="mt-8 flex max-w-[560px] flex-col gap-2 sm:flex-row">
                <label htmlFor="portal-q" className="sr-only">
                  {t.hero.searchLabel}
                </label>
                <div className="relative flex-1">
                  <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input id="portal-q" name="q" type="search" placeholder={t.hero.searchPlaceholder} className={`${inputClass} pl-10`} />
                </div>
                <button type="submit" className={buttonClass("primary", "md")}>
                  {t.hero.searchCta}
                </button>
              </form>
              <p className="mt-4 text-[14px] text-muted">
                <Link href="/registro" className="inline-flex items-center gap-1 font-medium text-campo hover:underline">
                  {t.hero.secondaryCta} <IconArrowRight size={16} />
                </Link>
              </p>
            </div>

            <figure>
              <Suspense fallback={<div className="aspect-[5/4] rounded-[16px] border border-border bg-base" />}><HeroPhoto locale={locale} /></Suspense>
            </figure>
          </div>
        </section>

        {/* Directorio: productores actualizados recientemente */}
        <section id="directorio" className="scroll-mt-20 bg-base">
          <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,40px)] py-[clamp(40px,6vw,72px)]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-[clamp(26px,3vw,36px)] font-bold tracking-[-0.02em] text-ink">{p.directory.title}</h2>
              <Link href={`/${locale}/directorio`} className="inline-flex items-center gap-1 text-[14px] font-medium text-campo hover:underline">
                {p.directory.emptyWiden} <IconArrowRight size={16} />
              </Link>
            </div>
            <Suspense fallback={<div className="mt-6 h-[380px]" aria-hidden="true" />}>
              <Destacados locale={locale} />
            </Suspense>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-20 border-y border-border bg-surface">
          <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,40px)] py-[clamp(40px,6vw,72px)]">
            <h2 className="font-display text-[clamp(26px,3vw,36px)] font-bold tracking-[-0.02em] text-ink">{t.how.title}</h2>
            <p className="mt-2 max-w-[60ch] text-[16px] text-muted">{t.how.lead}</p>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {t.how.steps.map((step, i) => (
                <li key={step.title} className="border-t border-border-strong pt-5">
                  <span className="font-display text-[44px] font-bold leading-none tabular-nums text-crema-300" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-[17px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              <h3 className="sr-only">{t.trust.title}</h3>
              <div className="rounded-[var(--radius-card)] border border-border bg-base p-5">
                <TrustBadge nivel="declarado" label={t.trust.levels.declarado} />
                <p className="mt-3 text-[15px] text-ink">{t.trust.declared}</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-base p-5">
                <TrustBadge nivel="integridad_registrada" label={t.trust.levels.integridad_registrada} />
                <p className="mt-3 text-[15px] text-ink">{t.trust.integrity}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Para productores: momento de marca en verde monte */}
        <section id="productores" className="scroll-mt-20 bg-sidebar text-sidebar-ink">
          <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-6 px-[clamp(16px,4vw,40px)] py-[clamp(40px,6vw,64px)] md:flex-row md:items-center">
            <div className="max-w-[640px]">
              <h2 className="font-display text-[clamp(24px,3vw,34px)] font-bold leading-tight tracking-[-0.02em]">{t.producers.title}</h2>
              <p className="mt-2 text-[16px] text-sidebar-muted">{t.producers.body}</p>
            </div>
            <Link
              href="/registro"
              className="inline-flex h-11 shrink-0 items-center rounded-[var(--radius-control)] bg-crema px-5 text-sm font-semibold text-monte hover:bg-surface"
            >
              {t.producers.cta}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} dict={t} />
    </>
  );
}
