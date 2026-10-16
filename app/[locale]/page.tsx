import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/public/site-header";
import { Logo } from "@/components/brand";
import { Badge, Card, EmptyState, SpeciesChip, TrustBadge, buttonClass, inputClass } from "@/components/ui";
import { IconArrowRight, IconBuffalo, IconInfo, IconPin, IconSearch } from "@/components/icons";
import { getDictionary, hasLocale } from "@/lib/i18n";

/**
 * Home del portal público (placeholder). Patrón de la landing de Pya'e +
 * preview 03: una sola idea en el hero, Montserrat sólo en titulares, sin
 * maquetas falsas. El directorio real llega con la API (/portal/productores).
 */
export default async function PortalHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);

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

              <form action={`/${locale}#directorio`} role="search" className="mt-8 flex max-w-[560px] flex-col gap-2 sm:flex-row">
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
                <Link href="/ingresar" className="inline-flex items-center gap-1 font-medium text-campo hover:underline">
                  {t.hero.secondaryCta} <IconArrowRight size={16} />
                </Link>
              </p>
            </div>

            {/* Ejemplo de ficha con los componentes reales (no es una captura). */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-crema px-5 py-3">
                <Badge tone="neutral" icon={<IconInfo size={14} />}>
                  {t.sample.label}
                </Badge>
                <span className="flex items-center gap-1 text-[12.5px] text-muted">
                  <IconPin size={14} /> {t.sample.place}
                </span>
              </div>
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">
                    <IconBuffalo size={26} />
                  </span>
                  <div>
                    <h2 className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">{t.sample.title}</h2>
                    <p className="mt-1 text-[13.5px] text-muted">{t.sample.meta}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SpeciesChip especie="bubalino" />
                  <Badge tone="neutral" icon={<IconInfo size={14} />}>
                    Mediterráneo
                  </Badge>
                </div>
                <dl className="mt-5 divide-y divide-border rounded-[10px] border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <dt className="sr-only">{t.sample.headsLabel}</dt>
                    <dd className="text-[17px] font-bold tabular-nums text-ink">
                      30 <span className="text-[13px] font-medium text-muted">{t.sample.headsLabel}</span>
                    </dd>
                    <dd>
                      <TrustBadge nivel="declarado" label={t.trust.levels.declarado} />
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <dt className="sr-only">{t.sample.weightLabel}</dt>
                    <dd className="text-[17px] font-bold tabular-nums text-ink">
                      468 <span className="text-[13px] font-medium text-muted">{t.sample.weightLabel}</span>
                    </dd>
                    <dd>
                      <TrustBadge nivel="integridad_registrada" detail={t.sample.weightDetail} label={t.trust.levels.integridad_registrada} />
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <dt className="sr-only">{t.sample.healthLabel}</dt>
                    <dd className="text-[15px] text-ink">
                      {t.sample.healthLabel}: <span className="font-semibold">{t.sample.healthValue}</span>
                    </dd>
                    <dd>
                      <TrustBadge nivel="integridad_registrada" label={t.trust.levels.integridad_registrada} />
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>
          </div>
        </section>

        {/* Directorio (vacío hasta que haya productores publicados) */}
        <section id="directorio" className="scroll-mt-20 bg-base">
          <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,40px)] py-[clamp(40px,6vw,72px)]">
            <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">{t.nav.directory}</h2>
            <Card className="mt-5">
              <EmptyState
                icon={<IconSearch size={24} />}
                title={t.empty.title}
                description={t.empty.body}
                action={
                  <a href="#como-funciona" className={buttonClass("outline", "md")}>
                    {t.how.title}
                  </a>
                }
              />
            </Card>
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
              href="/ingresar"
              className="inline-flex h-11 shrink-0 items-center rounded-[var(--radius-control)] bg-crema px-5 text-sm font-semibold text-monte hover:bg-surface"
            >
              {t.producers.cta}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,40px)] py-8">
          <p className="rounded-[10px] border border-border bg-base px-4 py-3 text-[13px] text-muted">{t.footer.legend}</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Logo height={24} />
            <p className="text-[12.5px] text-muted">{t.footer.rights}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
