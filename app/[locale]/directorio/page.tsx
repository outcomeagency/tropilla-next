import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { ProducerCard } from "@/components/public/producer-card";
import { Card, EmptyState, Select, buttonClass, inputClass } from "@/components/ui";
import { IconArrowRight, IconFilter, IconSearch } from "@/components/icons";
import { getDictionary, hasLocale, LOCALE_HTML_LANG, LOCALES, type Locale } from "@/lib/i18n";
import { getPortalDict, type PortalDict } from "@/lib/i18n/portal";
import { getDirectorio, getDirectorioFacetas, type DirectorioFacetas, type DirectorioQuery } from "@/lib/data/portal";
import { PROVINCIAS } from "@/lib/geo";
import { CATEGORIAS, RAZAS } from "@/lib/catalogo";
import { AutoSubmit } from "./auto-submit";

const FILTROS = ["q", "provincia", "especie", "raza", "categoria", "con_oferta", "con_contrato", "cursor"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = getPortalDict(locale);
  return {
    title: t.directory.metaTitle,
    description: t.directory.metaDescription,
    alternates: {
      canonical: `/${locale}/directorio`,
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_HTML_LANG[l], `/${l}/directorio`])),
    },
    openGraph: { title: t.directory.metaTitle, description: t.directory.metaDescription, type: "website" },
  };
}

function limpiar(sp: Record<string, string | string[] | undefined>): DirectorioQuery {
  const out: DirectorioQuery = {};
  for (const k of FILTROS) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) out[k] = s.slice(0, 80);
  }
  return out;
}

type Opcion = { codigo: string; nombre: string; count?: number };

/** Opciones de un filtro: las facetas de la API (con conteo) y, si no hay, el catálogo estático. Lo elegido siempre queda. */
function opciones(facetas: Array<{ codigo?: string; nombre?: string; count?: number }> | undefined, estaticas: Opcion[], elegido?: string, todas: Opcion[] = estaticas): Opcion[] {
  const base = facetas?.length ? facetas.map((x) => ({ codigo: x.codigo ?? "", nombre: x.nombre ?? x.codigo ?? "", count: x.count })) : estaticas;
  if (elegido && !base.some((o) => o.codigo === elegido)) {
    const e = todas.find((o) => o.codigo === elegido);
    return [...base, { codigo: elegido, nombre: e?.nombre ?? elegido, count: 0 }];
  }
  return base;
}

const conConteo = (o: Opcion) => (o.count != null ? `${o.nombre} (${o.count})` : o.nombre);

function Filtros({ f, t, locale, facetas }: { f: DirectorioQuery; t: PortalDict; locale: Locale; facetas: DirectorioFacetas | null }) {
  const provincias = opciones(facetas?.provincias, PROVINCIAS.map((p) => ({ codigo: p.codigo, nombre: p.nombre })), f.provincia);
  const razas = opciones(
    facetas?.razas,
    RAZAS.filter((r) => !f.especie || r.especie === f.especie).map((r) => ({ codigo: r.codigo, nombre: r.nombre })),
    f.raza,
    RAZAS.map((r) => ({ codigo: r.codigo, nombre: r.nombre })),
  );
  const categorias = opciones(
    facetas?.categorias,
    CATEGORIAS.filter((c) => !f.especie || c.especie === f.especie).map((c) => ({ codigo: c.codigo, nombre: c.nombres[locale] })),
    f.categoria,
    CATEGORIAS.map((c) => ({ codigo: c.codigo, nombre: c.nombres[locale] })),
  );
  return (
    <form action={`/${locale}/directorio`} className="space-y-5">
      <AutoSubmit />
      {f.q && <input type="hidden" name="q" value={f.q} />}
      <div className="space-y-1.5">
        <label htmlFor="f-provincia" className="text-[13px] font-semibold text-ink">
          {t.directory.province}
        </label>
        <Select id="f-provincia" name="provincia" defaultValue={f.provincia ?? ""}>
          <option value="">{t.directory.allProvinces}</option>
          {provincias.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {conConteo(p)}
            </option>
          ))}
        </Select>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">{t.directory.species}</legend>
        <div className="grid grid-cols-3 gap-0.5 rounded-[10px] bg-surface-2 p-1 text-[12.5px] font-medium">
          {[
            { v: "", l: t.directory.allProvinces },
            { v: "BOV", l: t.common.species.BOV },
            { v: "BUB", l: t.common.species.BUB },
          ].map((o) => (
            <label
              key={o.v || "all"}
              className="cursor-pointer truncate rounded-[7px] px-1 py-1.5 text-center text-muted has-checked:bg-surface has-checked:text-ink has-checked:ring-1 has-checked:ring-border has-focus-visible:outline-2 has-focus-visible:outline-campo"
            >
              <input type="radio" name="especie" value={o.v} defaultChecked={(f.especie ?? "") === o.v} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="f-raza" className="text-[13px] font-semibold text-ink">
          {t.directory.breed}
        </label>
        <Select id="f-raza" name="raza" defaultValue={f.raza ?? ""}>
          <option value="">{t.directory.anyBreed}</option>
          {razas.map((r) => (
            <option key={r.codigo} value={r.codigo}>
              {conConteo(r)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="f-categoria" className="text-[13px] font-semibold text-ink">
          {t.directory.category}
        </label>
        <Select id="f-categoria" name="categoria" defaultValue={f.categoria ?? ""}>
          <option value="">{t.directory.anyCategory}</option>
          {categorias.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {conConteo(c)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2.5 border-t border-border pt-4">
        {(["con_oferta", "con_contrato"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
            <input type="checkbox" name={k} value="1" defaultChecked={!!f[k]} className="h-[18px] w-[18px] accent-monte" />
            {k === "con_oferta" ? t.directory.withOffer : t.directory.withContract}
            {facetas && <span className="ml-auto text-[12.5px] tabular-nums text-subtle">{k === "con_oferta" ? facetas.con_oferta : facetas.con_contrato}</span>}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button type="submit" className={buttonClass("primary", "sm")}>
          {t.directory.apply}
        </button>
        <Link href={`/${locale}/directorio`} className="text-[13px] font-medium text-campo hover:underline">
          {t.directory.clear}
        </Link>
      </div>
    </form>
  );
}

async function Directorio({ locale, searchParams }: { locale: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = getPortalDict(locale);
  const f = limpiar(await searchParams);
  const [{ data, next }, facetas] = await Promise.all([
    getDirectorio(f, locale),
    getDirectorioFacetas({ q: f.q, provincia: f.provincia, especie: f.especie }, locale),
  ]);
  const activos = Object.keys(f).filter((k) => k !== "q" && k !== "cursor").length;
  const qsSin = (extra: Record<string, string>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, cursor: undefined, ...extra })) if (v) qs.set(k, v);
    const str = qs.toString();
    return `/${locale}/directorio${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <form action={`/${locale}/directorio`} role="search" className="mx-auto -mt-7 flex max-w-[1320px] flex-col gap-2 px-[clamp(16px,4vw,40px)] sm:flex-row">
        {Object.entries(f)
          .filter(([k]) => k !== "q" && k !== "cursor")
          .map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <label htmlFor="dir-q" className="sr-only">
          {t.directory.searchLabel}
        </label>
        <div className="relative flex-1">
          <IconSearch size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
          <input id="dir-q" name="q" type="search" defaultValue={f.q} placeholder={t.directory.searchPlaceholder} className={`${inputClass} h-14 pl-11 text-[16px]`} />
        </div>
        <button type="submit" className={buttonClass("primary", "md", "h-14 px-6")}>
          {t.directory.search}
        </button>
      </form>

      <div className="mx-auto grid max-w-[1320px] gap-8 px-[clamp(16px,4vw,40px)] py-8 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside>
          <details className="group rounded-[var(--radius-card)] border border-border bg-surface lg:hidden" open={activos > 0 ? true : undefined}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold text-ink">
              <IconFilter size={18} /> {t.directory.filters}
              {activos > 0 && <span className="rounded-full bg-monte px-1.5 text-[12px] tabular-nums text-blanco">{activos}</span>}
            </summary>
            <div className="border-t border-border p-4">
              <Filtros f={f} t={t} locale={locale} facetas={facetas} />
            </div>
          </details>
          <div className="hidden rounded-[var(--radius-card)] border border-border bg-surface p-5 lg:sticky lg:top-24 lg:block">
            <p className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-ink">
              <IconFilter size={18} /> {t.directory.filters}
            </p>
            <Filtros f={f} t={t} locale={locale} facetas={facetas} />
          </div>
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[18px] font-semibold text-ink">{t.directory.results(data.length)}</h2>
            <p className="text-[12.5px] text-muted">{t.directory.order}</p>
          </div>
          {data.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((p) => (
                <ProducerCard key={p.slug} p={p} locale={locale} t={t} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<IconSearch size={24} />}
                title={t.directory.emptyTitle}
                description={t.directory.emptyBody}
                action={
                  <>
                    <Link href={`/${locale}/directorio`} className={buttonClass("primary", "md")}>
                      {t.directory.emptyWiden}
                    </Link>
                    <Link href="/registro?para=busco" className={buttonClass("outline", "md")}>
                      {t.directory.emptyBusco}
                    </Link>
                    {f.provincia && (
                      <Link href={`/registro?para=seguir&provincia=${f.provincia}`} className={buttonClass("ghost", "md", "text-campo")}>
                        {t.directory.followZone}
                      </Link>
                    )}
                  </>
                }
              />
            </Card>
          )}
          {(next || f.cursor) && (
            <nav aria-label={t.directory.loadMore} className="mt-6 flex flex-wrap items-center gap-3">
              {next && (
                <Link href={qsSin({ cursor: next })} className={buttonClass("outline", "md")}>
                  {t.directory.loadMore} <IconArrowRight size={16} />
                </Link>
              )}
              {f.cursor && (
                <Link href={qsSin({})} className="text-[13px] font-medium text-campo hover:underline">
                  {t.directory.backToStart}
                </Link>
              )}
            </nav>
          )}
          <Link href="/registro" className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium text-campo hover:underline">
            {t.directory.producerCta} <IconArrowRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1320px] gap-8 px-[clamp(16px,4vw,40px)] py-8 lg:grid-cols-[264px_minmax(0,1fr)]" aria-hidden="true">
      <div className="hidden h-[420px] rounded-[var(--radius-card)] border border-border bg-surface lg:block" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[360px] rounded-[var(--radius-card)] border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}

/** Directorio público con buscador (flujo 18, TPA-54). Sin login; filtros en la URL (indexable y compartible). */
export default async function DirectorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = getPortalDict(locale);

  return (
    <>
      <SiteHeader locale={locale} dict={dict} path="/directorio" current="directory" />
      <main className="bg-base">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,40px)] pb-14 pt-[clamp(28px,4vw,48px)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{t.directory.eyebrow}</p>
            <h1 className="mt-3 font-display text-[clamp(30px,4vw,46px)] font-bold leading-[1.05] tracking-[-0.03em] text-ink">{t.directory.title}</h1>
            <p className="mt-3 max-w-[60ch] text-[16px] text-muted">{t.directory.lead}</p>
          </div>
        </section>
        <Suspense fallback={<ResultsSkeleton />}>
          <Directorio locale={locale} searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter locale={locale} dict={dict} />
    </>
  );
}
