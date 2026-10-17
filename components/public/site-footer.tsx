import Link from "next/link";
import { Logo } from "@/components/brand";
import { IconAndroid, IconDownload, IconInfo } from "@/components/icons";
import type { Dictionary, Locale } from "@/lib/i18n";

/** Pie público con la leyenda fija de no certificación (invariante de producto). */
export function SiteFooter({ locale, dict, legend }: { locale: Locale; dict: Dictionary; /** Leyenda que trae el Resource público (mismo sentido, texto de la API). */ legend?: string }) {
  const androidUrl = process.env.NEXT_PUBLIC_APP_ANDROID_URL || "/descargas/tropilla.apk";

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,40px)] py-8">
        <p className="flex gap-2.5 rounded-[10px] border border-border bg-base px-4 py-3 text-[13px] leading-relaxed text-muted">
          <IconInfo size={16} className="mt-0.5 shrink-0" />
          {legend ?? dict.footer.legend}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link href={`/${locale}`} aria-label="TROPILLA">
            <Logo height={24} />
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted" aria-label="Legales">
            <Link href={`/${locale}/directorio`} className="hover:text-ink">
              {dict.nav.directory}
            </Link>
            <Link href="/registro" className="hover:text-ink">
              {dict.nav.producers}
            </Link>
            <span>{dict.footer.rights}</span>
          </nav>
        </div>
        <a
          href={androidUrl}
          download
          className="mt-6 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-campo bg-campo-50 px-5 py-4 text-ink transition-shadow hover:shadow-sm"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-campo text-blanco">
            <IconAndroid size={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">{dict.footer.androidDownload}</span>
            <span className="block text-[13px] text-muted">{dict.footer.androidDownloadNote}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-campo px-4 py-2.5 text-[14px] font-semibold text-blanco">
            <IconDownload size={18} />
            APK
          </span>
        </a>
      </div>
    </footer>
  );
}
