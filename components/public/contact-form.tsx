"use client";

import Script from "next/script";
import { useActionState, useState } from "react";
import { contactAction, type ContactState } from "@/lib/contact-actions";
import { ChoiceChip } from "@/components/choice";
import { IconCheckCircle, IconLock, IconSend } from "@/components/icons";
import { Button, Field, Input, Notice, Select, Spinner, Textarea, fieldAria } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import type { PortalDict } from "@/lib/i18n/portal";

type Dict = Omit<PortalDict["contact"], "about">;

/** Países frecuentes primero (Mercosur y destinos de exportación); el resto, en orden alfabético del idioma. */
const PAISES = ["AR", "BR", "PY", "UY", "BO", "CL", "CN", "US", "IL", "DE", "NL", "IT", "ES", "RU", "SA", "AE", "EG", "CO", "PE", "MX", "VE"];

export function ContactForm({
  locale,
  t,
  about,
  establecimiento,
  oferta,
  turnstileKey,
}: {
  locale: Locale;
  t: Dict;
  /** «Sobre: 30 bubillos Mediterráneos» */
  about?: string;
  establecimiento?: string;
  oferta?: string;
  turnstileKey?: string;
}) {
  const [state, action, pending] = useActionState(contactAction, {} as ContactState);
  const [renderedAt] = useState(() => Date.now());
  const [idem] = useState(() => crypto.randomUUID());
  const [reset, setReset] = useState(0);
  const f = state.fields ?? {};
  const val = state.values ?? {};
  const region = new Intl.DisplayNames([locale], { type: "region" });
  const paises = [...PAISES.slice(0, 4), ...PAISES.slice(4).sort((a, b) => region.of(a)!.localeCompare(region.of(b)!, locale))];

  if (state.sent && reset === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-success-bg text-success">
          <IconCheckCircle size={26} />
        </span>
        <h3 className="mt-4 text-[20px] font-bold text-ink">{t.sentTitle}</h3>
        <p className="mt-1.5 max-w-[60ch] text-[15px] text-muted">{t.sentBody}</p>
        {state.sent.demo && (
          <div className="mt-4">
            <Notice tone="warning" title={t.sentDemo} />
          </div>
        )}
        <button type="button" onClick={() => setReset((r) => r + 1)} className="mt-5 text-[14px] font-medium text-campo hover:underline">
          {t.another}
        </button>
      </div>
    );
  }

  return (
    <form key={reset} action={action} noValidate className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      {turnstileKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />}
      <input type="hidden" name="idioma" value={locale} />
      <input type="hidden" name="t" value={renderedAt} />
      <input type="hidden" name="idem" value={idem} />
      {establecimiento && <input type="hidden" name="establecimiento_slug" value={establecimiento} />}
      {oferta && <input type="hidden" name="oferta_codigo" value={oferta} />}
      {/* Honeypot: invisible para personas, tentador para bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {about && <p className="border-b border-border px-5 py-3 text-[13.5px] font-medium text-muted sm:px-6">{about}</p>}
      <div className="space-y-5 p-5 sm:p-6">
        {state.error && <Notice tone="danger" title={state.error} />}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.name} htmlFor="c-nombre" error={f.nombre}>
            <Input id="c-nombre" name="nombre" autoComplete="name" defaultValue={val.nombre} {...fieldAria("c-nombre", f.nombre)} />
          </Field>
          <Field label={t.company} htmlFor="c-empresa" optional>
            <Input id="c-empresa" name="empresa" autoComplete="organization" defaultValue={val.empresa} />
          </Field>
          <Field label={t.country} htmlFor="c-pais" error={f.pais}>
            <Select id="c-pais" name="pais" defaultValue={val.pais ?? (locale === "pt" ? "BR" : locale === "es" ? "AR" : "")} {...fieldAria("c-pais", f.pais)}>
              <option value="">—</option>
              {paises.map((c) => (
                <option key={c} value={c}>
                  {region.of(c)}
                </option>
              ))}
              <option value="ZZ">…</option>
            </Select>
          </Field>
          <Field label={t.volume} htmlFor="c-volumen" optional>
            <Input id="c-volumen" name="volumen" placeholder={t.volumePh} defaultValue={val.volumen} />
          </Field>
          <Field label={t.email} htmlFor="c-email" error={f.email} hint={t.contactHint}>
            <Input id="c-email" name="email" type="email" autoComplete="email" defaultValue={val.email} {...fieldAria("c-email", f.email, true)} />
          </Field>
          <Field label={t.phone} htmlFor="c-tel">
            <Input id="c-tel" name="telefono" type="tel" autoComplete="tel" inputMode="tel" defaultValue={val.telefono} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink">{t.buyerType}</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(t.types).map(([k, label]) => (
              <ChoiceChip key={k} type="radio" name="tipo_comprador" value={k} label={label} defaultChecked={val.tipo_comprador === k} />
            ))}
          </div>
          {f.tipo_comprador && <p className="mt-2 text-[12.5px] font-medium text-danger">{f.tipo_comprador}</p>}
        </fieldset>
        <Field label={t.message} htmlFor="c-mensaje" error={f.mensaje}>
          <Textarea id="c-mensaje" name="mensaje" rows={5} placeholder={t.messagePh} defaultValue={val.mensaje} maxLength={4000} {...fieldAria("c-mensaje", f.mensaje)} />
        </Field>
        {turnstileKey && <div className="cf-turnstile" data-sitekey={turnstileKey} data-language={locale} />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-base px-5 py-4 sm:px-6">
        <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <IconLock size={14} className="shrink-0" /> {t.privacy}
        </p>
        <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconSend size={18} />}>
          {pending ? t.sending : t.send}
        </Button>
      </div>
    </form>
  );
}
