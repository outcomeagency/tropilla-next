import Link from "next/link";
import { Badge, SpeciesChip } from "@/components/ui";
import { IconArrowRight, IconBuffalo, IconCheckCircle, IconCow, IconPin, IconTag, IconRoute } from "@/components/icons";
import { Photo } from "@/components/public/photo";
import { departamentoNombre, provinciaNombre } from "@/lib/geo";
import { razaNombre } from "@/lib/catalogo";
import { especieDe } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { PortalDict } from "@/lib/i18n/portal";
import type { S } from "@/lib/schemas";

const LANG: Record<Locale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

/**
 * Sin foto publicada: monograma del establecimiento sobre verde monte con las especies
 * (nunca una foto de stock que haga pasar otro campo por el suyo).
 */
function SinFoto({ nombre, especies }: { nombre: string; especies: string[] }) {
  const iniciales = nombre
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="relative flex aspect-[16/10] items-end justify-between overflow-hidden bg-monte p-4 text-sidebar-ink" role="img" aria-label={nombre}>
      <span className="font-display text-[56px] font-bold leading-none tracking-[-0.04em] opacity-95">{iniciales || "T"}</span>
      <span className="flex gap-2 text-sidebar-muted">
        {especies.includes("BOV") && <IconCow size={30} />}
        {especies.includes("BUB") && <IconBuffalo size={30} />}
      </span>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-tierra" />
    </div>
  );
}

/** Tarjeta del directorio: foto real, zona general (nunca ubicación exacta), especies, oferta y frescura. */
export function ProducerCard({ p, locale, t }: { p: S<"DirectorioItem">; locale: Locale; t: PortalDict }) {
  const zona = [departamentoNombre(p.departamento), provinciaNombre(p.provincia)].filter(Boolean).join(", ");
  const fecha = p.actualizado_en
    ? new Intl.DateTimeFormat(LANG[locale], { day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(p.actualizado_en))
    : null;
  const insignias = (p.insignias ?? []).slice(0, 2);

  return (
    <article className="group overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-shadow hover:shadow-[var(--shadow-hover)]">
      <Link href={`/${locale}/p/${p.slug}`} className="flex h-full flex-col">
        {p.foto_url ? (
          <Photo src={p.foto_url} alt={p.nombre ?? ""} sizes="(min-width:1280px) 340px, (min-width:768px) 45vw, 100vw" className="aspect-[16/10]" />
        ) : (
          <SinFoto nombre={p.nombre ?? ""} especies={p.especies ?? []} />
        )}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink">{p.nombre}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
              <IconPin size={14} className="shrink-0" /> {zona}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(p.especies ?? []).map((e) => (
              <SpeciesChip key={e} especie={especieDe(e)} label={t.common.speciesOne[e]} />
            ))}
            {(p.razas ?? []).length > 0 && (
              <span className="text-[12.5px] text-muted">{(p.razas ?? []).map(razaNombre).join(" · ")}</span>
            )}
          </div>
          {(!!p.ofertas_activas || !!p.contratos_abiertos) && (
            <div className="flex flex-wrap gap-1.5">
              {!!p.ofertas_activas && (
                <Badge tone="success" icon={<IconTag size={14} />}>
                  {t.directory.offers(p.ofertas_activas)}
                </Badge>
              )}
              {!!p.contratos_abiertos && (
                <Badge tone="info" icon={<IconRoute size={14} />}>
                  {t.directory.contracts(p.contratos_abiertos)}
                </Badge>
              )}
            </div>
          )}
          {insignias.length > 0 && (
            <ul className="mt-auto space-y-1">
              {insignias.map((i) => (
                <li key={i} className="flex items-center gap-1.5 text-[12.5px] text-muted">
                  <IconCheckCircle size={14} className="shrink-0 text-campo" />
                  {t.insignias[i] ?? i}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12.5px]">
          <span className="text-muted">{fecha && `${t.common.updated} ${fecha}`}</span>
          <span className="inline-flex items-center gap-1 font-medium text-campo group-hover:underline">
            {t.common.seeProfile} <IconArrowRight size={14} />
          </span>
        </div>
      </Link>
    </article>
  );
}
