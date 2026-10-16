import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Photo } from "@/components/public/photo";
import { Qr } from "@/components/qr";
import { ContactSection } from "@/components/public/contact-section";
import { Badge, MockNotice, SpeciesChip, TrustBadge, TrustInline, buttonClass, cx } from "@/components/ui";
import {
  IconArrowRight,
  IconCalendar,
  IconCheckCircle,
  IconCow,
  IconBuffalo,
  IconDownload,
  IconFile,
  IconMap,
  IconMessage,
  IconPin,
  IconShieldCheck,
  IconTruck,
  IconWhatsapp,
} from "@/components/icons";
import { getDictionary, hasLocale, LOCALE_HTML_LANG, LOCALES, type Locale } from "@/lib/i18n";
import { getPortalDict, type PortalDict } from "@/lib/i18n/portal";
import { getOfertaPublica, getPerfilPublico } from "@/lib/data/portal";
import { actividadNombre } from "@/lib/geo";
import { categoriaNombre, razaNombre } from "@/lib/catalogo";
import { especieDe } from "@/lib/types";
import { SITE_URL } from "@/lib/site";
import type { S } from "@/lib/schemas";

type Params = Promise<{ locale: string; codigo: string }>;

const LANG: Record<Locale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

function fecha(
  iso: string | null | undefined,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
) {
  if (!iso) return "";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat(LANG[locale], { ...opts, timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

const num = (v: string | number, locale: Locale) => new Intl.NumberFormat(LANG[locale]).format(Number(v));

type Codigo = { codigo?: string; nombre?: string };
const codigos = (xs: unknown): Codigo[] => (Array.isArray(xs) ? (xs as Codigo[]) : []);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, codigo } = await params;
  if (!hasLocale(locale)) return {};
  const res = await getOfertaPublica(codigo, locale);
  if (!res) return { title: getPortalDict(locale).offer.notFoundTitle, robots: { index: false } };
  const o = res.data;
  const titulo = o.seo?.titulo ?? titulo_de(o, locale);
  const descripcion =
    o.seo?.descripcion ?? [o.establecimiento?.nombre, o.establecimiento?.zona, o.contenido?.sistema].filter(Boolean).join(" · ");
  const foto = o.contenido?.fotos?.[0];
  return {
    title: titulo,
    description: descripcion,
    alternates: {
      canonical: `/${locale}/ofertas/${o.codigo}`,
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_HTML_LANG[l], `/${l}/ofertas/${o.codigo}`])),
    },
    openGraph: { title: titulo, description: descripcion, type: "website", images: foto ? [{ url: foto.url }] : undefined },
    robots: res.source === "mock" || o.seo?.indexable === false ? { index: false } : undefined,
  };
}

function titulo_de(o: S<"OfertaPublica">, locale: Locale): string {
  const c = o.contenido;
  const cat = codigos(c?.categorias)[0]?.codigo;
  const raza = codigos(c?.razas)[0]?.codigo;
  return [c?.cantidad, cat ? categoriaNombre(cat, locale).toLowerCase() : "", raza ? razaNombre(raza) : ""].filter(Boolean).join(" ");
}

/** Hitos derivados de lo publicado (nunca inventados): nacimiento, sanidad, pesaje. */
function hitos(o: S<"OfertaPublica">, locale: Locale, t: PortalDict) {
  const c = o.contenido ?? {};
  const items: Array<{ titulo: string; detalle: string; fecha?: string; confianza?: "declarado" | "integridad_registrada" }> = [];
  const origen = c.origen as { nacidos_pct?: number } | null | undefined;
  if (origen?.nacidos_pct) items.push({ titulo: t.offer.birth, detalle: t.offer.birthBody(origen.nacidos_pct), confianza: "declarado" });
  const sanidad = (c.sanidad ?? []) as Array<{
    evento?: string;
    detalle?: string;
    fecha?: string;
    confianza?: "declarado" | "integridad_registrada";
  }>;
  for (const s of [...sanidad].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))) {
    items.push({ titulo: s.evento ?? "", detalle: s.detalle ?? "", fecha: s.fecha, confianza: s.confianza });
  }
  if (c.peso?.fecha)
    items.push({
      titulo: t.offer.weighing,
      detalle: `${num(c.peso.promedio_kg ?? 0, locale)} ${t.offer.avgWeight}`,
      fecha: c.peso.fecha,
      confianza: c.peso.declarado ? "declarado" : "integridad_registrada",
    });
  return items.map((i) => ({ ...i, fechaTxt: fecha(i.fecha, locale) }));
}

async function Oferta({ params }: { params: Params }) {
  const { locale: l, codigo } = await params;
  if (!hasLocale(l)) notFound();
  const locale = l;
  const dict = getDictionary(locale);
  const t = getPortalDict(locale);
  const res = await getOfertaPublica(codigo, locale);
  if (!res) notFound();
  const o = res.data;
  const c = o.contenido ?? {};
  const especie = c.especie ?? "BOV";
  const cat = codigos(c.categorias)[0]?.codigo;
  const raza = codigos(c.razas)[0]?.codigo;
  const edad = c.edad as { min_meses?: number; max_meses?: number } | null | undefined;
  const clase = c.clase_faena as { nombre?: string } | null | undefined;
  const sanidad = (c.sanidad ?? []) as Array<{
    evento?: string;
    detalle?: string;
    fecha?: string;
    confianza?: "declarado" | "integridad_registrada";
  }>;
  const cond = (c.condiciones ?? {}) as { modalidad?: string; precio?: string; lugar_carga?: string; disponible_desde?: string };
  const titulo = o.seo?.titulo ?? titulo_de(o, locale);
  const verifUrl = o.verificacion_url ? `${SITE_URL}/${locale}${o.verificacion_url}` : null;
  const perfil = o.establecimiento?.slug ? await getPerfilPublico(o.establecimiento.slug, locale) : null;
  const pf = perfil?.data;
  const actividad = pf?.secciones?.actividad;
  const fotoCampo = pf?.secciones?.portada?.fotos?.[0];
  const linea = hitos(o, locale, t);
  const ultimaSanidad = sanidad.at(-1);
  const estado = o.estado ?? "publicada";
  const whatsapp = pf?.secciones?.contacto?.whatsapp;

  const meta = [
    edad?.min_meses ? t.offer.months(edad.min_meses, edad.max_meses ?? edad.min_meses) : null,
    c.peso?.promedio_kg ? `${num(c.peso.promedio_kg, locale)} ${t.offer.avgWeight}` : null,
    c.sistema,
  ].filter(Boolean);

  return (
    <>
      <SiteHeader
        locale={locale}
        dict={dict}
        path={`/ofertas/${o.codigo}`}
        context={[pf?.productor, o.establecimiento?.nombre].filter(Boolean).join(" · ")}
        cta={{ href: "#consultar", label: t.common.contact }}
      />
      <main className="bg-surface">
        {res.source === "mock" && (
          <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,40px)] pt-4">
            <MockNotice text={t.common.sampleData} />
          </div>
        )}

        {/* Hero: una sola idea (el lote), foto real a la derecha. */}
        <section className="mx-auto grid max-w-[1240px] items-center gap-8 px-[clamp(16px,4vw,40px)] py-[clamp(24px,4vw,44px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
          <div className="order-2 lg:order-1 lg:pt-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
              {o.establecimiento?.zona} · {t.offer.lotForSale}
            </p>
            <h1 className="mt-3 font-display text-[clamp(34px,4.6vw,58px)] font-bold leading-[1.02] tracking-[-0.03em] text-ink">
              {titulo}
            </h1>
            {meta.length > 0 && <p className="mt-3 text-[16px] text-muted">{meta.join(" · ")}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <SpeciesChip especie={especieDe(especie)} withIcon label={t.common.speciesOne[especie]} />
              {raza && <Badge tone="neutral">{razaNombre(raza)}</Badge>}
              {sanidad.length > 0 && (
                <Badge tone="success" icon={<IconShieldCheck size={14} />}>
                  {t.offer.vaccinesLoaded([...new Set(sanidad.map((x) => x.evento?.toLowerCase()).filter(Boolean))].slice(0, 3).join(", "))}
                </Badge>
              )}
              {c.sin_retiro_vigente && (
                <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border border-tierra-50 bg-tierra-50 px-2 py-0.5 text-[12px] font-semibold leading-5 text-carbon">
                  <IconCheckCircle size={14} /> {t.offer.noWithdrawal}
                </span>
              )}
              {estado !== "publicada" && <Badge tone="warning">{t.offer.status[estado] ?? estado}</Badge>}
            </div>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <a href="#consultar" className={buttonClass("primary", "md", "px-5")}>
                <IconMessage size={18} /> {t.offer.consult}
              </a>
              {o.pdf_url && (
                <a href={o.pdf_url} className={buttonClass("outline", "md", "px-5")}>
                  <IconFile size={18} /> {t.offer.pdf}
                </a>
              )}
            </div>
            <p className="mt-5 text-[12.5px] text-muted">
              {t.offer.updated} {fecha(o.actualizado_en, locale, { day: "numeric", month: "long", year: "numeric" })} ·{" "}
              {t.offer.version(o.version ?? 1)}
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <Photo
              src={c.fotos?.[0]}
              alt={c.fotos?.[0]?.alt ?? titulo}
              sizes="(min-width:1024px) 640px, 100vw"
              className="aspect-[3/2] rounded-[16px] border border-border"
              preload
            />
            {(c.fotos?.length ?? 0) > 1 && (
              <ul className="mt-2.5 grid grid-cols-4 gap-2.5" aria-label={t.offer.gallery}>
                {c.fotos!.slice(1, 5).map((f) => (
                <li key={f.sha256}>
                  <Photo src={f} alt={f.alt ?? titulo} sizes="160px" className="aspect-[4/3] rounded-[10px] border border-border" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Datos clave con su nivel de confianza (preview 03). */}
        <section className="border-y border-border bg-base">
          <dl className="mx-auto grid max-w-[1240px] grid-cols-2 px-[clamp(16px,4vw,40px)] lg:grid-cols-4">
            <div className="border-b border-r border-border py-5 pr-4 lg:border-b-0">
              <dt className="sr-only">{t.offer.heads}</dt>
              <dd className="text-[20px] font-bold tabular-nums text-ink">
                {c.cantidad} <span className="text-[15px] font-medium">{t.offer.heads}</span>
              </dd>
              <dd className="mt-2">
                <TrustBadge nivel="declarado" label={t.common.trust.declarado} />
              </dd>
            </div>
            {c.peso && (
              <div className="border-b border-border py-5 pl-4 lg:border-b-0 lg:border-r lg:pr-4">
                <dt className="sr-only">{t.offer.avgWeight}</dt>
                <dd className="text-[20px] font-bold tabular-nums text-ink">
                  {num(c.peso.promedio_kg ?? 0, locale)} <span className="text-[15px] font-medium">{t.offer.avgWeight}</span>
                </dd>
                {c.peso.min_kg && c.peso.max_kg && (
                  <dd className="text-[12.5px] text-muted">{t.offer.range(c.peso.min_kg, c.peso.max_kg)}</dd>
                )}
                <dd className="mt-2">
                  <TrustBadge
                    nivel={c.peso.declarado ? "declarado" : "integridad_registrada"}
                    detail={`${c.peso.metodo === "balanza" ? t.offer.scale : t.offer.estimated} ${fecha(c.peso.fecha, locale)}`}
                    label={c.peso.declarado ? t.common.trust.declarado : t.common.trust.integridad_registrada}
                  />
                </dd>
              </div>
            )}
            {(clase?.nombre || cat) && (
              <div className="border-r border-border py-5 pr-4 lg:pl-4">
                <dt className="text-[15px] text-ink">{t.offer.klass}:</dt>
                <dd className="text-[17px] font-bold leading-snug text-ink">{clase?.nombre ?? categoriaNombre(cat!, locale)}</dd>
                <dd className="mt-2">
                  <TrustBadge nivel="declarado" label={t.common.trust.declarado} />
                </dd>
              </div>
            )}
            {ultimaSanidad && (
              <div className="py-5 pl-4">
                <dt className="text-[15px] text-ink">{t.offer.health}:</dt>
                <dd className="text-[17px] font-bold leading-snug text-ink">
                  {sanidad[0]?.evento} {sanidad[0]?.detalle}
                </dd>
                <dd className="mt-2">
                  <TrustBadge nivel={sanidad[0]?.confianza ?? "declarado"} label={t.common.trust[sanidad[0]?.confianza ?? "declarado"]} />
                </dd>
              </div>
            )}
          </dl>
        </section>

        <div className="mx-auto grid max-w-[1240px] gap-10 px-[clamp(16px,4vw,40px)] py-[clamp(32px,5vw,56px)] lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-12">
            {/* Sobre el establecimiento */}
            {pf && (
              <section aria-labelledby="sobre" className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                <Photo
                  src={fotoCampo}
                  alt={pf.nombre ?? ""}
                  sizes="(min-width:768px) 360px, 100vw"
                  className="aspect-[4/3] rounded-[14px] border border-border"
                />
                <div>
                  <h2 id="sobre" className="text-[20px] font-bold tracking-[-0.01em] text-ink">
                    {t.offer.about}
                  </h2>
                  {pf.secciones?.portada?.historia && (
                    <p className="mt-2 line-clamp-5 text-[15px] leading-relaxed text-ink">{pf.secciones.portada.historia}</p>
                  )}
                  <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                    {actividad?.superficie_ha && (
                      <div className="flex gap-2">
                        <IconPin size={20} className="mt-0.5 shrink-0 text-monte" />
                        <div>
                          <dd className="text-[16px] font-bold tabular-nums text-ink">
                            {num(actividad.superficie_ha, locale)} {t.common.ha}
                          </dd>
                          <dt className="text-[12.5px] text-muted">{t.offer.surface}</dt>
                        </div>
                      </div>
                    )}
                    {!!actividad?.actividades?.length && (
                      <div className="flex gap-2">
                        <IconMap size={20} className="mt-0.5 shrink-0 text-monte" />
                        <div>
                          <dd className="text-[14.5px] font-semibold text-ink">
                            {codigos(actividad.actividades)
                              .map((a) => actividadNombre(a.codigo ?? "", locale))
                              .join(" / ")}
                          </dd>
                          <dt className="text-[12.5px] text-muted">{t.offer.activity}</dt>
                        </div>
                      </div>
                    )}
                    {!!actividad?.especies?.length && (
                      <div className="flex gap-2">
                        <span className="mt-0.5 flex shrink-0 text-monte">
                          <IconCow size={20} />
                          <IconBuffalo size={20} />
                        </span>
                        <div>
                          <dd className="text-[14.5px] font-semibold text-ink">
                            {codigos(actividad.especies)
                              .map((e) => t.common.species[(e.codigo as "BOV" | "BUB") ?? "BOV"])
                              .join({ es: " y ", en: " and ", pt: " e " }[locale])}
                          </dd>
                          <dt className="text-[12.5px] text-muted">{t.offer.speciesLabel}</dt>
                        </div>
                      </div>
                    )}
                  </dl>
                  <Link
                    href={`/${locale}/p/${pf.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-campo hover:underline"
                  >
                    {t.offer.seeProfile} <IconArrowRight size={16} />
                  </Link>
                </div>
              </section>
            )}

            {/* Trazabilidad del lote: sólo hitos publicados */}
            {linea.length > 0 && (
              <section aria-labelledby="traza">
                <h2 id="traza" className="text-[20px] font-bold tracking-[-0.01em] text-ink">
                  {t.offer.traceTitle}
                </h2>
                <p className="mt-1 text-[14px] text-muted">{t.offer.traceLead}</p>
                <ol className="mt-6 grid gap-0 sm:grid-flow-col sm:auto-cols-fr">
                  {linea.map((h, i) => (
                    <li key={`${h.titulo}-${i}`} className="relative flex gap-4 pb-6 sm:block sm:pb-0 sm:pr-4">
                      <span
                        aria-hidden="true"
                        className={cx(
                          "absolute bg-campo",
                          "left-[6px] top-4 h-full w-0.5 sm:left-4 sm:right-0 sm:top-[6px] sm:h-0.5 sm:w-auto",
                          i === linea.length - 1 && "hidden",
                        )}
                      />
                      <span
                        aria-hidden="true"
                        className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-monte bg-monte sm:mt-0 sm:block"
                      />
                      <div className="sm:mt-3">
                        <p className="text-[14.5px] font-semibold text-ink">{h.titulo}</p>
                        <p className="text-[13px] text-muted">{h.detalle}</p>
                        {h.fechaTxt && <p className="mt-0.5 text-[12.5px] tabular-nums text-muted">{h.fechaTxt}</p>}
                        {h.confianza && (
                          <p className="mt-1.5">
                            <TrustInline nivel={h.confianza} label={t.common.trust[h.confianza]} />
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Documentos publicados */}
            {!!c.documentos?.length && (
              <section aria-labelledby="docs">
                <h2 id="docs" className="text-[20px] font-bold tracking-[-0.01em] text-ink">
                  {t.offer.documents}
                </h2>
                <ul className="mt-4 divide-y divide-border rounded-[var(--radius-card)] border border-border">
                  {c.documentos.map((doc) => (
                    <li key={doc.titulo} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
                      <IconFile size={22} className="shrink-0 text-monte" />
                      <div className="min-w-0 flex-1 basis-[220px]">
                        <p className="text-[14.5px] font-semibold text-ink">{doc.titulo}</p>
                        <p className="text-[12.5px] text-muted">
                          {doc.emisor_declarado && `${t.offer.issuedBy} ${doc.emisor_declarado} · `}
                          {fecha(doc.emitido_en, locale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 pl-[34px] sm:pl-0">
                        <TrustBadge nivel={doc.confianza ?? "declarado"} label={t.common.trust[doc.confianza ?? "declarado"]} />
                        {doc.verificacion_url && (
                          <Link href={`/${locale}${doc.verificacion_url}`} className={buttonClass("ghost", "sm", "text-campo")}>
                            {t.offer.verify}
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Columna lateral: condiciones y verificación */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface">
              <h2 className="border-b border-border px-5 py-3.5 text-[16px] font-semibold text-ink">{t.offer.conditions}</h2>
              <dl className="space-y-3.5 px-5 py-4 text-[14px]">
                {cond.modalidad && (
                  <div className="flex gap-3">
                    <IconTruck size={18} className="mt-0.5 shrink-0 text-monte" />
                    <div>
                      <dt className="sr-only">{t.offer.conditions}</dt>
                      <dd className="font-semibold text-ink">{t.offer.modality[cond.modalidad] ?? cond.modalidad}</dd>
                      <dd className="text-muted">{t.offer.price[cond.precio ?? ""] ?? cond.precio}</dd>
                    </div>
                  </div>
                )}
                {cond.lugar_carga && (
                  <div className="flex gap-3">
                    <IconPin size={18} className="mt-0.5 shrink-0 text-monte" />
                    <div>
                      <dt className="text-muted">{t.offer.loading}</dt>
                      <dd className="text-ink">{cond.lugar_carga}</dd>
                    </div>
                  </div>
                )}
                {cond.disponible_desde && (
                  <div className="flex gap-3">
                    <IconCalendar size={18} className="mt-0.5 shrink-0 text-monte" />
                    <div>
                      <dt className="text-muted">{t.offer.available}</dt>
                      <dd className="text-ink">
                        {fecha(cond.disponible_desde, locale, { day: "numeric", month: "long", year: "numeric" })}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
              <div className="border-t border-border px-5 py-4">
                <a href="#consultar" className={buttonClass("primary", "md", "w-full")}>
                  {t.offer.consult}
                </a>
              </div>
            </div>

            {verifUrl && (
              <div className="flex gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <Qr value={verifUrl} size={96} label={t.offer.qrTitle} />
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-ink">{t.offer.qrTitle}</h2>
                  <p className="mt-1 text-[12.5px] leading-snug text-muted">{t.offer.qrBody}</p>
                  <Link
                    href={`/${locale}${o.verificacion_url}`}
                    className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline"
                  >
                    {t.offer.verify} <IconArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
            {o.huella && (
              <p className="break-all px-1 font-mono text-[11px] leading-relaxed text-subtle">
                {t.offer.fingerprint}: {o.huella}
              </p>
            )}
            {o.pdf_url && (
              <a href={o.pdf_url} className="flex items-center gap-2 px-1 text-[13px] font-medium text-campo hover:underline">
                <IconDownload size={16} /> {t.offer.pdf}
              </a>
            )}
          </aside>
        </div>

        {/* Consulta sin cuenta (flujo 19, TPA-55) */}
        <ContactSection
          locale={locale}
          t={t}
          about={t.contact.about(titulo)}
          establecimiento={o.establecimiento?.slug}
          oferta={o.codigo}
          extra={
            whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`${titulo} — ${SITE_URL}/${locale}/ofertas/${o.codigo}`)}`}
                className={buttonClass("outline", "md")}
              >
                <IconWhatsapp size={18} /> WhatsApp
              </a>
            )
          }
        />
      </main>
      <SiteFooter locale={locale} dict={dict} legend={o.leyenda} />
    </>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto grid max-w-[1240px] gap-10 px-[clamp(16px,4vw,40px)] py-12 lg:grid-cols-[5fr_6fr]" aria-hidden="true">
      <div className="space-y-4">
        <div className="h-4 w-48 rounded bg-ghost" />
        <div className="h-24 w-full rounded bg-ghost" />
        <div className="h-11 w-56 rounded bg-ghost" />
      </div>
      <div className="aspect-[4/3] rounded-[16px] bg-ghost" />
    </div>
  );
}

/** Ficha pública de oferta (flujo 12, TPA-48). Sólo lo que el productor publicó; leyenda fija. */
export default function OfertaPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Oferta params={params} />
    </Suspense>
  );
}
