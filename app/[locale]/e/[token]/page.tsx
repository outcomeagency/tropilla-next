import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Badge, TrustBadge, buttonClass } from "@/components/ui";
import { IconAlert, IconClock, IconFile, IconShare, IconShieldCheck } from "@/components/icons";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { getPortalDict } from "@/lib/i18n/portal";
import { getEnlacePublico } from "@/lib/data/portal";

type Params = Promise<{ locale: string; token: string }>;
const LANG: Record<Locale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  // Un enlace compartido es privado: nunca se indexa.
  return { title: getPortalDict(locale).shared.metaTitle, robots: { index: false, follow: false } };
}

async function Contenido({ params }: { params: Params }) {
  const { locale: l, token } = await params;
  if (!hasLocale(l)) notFound();
  const locale = l;
  const dict = getDictionary(locale);
  const t = getPortalDict(locale).shared;
  const common = getPortalDict(locale).common;
  const valido = /^[A-Za-z0-9_-]{16,128}$/.test(token);
  const res = valido ? await getEnlacePublico(token, locale) : null;
  const fecha = (iso?: string | null, hora = false) =>
    iso
      ? new Intl.DateTimeFormat(LANG[locale], { dateStyle: "long", ...(hora ? { timeStyle: "short" } : {}), timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso))
      : "—";

  let cuerpo;
  if (!res || res === "gone") {
    cuerpo = (
      <div className="flex gap-4 rounded-[var(--radius-card)] border border-warning-border bg-warning-bg p-5">
        <IconAlert size={28} className="shrink-0 text-warning" />
        <div>
          <h1 className="text-[22px] font-bold text-ink">{res === "gone" ? t.goneTitle : t.notFoundTitle}</h1>
          <p className="mt-1 text-[15px] text-ink">{res === "gone" ? t.goneLead : t.notFoundLead}</p>
        </div>
      </div>
    );
  } else {
    const e = res.data;
    const d = e.documento ?? {};
    const archivo = e.archivos?.find((a) => a.estado !== "corrupto");
    const huella = d.verificacion_url?.match(/\/v\/([a-f0-9]{64})/)?.[1];
    const estado = d.estado ?? "vigente";
    cuerpo = (
      <>
        {estado === "reemplazado" && (
          <div className="mb-4 flex gap-3 rounded-[10px] border border-info-border bg-info-bg px-4 py-3 text-[14px] text-info">
            <IconAlert size={18} className="mt-0.5 shrink-0" /> {t.replaced}
          </div>
        )}
        <article className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          <header className="flex gap-4 border-b border-border px-6 py-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border border-border bg-crema text-monte">
              <IconFile size={24} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">{d.titulo}</h1>
              {e.establecimiento?.nombre && <p className="mt-0.5 text-[14px] text-muted">{t.from(e.establecimiento.nombre)}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TrustBadge nivel={d.confianza ?? "declarado"} label={common.trust[d.confianza ?? "declarado"]} />
                <Badge tone={estado === "vigente" ? "success" : estado === "vencido" ? "danger" : "neutral"}>{t.statuses[estado] ?? estado}</Badge>
                {e.version && <Badge tone="neutral">{t.version(e.version)}</Badge>}
              </div>
            </div>
          </header>
          <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
            {[
              [t.type, d.tipo],
              [t.issuer, d.emisor_declarado ?? "—"],
              [t.issued, fecha(d.emitido_en)],
              [t.validUntil, d.vence_en ? fecha(d.vence_en) : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] font-medium text-muted">{k}</dt>
                <dd className="mt-0.5 text-[15px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-base px-6 py-4">
            {archivo?.sha256 ? (
              <a href={`/api/enlaces/${token}/archivo/${archivo.sha256}`} target="_blank" rel="noopener" className={buttonClass("primary", "md")}>
                <IconFile size={18} /> {t.open}
              </a>
            ) : (
              <span className="text-[13.5px] text-muted">{t.noFile}</span>
            )}
            {huella && (
              <Link href={`/${locale}/v/${huella}`} className={buttonClass("outline", "md")}>
                <IconShieldCheck size={18} /> {t.verify}
              </Link>
            )}
          </div>
        </article>
        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
          <IconClock size={15} className="shrink-0" /> {t.expires(fecha(e.expira_en, true))}
        </p>
        <p className="mt-2 text-[13px] text-muted">{t.whatProves}</p>
      </>
    );
  }

  return (
    <>
      <SiteHeader locale={locale} dict={dict} />
      <main className="bg-base">
        <div className="mx-auto max-w-[760px] px-[clamp(16px,4vw,40px)] py-[clamp(28px,5vw,56px)]">
          <p className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
            <IconShare size={15} /> {t.eyebrow}
          </p>
          {cuerpo}
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} />
    </>
  );
}

/** Documento compartido por un enlace que vence (TPA-38): datos, nivel de confianza y verificación. No se indexa. */
export default function EnlacePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-16 h-[420px] max-w-[760px] rounded-[var(--radius-card)] border border-border bg-surface" aria-hidden="true" />}>
      <Contenido params={params} />
    </Suspense>
  );
}
