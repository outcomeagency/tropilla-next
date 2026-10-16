import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { TakeTokens } from "@/components/public/take-tokens";
import { Qr } from "@/components/qr";
import { Badge, MockNotice, Progress, SpeciesChip, buttonClass } from "@/components/ui";
import { IconArrowRight, IconCalendar, IconCheckCircle, IconLock, IconPin } from "@/components/icons";
import { getDictionary, hasLocale, LOCALE_HTML_LANG, LOCALES, type Locale } from "@/lib/i18n";
import { getPortalDict } from "@/lib/i18n/portal";
import { getContratoPublico } from "@/lib/data/comprador";
import { categoriaNombre } from "@/lib/catalogo";
import { especieDe } from "@/lib/types";
import { SITE_URL } from "@/lib/site";

type Params = Promise<{ locale: string; codigo: string }>;
const LANG: Record<Locale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, codigo } = await params;
  if (!hasLocale(locale)) return {};
  return {
    title: `${getPortalDict(locale).contract.eyebrow} ${codigo}`,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_HTML_LANG[l], `/${l}/contratos/${codigo}`])) },
  };
}

async function Contrato({ params }: { params: Params }) {
  const { locale: l, codigo } = await params;
  if (!hasLocale(l)) notFound();
  const locale = l;
  const dict = getDictionary(locale);
  const t = getPortalDict(locale);
  const k = t.contract;
  const res = await getContratoPublico(codigo, locale);
  if (!res) notFound();
  const c = res.data;
  const nf = new Intl.NumberFormat(LANG[locale]);
  const money = new Intl.NumberFormat(LANG[locale], { style: "currency", currency: c.moneda ?? "ARS", maximumFractionDigits: 2 });
  const pct = c.tokens_totales ? Math.round((1 - (c.tokens_libres ?? 0) / c.tokens_totales) * 100) : 0;
  const cat = c.categoria ? categoriaNombre(c.categoria, locale).toLowerCase() : "";
  const entrega = c.fecha_entrega ? new Intl.DateTimeFormat(LANG[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${c.fecha_entrega}T12:00:00Z`)) : "";
  const next = `/${locale}/contratos/${codigo}`;
  const abierto = c.estado === "publicado" || c.estado === "parcialmente_tomado";

  return (
    <>
      <SiteHeader locale={locale} dict={dict} path={`/contratos/${codigo}`} context={c.establecimiento?.nombre} cta={res.me ? { href: "/comprador", label: "Mis contratos" } : undefined} />
      <main className="bg-base">
        <div className="mx-auto max-w-[1180px] px-[clamp(16px,4vw,40px)] py-[clamp(24px,4vw,48px)]">
          {res.source === "mock" && (
            <div className="mb-4">
              <MockNotice text={t.common.sampleData} />
            </div>
          )}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
                <IconPin size={14} /> {c.establecimiento?.zona} · {k.eyebrow}
              </p>
              <h1 className="mt-3 font-display text-[clamp(30px,4vw,50px)] font-bold leading-[1.04] tracking-[-0.03em] text-ink">{k.title(nf.format(c.kg_ofrecidos ?? 0), cat)}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {c.especie && <SpeciesChip especie={especieDe(c.especie)} withIcon label={t.common.speciesOne[c.especie]} />}
                <Badge tone={abierto ? "success" : "neutral"} icon={<IconCheckCircle size={14} />}>
                  {k.status[c.estado ?? ""] ?? c.estado}
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-[14px] text-ink">
                  <IconCalendar size={16} className="text-muted" /> {k.delivery}: <span className="font-semibold">{entrega}</span>
                </span>
              </div>

              <section className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[16px] font-semibold text-ink">{k.tokens}</h2>
                  <p className="text-[13px] text-muted">{k.perToken(c.kg_por_token ?? 100)}</p>
                </div>
                <p className="mt-3 text-[15px] text-ink">
                  <span className="text-[26px] font-bold tabular-nums">{c.tokens_libres}</span> {k.tokensOf(c.tokens_libres ?? 0, c.tokens_totales ?? 0).replace(/^\d+ /, "")}
                </p>
                <div className="mt-2">
                  <Progress value={pct} label={k.tokens} />
                </div>
                <p className="mt-2 text-[13px] tabular-nums text-muted">
                  {nf.format(c.kg_libres ?? 0)} {k.kgFree} · {c.cabezas} {k.heads}
                </p>
              </section>

              <section className="mt-6">
                <h2 className="text-[18px] font-semibold text-ink">{k.rulesTitle}</h2>
                <ol className="mt-3 space-y-3">
                  {k.rules.map((r, i) => (
                    <li key={r} className="flex gap-3">
                      <span className="font-display text-[20px] font-bold leading-none tabular-nums text-crema-300">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[14.5px] text-ink">{r}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="mt-8 flex flex-wrap items-center gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-5">
                {c.verificacion_url && <Qr value={`${SITE_URL}/${locale}${c.verificacion_url}`} size={88} label={k.verify} />}
                <div className="flex flex-col gap-2">
                  {c.verificacion_url && (
                    <Link href={`/${locale}${c.verificacion_url}`} className="inline-flex items-center gap-1 text-[14px] font-medium text-campo hover:underline">
                      {k.verify} <IconArrowRight size={15} />
                    </Link>
                  )}
                  {c.establecimiento?.slug && (
                    <Link href={`/${locale}/p/${c.establecimiento.slug}`} className="inline-flex items-center gap-1 text-[14px] font-medium text-campo hover:underline">
                      {k.seeProfile}: {c.establecimiento.nombre} <IconArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface">
                {c.precio_especial_kg ? (
                  <>
                    <div className="border-b border-border p-5">
                      <p className="text-[13px] text-muted">{k.specialPrice}</p>
                      <p className="mt-1 text-[30px] font-bold tabular-nums tracking-[-0.02em] text-ink">{money.format(Number(c.precio_especial_kg))}</p>
                      <p className="text-[13px] text-muted">
                        {k.perKg} · {k.discount(String(c.descuento_pct))}
                      </p>
                      <p className="mt-3 text-[14px] text-ink">
                        {k.advance}: <span className="font-semibold tabular-nums">{money.format(Number(c.anticipo_por_token))}</span>{" "}
                        <span className="text-muted">({k.advancePct(String(c.anticipo_pct))})</span>
                      </p>
                    </div>
                    <div className="p-5">
                      {abierto && (c.tokens_libres ?? 0) > 0 ? (
                        <TakeTokens
                          codigo={c.codigo ?? codigo}
                          locale={locale}
                          libres={c.tokens_libres ?? 0}
                          kgToken={c.kg_por_token ?? 100}
                          anticipoPorToken={Number(c.anticipo_por_token)}
                          t={{ howMany: k.howMany, youPay: k.youPay, youGet: k.youGet, reserve: k.reserve }}
                        />
                      ) : (
                        <p className="text-[14px] text-muted">{k.status[c.estado ?? ""]}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-5">
                    <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-campo-50 text-monte">
                      <IconLock size={22} />
                    </span>
                    <h2 className="mt-4 text-[17px] font-semibold text-ink">{k.lockedTitle}</h2>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{k.lockedBody}</p>
                    <div className="mt-5 grid gap-2">
                      {res.me ? (
                        <Link href={`/comprador/cuenta?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "md")}>
                          {k.completeProfile}
                        </Link>
                      ) : (
                        <>
                          <Link href={`/registro?next=${encodeURIComponent(`/comprador/cuenta?next=${next}`)}`} className={buttonClass("primary", "md")}>
                            {k.createAccount}
                          </Link>
                          <Link href={`/ingresar?next=${encodeURIComponent(next)}`} className={buttonClass("outline", "md")}>
                            {k.login}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} legend={c.leyenda} />
    </>
  );
}

/** Contrato a futuro publicado (flujo 20, lado comprador, TPA-57). */
export default function ContratoPublicoPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-16 h-[480px] max-w-[1180px] rounded-[var(--radius-card)] bg-ghost" aria-hidden="true" />}>
      <Contrato params={params} />
    </Suspense>
  );
}
