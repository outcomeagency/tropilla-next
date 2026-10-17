import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Card, EmptyState, Select, buttonClass } from "@/components/ui";
import { IconArrowRight, IconSearch } from "@/components/icons";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getDirectorioProveedores, getRubrosProveedor } from "@/lib/data/proveedores";
import { PROVINCIAS } from "@/lib/geo";
import { IconBuilding } from "@/components/icons";

const copy = {
  es: { title: "Proveedores y servicios", lead: "Encontrá servicios para tu campo y pedí presupuesto cuando te sirva.", category: "Rubro", any: "Todos los rubros", province: "Provincia", anyProvince: "Toda la región", search: "Buscar", empty: "Todavía no hay proveedores para estos filtros.", detail: "Ver perfil", sponsored: "Patrocinado", demo: "Perfil de demostración", area: "Cobertura declarada", lang: "Idiomas", unavailable: "El directorio no está disponible en este momento.", join: "Ofrecés servicios? Sumate al directorio" },
  en: { title: "Suppliers and services", lead: "Find services for your farm and request a quote when it works for you.", category: "Category", any: "All categories", province: "Province", anyProvince: "All region", search: "Search", empty: "No suppliers match these filters yet.", detail: "View profile", sponsored: "Sponsored", demo: "Demo profile", area: "Declared coverage", lang: "Languages", unavailable: "The directory is unavailable right now.", join: "Offer a service? Join the directory" },
  pt: { title: "Fornecedores e serviços", lead: "Encontre serviços para sua propriedade e peça um orçamento quando precisar.", category: "Categoria", any: "Todas as categorias", province: "Província", anyProvince: "Toda a região", search: "Buscar", empty: "Ainda não há fornecedores para estes filtros.", detail: "Ver perfil", sponsored: "Patrocinado", demo: "Perfil de demonstração", area: "Cobertura declarada", lang: "Idiomas", unavailable: "O diretório está indisponível no momento.", join: "Oferece serviços? Entre no diretório" },
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/proveedores">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: copy[locale].title, description: copy[locale].lead };
}

async function ProveedoresContent({ params, searchParams }: PageProps<"/[locale]/proveedores">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const search = await searchParams;
  const rubro = typeof search.rubro === "string" ? search.rubro : undefined;
  const provincia = typeof search.provincia === "string" ? search.provincia : undefined;
  const t = getDictionary(locale);
  let rubros: Awaited<ReturnType<typeof getRubrosProveedor>> = [];
  let proveedores: Awaited<ReturnType<typeof getDirectorioProveedores>>["data"] = [];
  let unavailable = false;
  try {
    [rubros, proveedores] = await Promise.all([
      getRubrosProveedor(locale),
      getDirectorioProveedores({ rubro, provincia }, locale).then((r) => r.data),
    ]);
  } catch {
    unavailable = true;
  }
  const text = copy[locale];

  return (
    <>
      <SiteHeader locale={locale} dict={t} current="providers" />
      <main className="min-h-[70vh] bg-base">
        <div className="mx-auto max-w-[1120px] px-[clamp(16px,4vw,40px)] py-10 sm:py-14">
          <div className="max-w-[680px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">TROPILLA · NEA</p>
            <h1 className="mt-3 font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight tracking-[-0.03em] text-ink">{text.title}</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-muted">{text.lead}</p>
          </div>
          <Link href="/proveedor" className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-campo hover:underline"><IconBuilding size={17} />{text.join}<IconArrowRight size={16} /></Link>

          <form action={`/${locale}/proveedores`} className="mt-8 grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <label htmlFor="provider-category" className="text-[13px] font-semibold text-ink">{text.category}</label>
              <Select id="provider-category" name="rubro" defaultValue={rubro ?? ""}>
                <option value="">{text.any}</option>
                {rubros.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="provider-province" className="text-[13px] font-semibold text-ink">{text.province}</label>
              <Select id="provider-province" name="provincia" defaultValue={provincia ?? ""}>
                <option value="">{text.anyProvince}</option>
                {PROVINCIAS.filter((p) => ["18", "22", "34", "54"].includes(p.codigo)).map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
              </Select>
            </div>
            <button type="submit" className={buttonClass("primary", "md")}><IconSearch size={17} />{text.search}</button>
          </form>

          {unavailable ? (
            <Card className="mt-6"><EmptyState icon={<IconSearch size={24} />} title={text.unavailable} description={text.lead} /></Card>
          ) : proveedores.length === 0 ? (
            <Card className="mt-6"><EmptyState icon={<IconSearch size={24} />} title={text.empty} description={text.lead} /></Card>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {proveedores.map((proveedor) => (
                <li key={proveedor.slug}>
                  <Link href={`/${locale}/proveedores/${proveedor.slug}`} className="group flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-shadow hover:shadow-[var(--shadow-hover)]">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-[18px] font-semibold leading-snug text-ink">{proveedor.nombre}</h2>
                      {proveedor.patrocinado && <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-muted">{text.sponsored}</span>}
                    </div>
                    {proveedor.es_demo && <p className="mt-2 w-fit rounded-full bg-campo-50 px-2.5 py-1 text-[11px] font-semibold text-monte">{text.demo}</p>}
                    <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-muted">{proveedor.descripcion}</p>
                    <p className="mt-4 text-[12px] text-subtle">{text.area}: {proveedor.provincias.map((codigo) => PROVINCIAS.find((p) => p.codigo === codigo)?.nombre ?? codigo).join(", ")}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-5 text-[14px] font-semibold text-campo">{text.detail}<IconArrowRight size={16} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} dict={t} />
    </>
  );
}

export default function ProveedoresPage(props: PageProps<"/[locale]/proveedores">) {
  return <Suspense fallback={<main className="mx-auto mt-8 h-[620px] max-w-[1120px] rounded-[var(--radius-card)] bg-ghost" aria-hidden="true" />}><ProveedoresContent {...props} /></Suspense>;
}
