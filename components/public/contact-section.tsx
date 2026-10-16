import type { ReactNode } from "react";
import { ContactForm } from "@/components/public/contact-form";
import { contactDict, type PortalDict } from "@/lib/i18n/portal";
import type { Locale } from "@/lib/i18n";

/** Sección «Consultá directo» (flujo 19): qué pasa después + formulario sin cuenta. Reutilizada en oferta y perfil. */
export function ContactSection({
  locale,
  t,
  about,
  establecimiento,
  oferta,
  extra,
}: {
  locale: Locale;
  t: PortalDict;
  about?: string;
  establecimiento?: string;
  oferta?: string;
  extra?: ReactNode;
}) {
  return (
    <section id="consultar" className="scroll-mt-20 border-t border-border bg-base">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-[clamp(16px,4vw,40px)] py-[clamp(32px,5vw,56px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div>
          <h2 className="font-display text-[clamp(24px,3vw,32px)] font-bold leading-tight tracking-[-0.02em] text-ink">{t.contact.title}</h2>
          <p className="mt-2 text-[15px] text-muted">{t.contact.lead}</p>
          <ol className="mt-6 space-y-4">
            {t.contact.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="font-display text-[22px] font-bold leading-none tabular-nums text-crema-300" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14.5px] text-ink">{s}</span>
              </li>
            ))}
          </ol>
          {extra && <div className="mt-6">{extra}</div>}
        </div>
        <ContactForm
          locale={locale}
          t={contactDict(t)}
          about={about}
          establecimiento={establecimiento}
          oferta={oferta}
          turnstileKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      </div>
    </section>
  );
}
