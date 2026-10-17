import { Photo } from "@/components/public/photo";
import { IconBuffalo, IconCow, IconArrowRight } from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import type { PortalDict } from "@/lib/i18n/portal";

export type PublicReproductor = {
  tipo?: string; nombre?: string | null; rp?: string | null; registro?: string | null; raza?: string | null; especie?: string | null;
  sexo?: string | null;
  centro?: string | null; fecha_nacimiento?: string | null; peso_kg?: string | number | null; peso_fecha?: string | null;
  condicion_corporal?: string | number | null; partos?: number | null; crias?: number | null;
  foto?: { sha256: string; url: string; alt: string | null; ancho: number | null; alto: number | null } | null; madre?: PublicReproductor | null; padre?: PublicReproductor | null;
};

function FichaAncestro({ id, nodo, rol, nivel, locale, t }: { id: string; nodo: PublicReproductor; rol?: "padre" | "madre"; nivel: number; locale: Locale; t: PortalDict }) {
  const idioma = locale === "es" ? "es-AR" : locale === "pt" ? "pt-BR" : "en-US";
  const fecha = nodo.fecha_nacimiento ? new Intl.DateTimeFormat(idioma, { dateStyle: "long" }).format(new Date(`${nodo.fecha_nacimiento}T12:00:00`)) : null;
  const filas: Array<[string, string | null | undefined]> = [
    [t.profile.born, fecha],
    ["RP", nodo.rp],
    [t.profile.registry, nodo.registro],
    [t.profile.center, nodo.centro],
    [t.profile.sire, nodo.padre?.nombre],
    [t.profile.dam, nodo.madre?.nombre],
  ];
  return (
    <div id={id} popover="auto" className="m-auto w-[min(92vw,420px)] rounded-[var(--radius-card)] border border-border bg-surface p-0 text-ink shadow-lg backdrop:bg-carbon/40">
      <div className={cx("border-b border-border border-l-4 px-5 py-4", (rol ? rol === "padre" : nodo.sexo === "M") ? "border-l-campo" : "border-l-tierra")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {rol ? (rol === "padre" ? t.profile.sire : t.profile.dam) : nodo.sexo === "M" ? t.profile.male : t.profile.female} · {t.profile.generation} {nivel + 1}
        </p>
        <p className="mt-1 text-[20px] font-bold tracking-[-0.01em]">{nodo.nombre || t.profile.declared}</p>
        <p className="text-[13px] text-muted">{[nodo.raza, nodo.especie === "BUB" ? t.common.speciesOne.BUB : nodo.especie === "BOV" ? t.common.speciesOne.BOV : null].filter(Boolean).join(" · ")}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 py-4 text-[14px]">
        {filas.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
        ))}
      </dl>
      <p className="border-t border-border px-5 py-3 text-[12px] text-muted">{t.profile.declared}: {t.profile.pedigreeNote}</p>
      <div className="px-5 pb-4">
        <button type="button" popoverTarget={id} popoverTargetAction="hide" className={buttonClass("secondary", "sm")}>{t.profile.close}</button>
      </div>
    </div>
  );
}

function NodoArbol({ nodo, nivel, rol, uid, locale, t }: { nodo: PublicReproductor; nivel: number; rol?: "padre" | "madre"; uid: string; locale: Locale; t: PortalDict }) {
  const idioma = locale === "es" ? "es-AR" : locale === "pt" ? "pt-BR" : "en-US";
  const anio = nodo.fecha_nacimiento ? new Intl.DateTimeFormat(idioma, { year: "numeric" }).format(new Date(`${nodo.fecha_nacimiento}T12:00:00`)) : null;
  const macho = rol ? rol === "padre" : nodo.sexo === "M";
  const hijos = (nodo.madre || nodo.padre) && nivel < 3;
  return (
    <div className="flex w-max items-center">
      <button type="button" popoverTarget={uid} aria-haspopup="dialog" className={cx("w-[188px] shrink-0 cursor-pointer rounded-lg border border-border border-l-[3px] bg-surface px-3 py-2.5 text-left transition-shadow hover:shadow-sm focus-visible:outline-2 focus-visible:outline-campo", macho ? "border-l-campo" : "border-l-tierra", nivel === 0 && "w-[208px] bg-campo-50")}>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          {rol ? (rol === "padre" ? t.profile.sire : t.profile.dam) : nodo.sexo ? (nodo.sexo === "M" ? t.profile.male : t.profile.female) : t.profile.declared}
          <span className="font-normal normal-case tracking-normal text-subtle"> · {t.profile.generation} {nivel + 1}</span>
        </span>
        <span className="mt-0.5 block truncate text-[14px] font-semibold text-ink">{nodo.nombre || t.profile.declared}</span>
        <span className="block truncate text-[11px] text-muted">{[nodo.rp, nodo.raza, anio].filter(Boolean).join(" · ")}</span>
        {nodo.centro && <span className="mt-0.5 block truncate text-[11px] text-subtle">{nodo.centro}</span>}
      </button>
      <FichaAncestro id={uid} nodo={nodo} rol={rol} nivel={nivel} locale={locale} t={t} />
      {hijos && (
        <>
          <span className="h-px w-4 shrink-0 bg-border-strong" aria-hidden="true" />
          <div className="relative flex flex-col gap-2 py-1 before:absolute before:top-[25%] before:bottom-[25%] before:left-0 before:w-px before:bg-border-strong">
            {nodo.padre && <div className="flex items-center"><span className="h-px w-4 shrink-0 bg-border-strong" aria-hidden="true" /><NodoArbol nodo={nodo.padre} nivel={nivel + 1} rol="padre" uid={`${uid}-p`} locale={locale} t={t} /></div>}
            {nodo.madre && <div className="flex items-center"><span className="h-px w-4 shrink-0 bg-border-strong" aria-hidden="true" /><NodoArbol nodo={nodo.madre} nivel={nivel + 1} rol="madre" uid={`${uid}-m`} locale={locale} t={t} /></div>}
          </div>
        </>
      )}
    </div>
  );
}

export function ReproductoresPublicos({ items, locale, t }: { items: PublicReproductor[]; locale: Locale; t: PortalDict }) {
  const idioma = locale === "es" ? "es-AR" : locale === "pt" ? "pt-BR" : "en-US";
  const num = (v: string | number, dec = 0) => new Intl.NumberFormat(idioma, { maximumFractionDigits: dec }).format(Number(v));
  if (!items.length) return <p className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-muted">{t.profile.noBreeders}</p>;
  return <div className="grid gap-6">
    {items.map((a, i) => <article key={`${a.tipo}-${a.rp ?? a.nombre}-${i}`} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {a.foto?.url ? <Photo src={a.foto} alt={a.foto.alt ?? a.nombre ?? ""} sizes="(min-width:768px) 40vw, 100vw" className="aspect-[16/10] md:aspect-auto md:h-full" /> : <div className="flex aspect-[16/10] items-center justify-center bg-campo-50 text-monte" aria-hidden="true">{a.especie === "BUB" ? <IconBuffalo size={48} /> : <IconCow size={48} />}</div>}
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{a.tipo === "externo" ? t.profile.external : t.profile.internal}{a.sexo ? ` · ${a.sexo === "M" ? t.profile.male : t.profile.female}` : ""}</p>
          <h3 className="mt-1 text-[22px] font-bold tracking-[-0.01em] text-ink">{a.nombre || a.rp}</h3>
          <p className="mt-1 text-[14px] text-muted">{[a.rp, a.raza, a.centro].filter(Boolean).join(" · ")}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
            {a.fecha_nacimiento && <div><dt className="text-muted">{t.profile.born}</dt><dd className="font-semibold text-ink">{new Intl.DateTimeFormat(idioma).format(new Date(`${a.fecha_nacimiento}T12:00:00`))}</dd></div>}
            {a.peso_kg != null && <div><dt className="text-muted">{t.profile.weight}</dt><dd className="font-semibold tabular-nums text-ink">{num(a.peso_kg)} kg</dd>{a.peso_fecha && <dd className="text-[11px] text-muted">{new Intl.DateTimeFormat(idioma).format(new Date(`${a.peso_fecha}T12:00:00`))}</dd>}</div>}
            {a.condicion_corporal != null && <div><dt className="text-muted">{t.profile.bodyCondition}</dt><dd className="font-semibold tabular-nums text-ink">{num(a.condicion_corporal, 1)}</dd></div>}
            {a.partos != null && <div><dt className="text-muted">{t.profile.calvings}</dt><dd className="font-semibold tabular-nums text-ink">{a.partos}</dd></div>}
            {a.crias != null && a.crias > 0 && <div><dt className="text-muted">{t.profile.offspring}</dt><dd className="font-semibold tabular-nums text-ink">{a.crias}</dd></div>}
          </dl>
        </div>
      </div>
      {(a.padre || a.madre) && <details open={i === 0} className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-[14px] font-semibold text-campo"><span>{t.profile.pedigree}</span><IconArrowRight size={16} className="rotate-90 transition-transform group-open:rotate-[270deg]" /></summary>
        <div className="max-w-full overflow-x-auto overscroll-x-contain border-t border-border bg-base p-4" tabIndex={0} aria-label={t.profile.pedigree}>
          <div className="w-max"><NodoArbol nodo={a} nivel={0} uid={`ped-${i}`} locale={locale} t={t} /></div>
        </div>
      </details>}
    </article>)}
  </div>;
}
