import { Photo } from "@/components/public/photo";
import { IconBuffalo, IconCow, IconArrowRight } from "@/components/icons";
import type { Locale } from "@/lib/i18n";
import type { PortalDict } from "@/lib/i18n/portal";

export type PublicReproductor = {
  tipo?: string; nombre?: string | null; rp?: string | null; registro?: string | null; raza?: string | null; especie?: string | null;
  sexo?: string | null;
  centro?: string | null; fecha_nacimiento?: string | null; peso_kg?: string | number | null; peso_fecha?: string | null;
  condicion_corporal?: string | number | null; partos?: number | null; crias?: number | null;
  foto?: { sha256: string; url: string; alt: string | null; ancho: number | null; alto: number | null } | null; madre?: PublicReproductor | null; padre?: PublicReproductor | null;
};

function NodoArbol({ nodo, nivel, locale, t }: { nodo: PublicReproductor; nivel: number; locale: Locale; t: PortalDict }) {
  const idioma = locale === "es" ? "es-AR" : locale === "pt" ? "pt-BR" : "en-US";
  return (
    <div className="flex w-max items-center gap-3">
      <article className="w-[172px] shrink-0 rounded-lg border border-border bg-surface p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{t.profile.generation} {nivel + 1}</p>
        <p className="mt-1 truncate text-[13px] font-semibold text-ink" title={nodo.nombre ?? undefined}>{nodo.nombre || t.profile.declared}</p>
        {(nodo.rp || nodo.registro) && <p className="mt-0.5 truncate text-[11px] text-muted">{nodo.rp ?? nodo.registro}</p>}
        {nodo.raza && <p className="mt-1 truncate text-[11px] text-muted">{nodo.raza}</p>}
        {nodo.centro && <p className="mt-1 truncate text-[11px] text-muted">{t.profile.center}: {nodo.centro}</p>}
        {nodo.fecha_nacimiento && <p className="mt-1 text-[11px] text-muted">{new Intl.DateTimeFormat(idioma, { year: "numeric" }).format(new Date(`${nodo.fecha_nacimiento}T12:00:00`))}</p>}
      </article>
      {(nodo.madre || nodo.padre) && nivel < 4 && (
        <div className="flex flex-col gap-2 border-l border-border pl-3">
          {nodo.padre && <NodoArbol nodo={nodo.padre} nivel={nivel + 1} locale={locale} t={t} />}
          {nodo.madre && <NodoArbol nodo={nodo.madre} nivel={nivel + 1} locale={locale} t={t} />}
        </div>
      )}
    </div>
  );
}

export function ReproductoresPublicos({ items, locale, t }: { items: PublicReproductor[]; locale: Locale; t: PortalDict }) {
  const idioma = locale === "es" ? "es-AR" : locale === "pt" ? "pt-BR" : "en-US";
  if (!items.length) return <p className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-muted">{t.profile.noBreeders}</p>;
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {items.map((a, i) => <article key={`${a.tipo}-${a.rp ?? a.nombre}-${i}`} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      {a.foto?.url ? <Photo src={a.foto} alt={a.foto.alt ?? a.nombre ?? ""} sizes="(min-width:1280px) 360px, (min-width:640px) 50vw, 100vw" className="aspect-[16/10]" /> : <div className="flex aspect-[16/10] items-center justify-center bg-campo-50 text-monte" aria-hidden="true">{a.especie === "BUB" ? <IconBuffalo size={48} /> : <IconCow size={48} />}</div>}
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{a.tipo === "externo" ? t.profile.external : t.profile.internal}{a.sexo ? ` · ${a.sexo === "M" ? t.profile.male : t.profile.female}` : ""}</p>
        <h3 className="mt-1 text-[17px] font-semibold text-ink">{a.nombre || a.rp}</h3>
        <p className="mt-1 text-[13px] text-muted">{[a.rp, a.raza].filter(Boolean).join(" · ")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          {a.fecha_nacimiento && <div><dt className="text-muted">{t.profile.born}</dt><dd className="font-medium text-ink">{new Intl.DateTimeFormat(idioma).format(new Date(`${a.fecha_nacimiento}T12:00:00`))}</dd></div>}
          {a.peso_kg != null && <div><dt className="text-muted">{t.profile.weight}</dt><dd className="font-medium tabular-nums text-ink">{a.peso_kg} kg</dd>{a.peso_fecha && <dd className="text-[11px] text-muted">{new Intl.DateTimeFormat(idioma).format(new Date(`${a.peso_fecha}T12:00:00`))}</dd>}</div>}
          {a.condicion_corporal != null && <div><dt className="text-muted">{t.profile.bodyCondition}</dt><dd className="font-medium text-ink">{a.condicion_corporal}</dd></div>}
          {a.partos != null && <div><dt className="text-muted">{t.profile.calvings}</dt><dd className="font-medium text-ink">{a.partos}</dd></div>}
          {a.crias != null && <div><dt className="text-muted">{t.profile.offspring}</dt><dd className="font-medium text-ink">{a.crias}</dd></div>}
        </dl>
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold text-campo"><span>{t.profile.pedigree}</span><IconArrowRight size={16} className="rotate-90 transition-transform group-open:rotate-[270deg]" /></summary>
          <div className="mt-3 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-base p-3" tabIndex={0} aria-label={t.profile.pedigree}>
            <div className="w-max"><NodoArbol nodo={a} nivel={0} locale={locale} t={t} /></div>
          </div>
        </details>
      </div>
    </article>)}
  </div>;
}
