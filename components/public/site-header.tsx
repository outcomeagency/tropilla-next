import Link from "next/link";
import { Logo } from "@/components/brand";
import { buttonClass, cx } from "@/components/ui";
import { LOCALE_LABEL, LOCALES, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * Header público sticky: marca, secciones, selector ES/EN/PT (mantiene la
 * página actual: `path` es la ruta sin el prefijo de idioma) e ingreso.
 */
export function SiteHeader({
  locale,
  dict,
  path = "",
  current,
  context,
  cta,
}: {
  locale: Locale;
  dict: Dictionary;
  path?: string;
  current?: "directory" | "offers" | "providers";
  /** Ficha de un productor: «Agropecuaria Don Ramón · La Esperanza» en lugar de las secciones. */
  context?: string;
  /** Botón principal (ej. «Consultar» en una oferta) en lugar de «Ingresar». */
  cta?: { href: string; label: string };
}) {
  const nav = [
    {
      key: "directory",
      href: `/${locale}/directorio`,
      label: dict.nav.directory,
    },
    {
      key: "offers",
      href: `/${locale}/directorio?con_oferta=1`,
      label: dict.nav.offers,
    },
    {
      key: "providers",
      href: `/${locale}/proveedores`,
      label: dict.nav.providers,
    },
    { key: "producers", href: "/registro", label: dict.nav.producers },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-[clamp(16px,4vw,40px)]">
        <Link href={`/${locale}`} aria-label="TROPILLA" className="shrink-0">
          <Logo height={34} />
        </Link>

        {context ? (
          <p className="hidden min-w-0 truncate border-l border-border pl-6 text-[14px] text-muted md:block">{context}</p>
        ) : (
          <nav aria-label="Secciones" className="hidden items-center gap-6 text-[14px] md:flex">
            {nav.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={current === n.key ? "page" : undefined}
                className={cx(current === n.key ? "font-semibold text-ink" : "text-muted hover:text-ink")}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}

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
                  href={`/${l}${path}`}
                  hrefLang={l}
                  lang={l}
                  aria-current={l === locale ? "page" : undefined}
                  className={cx(l === locale ? "text-monte underline underline-offset-4" : "text-muted hover:text-ink")}
                >
                  {LOCALE_LABEL[l]}
                </Link>
              </span>
            ))}
          </nav>
          <Link href={cta?.href ?? "/ingresar"} className={buttonClass("primary", "sm")}>
            {cta?.label ?? dict.nav.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
