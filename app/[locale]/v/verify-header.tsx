import { IconSearch } from "@/components/icons";
import { buttonClass, inputClass } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import type { PortalDict } from "@/lib/i18n/portal";

/** Buscador de huella (para quien tiene el código y no el QR). */
export function HashSearch({ locale, t, defaultValue }: { locale: Locale; t: PortalDict; defaultValue?: string }) {
  return (
    <form action={`/${locale}/v`} role="search" className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="huella" className="sr-only">
        {t.verify.hashLabel}
      </label>
      <div className="relative flex-1">
        <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          id="huella"
          name="huella"
          defaultValue={defaultValue}
          placeholder={t.verify.hashLabel}
          autoComplete="off"
          spellCheck={false}
          className={`${inputClass} pl-10 font-mono text-[13.5px]`}
        />
      </div>
      <button type="submit" className={buttonClass("primary", "md")}>
        {t.verify.hashCta}
      </button>
    </form>
  );
}
