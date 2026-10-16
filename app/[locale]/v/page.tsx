import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { FileVerify } from "@/components/public/file-verify";
import { IconShieldCheck } from "@/components/icons";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { fileVerifyDict, getPortalDict } from "@/lib/i18n/portal";
import { HashSearch } from "./verify-header";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: getPortalDict(locale).verify.metaTitle };
}

/** ?huella=… → /v/<huella> (el buscador funciona sin JS). */
async function Redirector({ searchParams, locale }: { searchParams: Promise<{ huella?: string }>; locale: string }) {
  const { huella } = await searchParams;
  if (huella) {
    const h = huella.trim().toLowerCase().replace(/[^a-f0-9]/g, "");
    redirect(`/${locale}/v/${h || "0"}`);
  }
  return null;
}

export default async function VerificarIndex({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ huella?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = getPortalDict(locale);
  return (
    <>
      <SiteHeader locale={locale} dict={dict} path="/v" />
      <Suspense fallback={null}>
        <Redirector searchParams={searchParams} locale={locale} />
      </Suspense>
      <main className="bg-base">
        <div className="mx-auto max-w-[880px] space-y-6 px-[clamp(16px,4vw,40px)] py-[clamp(28px,5vw,56px)]">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
              <IconShieldCheck size={15} /> {t.verify.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-[clamp(28px,3.6vw,42px)] font-bold leading-tight tracking-[-0.02em] text-ink">{t.verify.metaTitle}</h1>
          </div>
          <HashSearch locale={locale} t={t} />
          <FileVerify locale={locale} t={fileVerifyDict(t)} />
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} />
    </>
  );
}
