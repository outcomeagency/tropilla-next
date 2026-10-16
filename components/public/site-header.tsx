import Link from "next/link";
import { Logo } from "@/components/brand";
import { buttonClass, cx } from "@/components/ui";
import { LOCALE_LABEL, LOCALES, type Dictionary, type Locale } from "@/lib/i18n";

/** Header público sticky: marca, secciones, selector ES/EN/PT e ingreso al panel. */
export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-[clamp(16px,4vw,40px)]">
        <Link href={`/${locale}`} aria-label="TROPILLA" className="shrink-0">
          <Logo height={34} />
        </Link>

        <nav aria-label="Secciones" className="hidden items-center gap-6 text-[14px] text-muted md:flex">
          <a href="#directorio" className="hover:text-ink">
            {dict.nav.directory}
          </a>
          <a href="#como-funciona" className="hover:text-ink">
            {dict.nav.offers}
          </a>
          <a href="#productores" className="hover:text-ink">
            {dict.nav.producers}
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <nav aria-label={dict.nav.language} className="flex items-center text-[13px] font-medium">
            {LOCALES.map((l, i) => (
              <span key={l} className="flex items-center">
                {i > 0 && (
                  <span className="px-1.5 text-subtle" aria-hidden="true">
                    |
                  </span>
                )}
                <Link
                  href={`/${l}`}
                  hrefLang={l}
                  aria-current={l === locale ? "page" : undefined}
                  className={cx(l === locale ? "text-monte underline underline-offset-4" : "text-muted hover:text-ink")}
                >
                  {LOCALE_LABEL[l]}
                </Link>
              </span>
            ))}
          </nav>
          <Link href="/ingresar" className={buttonClass("primary", "sm")}>
            {dict.nav.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
