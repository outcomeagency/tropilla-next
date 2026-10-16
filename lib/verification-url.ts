import type { Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/** API verification URLs may be absolute; panel links stay on the current app origin. */
export function verificationPath(url: string, locale: Locale): string {
  const pathname = new URL(url, SITE_URL).pathname.replace(/\/+$/, "");
  return pathname.startsWith(`/${locale}/`) ? pathname : `/${locale}${pathname}`;
}

/** Canonical absolute URL used by verification QR codes. */
export function verificationUrl(url: string, locale: Locale): string {
  return new URL(verificationPath(url, locale), SITE_URL).toString();
}
