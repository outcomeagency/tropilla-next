import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Card } from "@/components/ui";
import { IconArrowRight, IconClock, IconFile, IconShield } from "@/components/icons";
import { getDictionary, hasLocale } from "@/lib/i18n";

const content = {
  es: {
    title: "Financiamiento con hacienda tokenizada",
    eyebrow: "Una visión para más adelante",
    lead: "La hacienda con registros organizados podría ayudar a respaldar futuras alternativas de financiamiento. Primero hay que resolver el marco legal, la custodia y quién puede ofrecerlas.",
    coming: "Próximamente",
    demo: "Caso ilustrativo · datos ficticios",
    herd: "Hacienda con registros", herdValue: "186 bovinos · 54 búfalos", events: "Eventos registrados", eventsValue: "126 movimientos y controles", years: "Historial de ejemplo", yearsValue: "desde 2022", evidence: "La evidencia permite revisar cuándo y cómo se registró un dato. No demuestra por sí sola que el dato sea verdadero.",
    pending: "Antes de avanzar", legal: "Marco CNV y revisión regulatoria", structure: "Estructura legal y derechos de cada parte", custody: "Custodia de hacienda, documentos y cualquier activo futuro", limits: "Límites de uso y protección de los datos del productor", noMoney: "Esta vista es solo una demostración. No emite instrumentos, no mueve dinero y no ofrece ni promete rendimientos.", cta: "Conocé el directorio de servicios",
  },
  en: {
    title: "Financing backed by tokenized livestock", eyebrow: "A future vision", lead: "Well-organized livestock records could support future financing alternatives. The regulatory framework, custody and authorized providers need to be resolved first.", coming: "Coming soon", demo: "Illustrative case · fictional data", herd: "Livestock with records", herdValue: "186 cattle · 54 buffalo", events: "Recorded events", eventsValue: "126 movements and checks", years: "Sample history", yearsValue: "since 2022", evidence: "Evidence helps review when and how data was recorded. On its own, it does not prove that the data is true.", pending: "Before moving forward", legal: "CNV framework and regulatory review", structure: "Legal structure and each party's rights", custody: "Custody of livestock, records and any future asset", limits: "Use limits and producer data protection", noMoney: "This is a demonstration only. It does not issue instruments, move money, offer or promise returns.", cta: "Explore the services directory",
  },
  pt: {
    title: "Financiamento com rebanho tokenizado", eyebrow: "Uma visão para o futuro", lead: "Registros organizados do rebanho poderiam apoiar futuras alternativas de financiamento. Primeiro é preciso resolver o marco regulatório, a custódia e quem poderá oferecê-las.", coming: "Em breve", demo: "Caso ilustrativo · dados fictícios", herd: "Rebanho com registros", herdValue: "186 bovinos · 54 búfalos", events: "Eventos registrados", eventsValue: "126 movimentos e controles", years: "Histórico de exemplo", yearsValue: "desde 2022", evidence: "A evidência permite revisar quando e como um dado foi registrado. Por si só, não prova que o dado seja verdadeiro.", pending: "Antes de avançar", legal: "Marco da CNV e revisão regulatória", structure: "Estrutura legal e direitos de cada parte", custody: "Custódia do rebanho, documentos e qualquer ativo futuro", limits: "Limites de uso e proteção dos dados do produtor", noMoney: "Esta tela é apenas uma demonstração. Não emite instrumentos, não movimenta dinheiro e não oferece nem promete rendimentos.", cta: "Conheça o diretório de serviços",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/financiamiento">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: content[locale].title, description: content[locale].lead };
}

export default async function FinanciamientoPage({ params }: PageProps<"/[locale]/financiamiento">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const c = content[locale];
  const demo = [
    { label: c.herd, value: c.herdValue, Icon: IconShield },
    { label: c.events, value: c.eventsValue, Icon: IconFile },
    { label: c.years, value: c.yearsValue, Icon: IconClock },
  ];

  return (
    <>
      <SiteHeader locale={locale} dict={t} current="financing" />
      <main className="min-h-[75vh] bg-base">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-[1120px] px-[clamp(16px,4vw,40px)] py-12 sm:py-16">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{c.eyebrow}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="max-w-[780px] font-display text-[clamp(32px,4.8vw,54px)] font-bold leading-[1.06] tracking-[-0.03em] text-ink">{c.title}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-base px-3 py-1.5 text-[12px] font-semibold text-muted"><IconClock size={15} />{c.coming}</span>
            </div>
            <p className="mt-5 max-w-[72ch] text-[17px] leading-relaxed text-muted">{c.lead}</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1120px] gap-6 px-[clamp(16px,4vw,40px)] py-8 lg:grid-cols-[1.1fr_.9fr] lg:py-12">
          <section aria-labelledby="demo-title">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-campo" aria-hidden="true" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">{c.demo}</p>
            </div>
            <h2 id="demo-title" className="mt-2 text-[21px] font-semibold text-ink">{locale === "en" ? "A livestock record, ready to review" : locale === "pt" ? "Um histórico do rebanho para consultar" : "Un rodeo con historia para consultar"}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {demo.map(({ label, value, Icon }) => (
                <Card key={label} className="p-4">
                  <Icon size={19} className="text-campo" />
                  <p className="mt-4 text-[12px] font-medium leading-snug text-muted">{label}</p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug tabular-nums text-ink">{value}</p>
                </Card>
              ))}
            </div>
            <p className="mt-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-[13px] leading-relaxed text-muted">{c.evidence}</p>
          </section>

          <Card className="p-5 sm:p-6">
            <h2 className="text-[20px] font-semibold text-ink">{c.pending}</h2>
            <ul className="mt-5 space-y-4">
              {[c.legal, c.structure, c.custody, c.limits].map((item) => (
                <li key={item} className="flex gap-3 border-t border-border pt-4 text-[14px] leading-relaxed text-ink"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-crema-300" aria-hidden="true" />{item}</li>
              ))}
            </ul>
            <p className="mt-6 rounded-[10px] border border-border bg-base p-3 text-[13px] leading-relaxed text-muted">{c.noMoney}</p>
            <Link href={`/${locale}/proveedores`} className="mt-6 inline-flex items-center gap-1 text-[14px] font-semibold text-campo hover:underline">{c.cta}<IconArrowRight size={16} /></Link>
          </Card>
        </div>
      </main>
      <SiteFooter locale={locale} dict={t} />
    </>
  );
}
