import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { FileVerify } from "@/components/public/file-verify";
import { TrustBadge, buttonClass } from "@/components/ui";
import { IconAlert, IconAnchor, IconArrowRight, IconDownload, IconInfo, IconShieldCheck } from "@/components/icons";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { fileVerifyDict, getPortalDict } from "@/lib/i18n/portal";
import { getVerificacion } from "@/lib/data/portal";
import { HashSearch } from "../verify-header";

type Params = Promise<{ locale: string; huella: string }>;
const LANG: Record<Locale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };
/** Rol de quien registró (la verificación muestra el rol, el nombre sólo si el productor lo permite). */
const ROLES: Record<Locale, Record<string, string>> = {
  es: { dueno: "Dueño", administrador: "Administrador", encargado: "Encargado", veterinario: "Veterinario", asesor: "Asesor", lectura: "Lectura", sistema: "TROPILLA" },
  en: { dueno: "Owner", administrador: "Manager", encargado: "Foreman", veterinario: "Veterinarian", asesor: "Advisor", lectura: "Read-only", sistema: "TROPILLA" },
  pt: { dueno: "Proprietário", administrador: "Administrador", encargado: "Capataz", veterinario: "Veterinário", asesor: "Consultor", lectura: "Leitura", sistema: "TROPILLA" },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  // Las verificaciones no se indexan: son páginas de consulta, no de presentación.
  return { title: getPortalDict(locale).verify.metaTitle, robots: { index: false, follow: false } };
}

function bonito(sobre: string): string {
  try {
    return JSON.stringify(JSON.parse(sobre), null, 2);
  } catch {
    return sobre;
  }
}

async function Resultado({ params }: { params: Params }) {
  const { locale: l, huella } = await params;
  if (!hasLocale(l)) notFound();
  const locale = l;
  const t = getPortalDict(locale);
  const v = t.verify;
  const valida = /^[a-f0-9]{64}$/i.test(huella);
  const res = valida ? await getVerificacion(huella.toLowerCase(), locale) : null;
  const fecha = (iso?: string | null) =>
    iso
      ? new Intl.DateTimeFormat(LANG[locale], { dateStyle: "long", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso))
      : "";

  if (!res) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 rounded-[var(--radius-card)] border border-warning-border bg-warning-bg p-5">
          <IconAlert size={28} className="shrink-0 text-warning" />
          <div>
            <h1 className="text-[22px] font-bold text-ink">{v.notFound}</h1>
            <p className="mt-1 text-[15px] text-ink">{v.notFoundLead}</p>
            <p className="mt-2 break-all font-mono text-[12.5px] text-muted">{huella}</p>
          </div>
        </div>
        <HashSearch locale={locale} t={t} />
        <FileVerify locale={locale} t={fileVerifyDict(t)} />
      </div>
    );
  }

  const r = res.data;
  const anc = r.integridad?.anclaje;
  const integridad = r.confianza === "integridad_registrada";
  const filas: Array<{ k: string; v: React.ReactNode }> = [
    { k: v.what, v: <><span className="font-semibold">{v.types[r.tipo ?? ""] ?? r.tipo}</span>{r.descripcion && <span className="block text-muted">{r.descripcion}</span>}</> },
    { k: v.when, v: fecha(r.registrado_en) },
  ];
  if (r.autor) filas.push({ k: v.who, v: [r.autor.rol ? (ROLES[locale][r.autor.rol] ?? r.autor.rol) : null, r.autor.nombre].filter(Boolean).join(" · ") });
  if (r.establecimiento?.nombre)
    filas.push({
      k: v.farm,
      v: r.establecimiento.slug ? (
        <Link href={`/${locale}/p/${r.establecimiento.slug}`} className="font-medium text-campo hover:underline">
          {r.establecimiento.nombre}
        </Link>
      ) : (
        r.establecimiento.nombre
      ),
    });
  filas.push({
    k: v.versions,
    v: (
      <span className={r.es_vigente === false ? "font-semibold text-warning" : undefined}>{v.versionsTxt(r.versiones ?? 1, r.es_vigente !== false)}</span>
    ),
  });
  filas.push({ k: v.level, v: <TrustBadge nivel={r.confianza ?? "declarado"} label={t.common.trust[r.confianza ?? "declarado"]} /> });
  filas.push({
    k: v.anchor,
    v:
      anc?.confirmado_en ? (
        <span className="flex items-start gap-1.5">
          <IconAnchor size={16} className="mt-0.5 shrink-0 text-campo" />
          <span>
            {v.anchorTxt(anc.red ?? anc.driver ?? "", fecha(anc.confirmado_en))}
            {anc.recibo_url && (
              <a href={anc.recibo_url} className="ml-2 font-medium text-campo hover:underline" rel="noopener noreferrer" target="_blank">
                {v.receipt}
              </a>
            )}
          </span>
        </span>
      ) : (
        <span className="text-muted">{v.anchorPending}</span>
      ),
  });

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <div className={integridad ? "flex gap-4 border-b border-success-border bg-success-bg p-5 sm:p-6" : "flex gap-4 border-b border-border bg-neutral-bg p-5 sm:p-6"}>
          <span className={integridad ? "grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-surface text-success" : "grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-surface text-neutral"}>
            {integridad ? <IconShieldCheck size={26} /> : <IconInfo size={26} />}
          </span>
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">{v.found}</h1>
            <p className="mt-1 max-w-[62ch] text-[15px] text-ink">{v.foundLead}</p>
          </div>
        </div>
        <dl className="divide-y divide-border">
          {filas.map((f) => (
            <div key={f.k} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-4 sm:px-6">
              <dt className="text-[13px] font-medium text-muted">{f.k}</dt>
              <dd className="text-[14.5px] text-ink">{f.v}</dd>
            </div>
          ))}
          <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-4 sm:px-6">
            <dt className="text-[13px] font-medium text-muted">{v.fingerprint}</dt>
            <dd className="break-all font-mono text-[12.5px] text-ink">{r.huella}</dd>
          </div>
          {r.integridad?.eslabon && (
            <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-4 sm:px-6">
              <dt className="text-[13px] font-medium text-muted">{v.chain}</dt>
              <dd className="break-all font-mono text-[12.5px] text-muted">
                #{r.integridad.seq} · {r.integridad.eslabon}
              </dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap gap-2 border-t border-border bg-base px-5 py-3.5 sm:px-6">
          <a href={`/api/verificaciones/${r.huella}/prueba`} className={buttonClass("outline", "sm")}>
            <IconDownload size={16} /> {v.proof}
          </a>
          {r.establecimiento?.slug && (
            <Link href={`/${locale}/p/${r.establecimiento.slug}`} className={buttonClass("ghost", "sm", "text-campo")}>
              {r.establecimiento.nombre} <IconArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>

      {r.sobre && (
        <details className="group rounded-[var(--radius-card)] border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[14px] font-semibold text-ink">
            {v.content}
            <span className="text-[12.5px] font-medium text-campo group-open:hidden">{v.contentShow}</span>
          </summary>
          <div className="border-t border-border px-5 py-4">
            <p className="mb-3 text-[13px] text-muted">{v.contentLead}</p>
            <pre className="max-h-[420px] overflow-auto rounded-[10px] border border-border bg-base p-4 font-mono text-[12px] leading-relaxed text-ink">{bonito(r.sobre)}</pre>
          </div>
        </details>
      )}

      <section aria-labelledby="significa" className="grid gap-3 sm:grid-cols-2">
        <h2 id="significa" className="sr-only">
          {v.meaningTitle}
        </h2>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <IconShieldCheck size={18} className="text-campo" /> {v.provesTitle}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink">{v.meaningYes}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <IconInfo size={18} /> {v.notProvesTitle}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink">{v.meaningNo}</p>
        </div>
      </section>

      <FileVerify locale={locale} t={fileVerifyDict(t)} />
    </div>
  );
}

async function Pagina({ params }: { params: Params }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = getPortalDict(locale);
  return (
    <>
      <SiteHeader locale={locale} dict={dict} />
      <main className="bg-base">
        <div className="mx-auto max-w-[880px] px-[clamp(16px,4vw,40px)] py-[clamp(28px,5vw,56px)]">
          <p className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
            <IconShieldCheck size={15} /> {t.verify.eyebrow}
          </p>
          <Resultado params={params} />
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} />
    </>
  );
}

/** Página pública de verificación (flujo 14, TPA-41): qué, cuándo, quién, versiones, anclaje. Verificar ≠ ver. */
export default function VerificacionPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-16 h-[420px] max-w-[880px] rounded-[var(--radius-card)] border border-border bg-surface" aria-hidden="true" />}>
      <Pagina params={params} />
    </Suspense>
  );
}
