import Link from "next/link";
import { Logo } from "@/components/brand";
import { IconInfo } from "@/components/icons";
import type { Dictionary, Locale } from "@/lib/i18n";

/** Pie público con la leyenda fija de no certificación (invariante de producto). */
export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,40px)] py-8">
        <p className="flex gap-2.5 rounded-[10px] border border-border bg-base px-4 py-3 text-[13px] leading-relaxed text-muted">
          <IconInfo size={16} className="mt-0.5 shrink-0" />
          {dict.footer.legend}
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
      </div>
    </footer>
  );
}
