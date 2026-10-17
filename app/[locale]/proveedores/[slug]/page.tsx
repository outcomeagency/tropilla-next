import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Card, Select, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";
import { ApiError, api } from "@/lib/api";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getProveedor } from "@/lib/data/proveedores";
import { PROVINCIAS } from "@/lib/geo";
import type { Many, S } from "@/lib/schemas";
import { solicitarPresupuesto } from "../actions";

const copy = {
  es: { back: "Volver a proveedores", title: "Contactar al proveedor", choose: "Establecimiento", chooseOne: "Elegí un establecimiento", message: "¿Qué necesitás?", messageHint: "Contale brevemente qué servicio buscás y para cuándo.", send: "Pedir presupuesto", demo: "Perfil de demostración", sponsored: "Patrocinado", coverage: "Cobertura declarada", languages: "Idiomas", noEstablishments: "Ingresá con una cuenta de productor para pedir presupuesto.", sent: "Pedido enviado. El proveedor recibió un aviso dentro de TROPILLA.", error: "No se pudo enviar el pedido. Revisá la cuenta y volvé a intentar.", privacy: "El pedido comparte el mensaje y el establecimiento que elegiste. No incluye CUIT, ubicación exacta ni datos del rodeo.", reviews: "reseñas de operaciones registradas", noReviews: "Todavía no hay reseñas de operaciones registradas.", stated: "Información declarada por el proveedor." },
  en: { back: "Back to suppliers", title: "Contact this supplier", choose: "Farm", chooseOne: "Choose a farm", message: "What do you need?", messageHint: "Briefly describe the service and when you need it.", send: "Request a quote", demo: "Demo profile", sponsored: "Sponsored", coverage: "Declared coverage", languages: "Languages", noEstablishments: "Sign in with a producer account to request a quote.", sent: "Request sent. The supplier received an in-platform notification.", error: "The request could not be sent. Check your account and try again.", privacy: "The request shares your message and selected farm. It does not include tax ID, exact location or herd data.", reviews: "reviews from registered operations", noReviews: "No reviews from registered operations yet.", stated: "Information declared by the supplier." },
  pt: { back: "Voltar aos fornecedores", title: "Falar com o fornecedor", choose: "Propriedade", chooseOne: "Escolha uma propriedade", message: "Do que você precisa?", messageHint: "Descreva brevemente o serviço e para quando precisa.", send: "Pedir orçamento", demo: "Perfil de demonstração", sponsored: "Patrocinado", coverage: "Cobertura declarada", languages: "Idiomas", noEstablishments: "Entre com uma conta de produtor para pedir um orçamento.", sent: "Pedido enviado. O fornecedor recebeu um aviso dentro da TROPILLA.", error: "Não foi possível enviar o pedido. Confira a conta e tente de novo.", privacy: "O pedido compartilha sua mensagem e a propriedade escolhida. Não inclui CUIT, localização exata nem dados do rebanho.", reviews: "avaliações de operações registradas", noReviews: "Ainda não há avaliações de operações registradas.", stated: "Informações declaradas pelo fornecedor." },
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/proveedores/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  try {
    const provider = await getProveedor(slug, locale);
    return { title: provider.nombre, description: provider.descripcion };
  } catch {
    return {};
  }
}

async function ProveedorContent({ params, searchParams }: PageProps<"/[locale]/proveedores/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const search = await searchParams;
  const status = typeof search.pedido === "string" ? search.pedido : undefined;
  const t = getDictionary(locale);
  let provider;
  try {
    provider = await getProveedor(slug, locale);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  let establecimientos: S<"Establecimiento">[] = [];
  try {
    establecimientos = (await api<Many<S<"Establecimiento">>>("/establecimientos")).data;
  } catch {
    // La ficha sigue disponible sin sesión; el formulario queda detrás del ingreso.
  }
  const text = copy[locale];
  const rubro = provider.rubros[0]?.codigo ?? "";
  const provincias = provider.provincias.map((code) => PROVINCIAS.find((item) => item.codigo === code)?.nombre ?? code).join(", ");

  return (
    <>
      <SiteHeader locale={locale} dict={t} context={provider.nombre} cta={{ href: `/${locale}/proveedores`, label: text.back }} />
      <main className="min-h-[70vh] bg-base">
        <div className="mx-auto grid max-w-[1120px] gap-6 px-[clamp(16px,4vw,40px)] py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-12">
          <section>
            <Link href={`/${locale}/proveedores`} className="inline-flex items-center gap-1 text-[14px] font-medium text-campo hover:underline"><IconArrowLeft size={16} />{text.back}</Link>
            <Card className="mt-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {provider.es_demo && <span className="rounded-full bg-campo-50 px-2.5 py-1 text-[11px] font-semibold text-monte">{text.demo}</span>}
                {provider.patrocinado && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted">{text.sponsored}</span>}
              </div>
              <h1 className="mt-4 font-display text-[clamp(30px,4vw,44px)] font-bold leading-tight tracking-[-0.03em] text-ink">{provider.nombre}</h1>
              <p className="mt-4 max-w-[68ch] text-[16px] leading-relaxed text-muted">{provider.descripcion}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {provider.rubros.map((item) => <li key={item.codigo} className="rounded-full border border-border bg-base px-3 py-1.5 text-[13px] font-medium text-ink">{item.nombre}</li>)}
              </ul>
              <dl className="mt-7 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-subtle">{text.coverage}</dt><dd className="mt-1 text-[14px] text-ink">{provincias}</dd></div>
                <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-subtle">{text.languages}</dt><dd className="mt-1 flex gap-2 text-[14px] uppercase text-ink">{provider.idiomas.join(", ")}</dd></div>
              </dl>
              <p className="mt-7 border-t border-border pt-4 text-[12px] leading-relaxed text-subtle">{provider.leyenda || text.stated}</p>
            </Card>
          </section>

          <aside className="lg:pt-12">
            <Card className="p-5">
              <h2 className="text-[18px] font-semibold text-ink">{text.title}</h2>
              {provider.calificacion !== null && provider.calificacion !== undefined ? (
                <p className="mt-2 text-[13px] text-muted"><span className="font-semibold tabular-nums text-ink">{provider.calificacion.toFixed(1)} / 5</span> · {provider.cantidad_resenas} {text.reviews}</p>
              ) : <p className="mt-2 text-[13px] text-muted">{text.noReviews}</p>}
              {status === "enviado" && <p role="status" className="mt-4 rounded-[10px] border border-border bg-campo-50 p-3 text-[13px] text-monte">{text.sent}</p>}
              {status === "error" && <p role="alert" className="mt-4 rounded-[10px] border border-border bg-surface-2 p-3 text-[13px] text-ink">{text.error}</p>}
              {establecimientos.length ? (
                <form action={solicitarPresupuesto} className="mt-5 space-y-4">
                  <input type="hidden" name="slug" value={provider.slug} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="rubro" value={rubro} />
                  <div className="space-y-1.5">
                    <label htmlFor="supplier-establishment" className="text-[13px] font-semibold text-ink">{text.choose}</label>
                    <Select id="supplier-establishment" name="establecimiento_id" defaultValue="">
                      <option value="" disabled>{text.chooseOne}</option>
                      {establecimientos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="supplier-message" className="text-[13px] font-semibold text-ink">{text.message}</label>
                    <textarea id="supplier-message" name="mensaje" required minLength={10} maxLength={2000} rows={4} placeholder={text.messageHint} className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-subtle focus-visible:border-campo focus-visible:ring-2 focus-visible:ring-campo/20" />
                  </div>
                  <button type="submit" className={`${buttonClass("primary", "md")} w-full`}>{text.send}<IconArrowRight size={16} /></button>
                </form>
              ) : <p className="mt-4 text-[14px] leading-relaxed text-muted">{text.noEstablishments}</p>}
              <p className="mt-4 border-t border-border pt-4 text-[12px] leading-relaxed text-subtle">{text.privacy}</p>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter locale={locale} dict={t} />
    </>
  );
}

export default function ProveedorPage(props: PageProps<"/[locale]/proveedores/[slug]">) {
  return <Suspense fallback={<main className="mx-auto mt-8 h-[520px] max-w-[1120px] rounded-[var(--radius-card)] bg-ghost" aria-hidden="true" />}><ProveedorContent {...props} /></Suspense>;
}
