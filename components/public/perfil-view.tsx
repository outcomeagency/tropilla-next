import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Progress, SpeciesChip, TrustBadge, buttonClass } from "@/components/ui";
import { IconArrowRight, IconBuffalo, IconCheckCircle, IconClock, IconCow, IconFile, IconMessage, IconPin, IconShieldCheck, IconStar } from "@/components/icons";
import { Photo } from "@/components/public/photo";
import { ReproductoresPublicos, type PublicReproductor } from "@/components/public/reproductores-publicos";
import { actividadNombre, departamentoNombre, provinciaNombre } from "@/lib/geo";
import { categoriaNombre, razaNombre } from "@/lib/catalogo";
import { especieDe } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { PortalDict } from "@/lib/i18n/portal";
import type { S } from "@/lib/schemas";

const LANG: Record<Locale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };
type Codigo = { codigo?: string; nombre?: string };
const codigos = (xs: unknown): Codigo[] => (Array.isArray(xs) ? (xs as Codigo[]) : []);

const ENFERMEDADES: Record<string, Record<Locale, string>> = {
  aftosa: { es: "Fiebre aftosa", en: "Foot-and-mouth disease", pt: "Febre aftosa" },
  rabia: { es: "Rabia paresiante", en: "Paralytic rabies", pt: "Raiva" },
  brucelosis: { es: "Brucelosis", en: "Brucellosis", pt: "Brucelose" },
  tuberculosis: { es: "Tuberculosis", en: "Tuberculosis", pt: "Tuberculose" },
  carbunclo: { es: "Carbunclo", en: "Anthrax", pt: "Carbúnculo" },
  clostridiales: { es: "Clostridiales", en: "Clostridial diseases", pt: "Clostridioses" },
  parasitosis: { es: "Parásitos", en: "Parasites", pt: "Parasitas" },
  garrapata: { es: "Garrapata", en: "Ticks", pt: "Carrapato" },
  leptospirosis: { es: "Leptospirosis", en: "Leptospirosis", pt: "Leptospirose" },
  ibr_dvb: { es: "IBR / DVB", en: "IBR / BVD", pt: "IBR / BVD" },
  queratoconjuntivitis: { es: "Queratoconjuntivitis", en: "Pinkeye", pt: "Ceratoconjuntivite" },
};

function enfermedadNombre(codigo: string | undefined, locale: Locale): string {
  if (!codigo) return "";
  return ENFERMEDADES[codigo]?.[locale] ?? codigo.charAt(0).toUpperCase() + codigo.slice(1).replace(/_/g, " ");
}

const FICHA_LABELS: Record<string, Record<Locale, string>> = {
  potreros_aguadas: { es: "Potreros y aguadas", en: "Paddocks and water", pt: "Pastos e bebedouros" }, suelo_pasturas: { es: "Suelos y pasturas", en: "Soils and pastures", pt: "Solos e pastagens" }, capacidad_carga: { es: "Capacidad de carga", en: "Stocking capacity", pt: "Capacidade de suporte" }, infraestructura: { es: "Infraestructura", en: "Infrastructure", pt: "Infraestrutura" }, clima: { es: "Clima", en: "Climate", pt: "Clima" }, logistica: { es: "Logística", en: "Logistics", pt: "Logística" }, certificaciones: { es: "Programas declarados", en: "Declared programs", pt: "Programas declarados" },
  potreros: { es: "Potreros", en: "Paddocks", pt: "Pastos" }, aguadas: { es: "Aguadas", en: "Water points", pt: "Bebedouros" }, rotacion: { es: "Rotación", en: "Rotation", pt: "Rotação" }, fuentes_agua: { es: "Fuentes de agua", en: "Water sources", pt: "Fontes de água" }, suelos: { es: "Suelos", en: "Soils", pt: "Solos" }, pasturas: { es: "Pasturas", en: "Pastures", pt: "Pastagens" }, ambientes: { es: "Ambientes", en: "Land types", pt: "Ambientes" }, carga_ug_ha: { es: "Carga UG/ha", en: "LSU/ha", pt: "UA/ha" }, periodo: { es: "Período", en: "Period", pt: "Período" }, criterio: { es: "Criterio", en: "Method", pt: "Critério" }, manga: { es: "Manga", en: "Cattle chute", pt: "Brete" }, balanza: { es: "Balanza", en: "Scale", pt: "Balança" }, alambrados: { es: "Alambrados", en: "Fencing", pt: "Cercas" }, energia: { es: "Energía", en: "Power", pt: "Energia" }, precipitacion_media_mm: { es: "Precipitación media (mm)", en: "Average rainfall (mm)", pt: "Precipitação média (mm)" }, temperatura_media_c: { es: "Temperatura media (°C)", en: "Average temperature (°C)", pt: "Temperatura média (°C)" }, fuente: { es: "Fuente", en: "Source", pt: "Fonte" }, fecha: { es: "Fecha", en: "Date", pt: "Data" }, distancia_ruta_km: { es: "Distancia a ruta (km)", en: "Distance to road (km)", pt: "Distância da rodovia (km)" }, distancia_puerto_km: { es: "Distancia al puerto (km)", en: "Distance to port (km)", pt: "Distância ao porto (km)" }, accesos: { es: "Accesos", en: "Access", pt: "Acessos" }, carga: { es: "Carga", en: "Loading", pt: "Carga" }, nombre: { es: "Nombre", en: "Name", pt: "Nome" }, emisor: { es: "Emisor", en: "Issuer", pt: "Emissor" }, vence: { es: "Vence", en: "Expires", pt: "Vence" }, alcance: { es: "Alcance", en: "Scope", pt: "Abrangência" }, equipo: { es: "Equipo", en: "Team", pt: "Equipe" }, marca: { es: "Marca", en: "Brand", pt: "Marca" }, senal: { es: "Señal", en: "Branding mark", pt: "Sinal" }, registro: { es: "Registro", en: "Registry", pt: "Registro" }, manejo: { es: "Manejo", en: "Management", pt: "Manejo" }, vacunaciones_actualizadas: { es: "Vacunaciones", en: "Vaccinations", pt: "Vacinações" }, plan_sanitario: { es: "Plan sanitario", en: "Health plan", pt: "Plano sanitário" }, renspa_vencimiento: { es: "Vencimiento de registro sanitario", en: "Health registration expiry", pt: "Vencimento do registro sanitário" }, senasa_vencimiento: { es: "Vencimiento sanitario", en: "Health expiry", pt: "Vencimento sanitário" },
};

function fichaNombre(codigo: string, locale: Locale): string {
  return FICHA_LABELS[codigo]?.[locale] ?? codigo.replaceAll("_", " ");
}

function Seccion({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 id={id} className="text-[20px] font-bold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {lead && <p className="mt-1 text-[14px] text-muted">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Cuerpo del perfil público (flujo 13). Se usa en la página pública y en la
 * vista previa del panel: el productor ve exactamente lo que ve el comprador.
 * Sólo renderiza las secciones que vienen (el Resource público ya filtra lo privado).
 */
export function PerfilView({ p, locale, t, contacto }: { p: S<"PerfilPublico">; locale: Locale; t: PortalDict; contacto?: ReactNode }) {
  const sec = p.secciones ?? {};
  const portada = sec.portada;
  const act = sec.actividad;
  const ficha = sec.ficha_establecimiento ?? {};
  const zona = [portada?.zona?.localidad || departamentoNombre(portada?.zona?.departamento), provinciaNombre(portada?.zona?.provincia)]
    .filter(Boolean)
    .join(", ");
  const nf = new Intl.NumberFormat(LANG[locale]);
  const pct = (v?: string | number | null) => new Intl.NumberFormat(LANG[locale], { maximumFractionDigits: 1 }).format(Number(v ?? 0));
  const fotos = portada?.fotos ?? [];
  const especies = codigos(act?.especies).map((e) => e.codigo as "BOV" | "BUB");
  const actualizado = p.actualizado_en
    ? new Intl.DateTimeFormat(LANG[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(p.actualizado_en))
    : null;
  const ampliada = sec as unknown as {
    reproductores?: PublicReproductor[] | null;
    composicion?: { por_especie?: Array<{ especie?: string; nombre?: string; rango?: string; cabezas?: number; categorias?: Array<{ nombre?: string; rango?: string; cabezas?: number }> }>; razas?: Array<{ especie?: string; raza?: string; cantidad?: number | null }> } | null;
    indicadores?: { prenez_ultimo_tacto?: { porcentaje: number; evaluados: number; fecha: string; fuente: string } | null; partos_por_temporada?: Array<{ temporada: number; partos: number; fuente: string; fecha: string }>; anios_en_tropilla?: number; antiguedad_fuente?: { fuente: string; fecha: string }; plan_sanitario?: { texto?: string; fuente?: string; fecha?: string } | null } | null;
    galeria?: { fotos?: Array<{ sha256: string; url: string; alt: string | null; ancho: number | null; alto: number | null }> } | null;
  };

  return (
    <>
      {/* Portada */}
      <section className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,40px)] pt-[clamp(16px,3vw,32px)]">
        {fotos.length > 0 && (
        <div className="grid gap-2.5 md:grid-cols-[2fr_1fr] md:grid-rows-2">
          <Photo src={fotos[0]} alt={fotos[0]?.alt ?? p.nombre ?? ""} sizes="(min-width:768px) 800px, 100vw" className="aspect-[16/9] rounded-[16px] border border-border md:row-span-2 md:aspect-auto md:h-full md:min-h-[380px]" preload />
          {fotos.slice(1, 3).map((f) => (
            <Photo key={f.sha256} src={f} alt={f.alt ?? p.nombre ?? ""} sizes="400px" className="hidden aspect-[16/10] rounded-[16px] border border-border md:block" />
          ))}
        </div>
        )}
        <div className={`${fotos.length ? "mt-6" : "mt-4"} flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8`}>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
              <IconPin size={15} /> {zona}
            </p>
            <h1 className="mt-2 font-display text-[clamp(32px,4.4vw,54px)] font-bold leading-[1.04] tracking-[-0.03em] text-ink">{p.nombre}</h1>
            {p.productor && <p className="mt-1 text-[16px] text-muted">{p.productor}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {especies.map((e) => (
                <SpeciesChip key={e} especie={especieDe(e)} withIcon label={t.common.species[e]} />
              ))}
              {codigos(act?.actividades).map((a) => (
                <Badge key={a.codigo}>{actividadNombre(a.codigo ?? "", locale)}</Badge>
              ))}
            </div>
            {!!p.insignias?.length && (
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
                {p.insignias.map((i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[13.5px] text-ink">
                    <IconStar size={15} className="text-tierra" /> {t.insignias[i === "historial_12_meses" ? "historial_12m" : i] ?? i}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <a href="#consultar" className={buttonClass("primary", "md", "px-5")}>
              <IconMessage size={18} /> {t.profile.contact}
            </a>
            {actualizado && (
              <p className="text-[12.5px] text-muted">
                {t.profile.updated} {actualizado}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] space-y-8 px-[clamp(16px,4vw,40px)] py-[clamp(28px,4vw,48px)]">
        {portada?.historia && (
          <Seccion id="sobre" title={t.profile.about}>
            <p className="max-w-[72ch] whitespace-pre-line text-[16px] leading-relaxed text-ink">{portada.historia}</p>
            {!!portada.asociaciones?.length && (
              <p className="mt-4 text-[14px] text-muted">
                {t.profile.associations}:{" "}
                <span className="text-ink">{portada.asociaciones
                  .map((a) => String((a as { nombre?: string; entidad?: string }).nombre ?? (a as { entidad?: string }).entidad ?? ""))
                  .filter(Boolean)
                  .join(" · ")}</span>
              </p>
            )}
          </Seccion>
        )}

        {act && (
          <Seccion id="actividad" title={t.profile.activity}>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              {!!act.razas?.length && (
                <div>
                  <dt className="text-[12.5px] text-muted">{t.profile.breeds}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-ink">{codigos(act.razas).map((r) => razaNombre(r.codigo ?? "")).join(", ")}</dd>
                </div>
              )}
              {!!act.actividades?.length && (
                <div>
                  <dt className="text-[12.5px] text-muted">{t.profile.activities}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-ink">{codigos(act.actividades).map((a) => actividadNombre(a.codigo ?? "", locale)).join(", ")}</dd>
                </div>
              )}
              {act.superficie_ha && (
                <div>
                  <dt className="text-[12.5px] text-muted">{t.profile.surface}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">
                    {nf.format(Number(act.superficie_ha))} {t.common.ha}
                  </dd>
                </div>
              )}
              {act.ambiente && (
                <div>
                  <dt className="text-[12.5px] text-muted">{t.profile.environment}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-ink">{act.ambiente}</dd>
                </div>
              )}
            </dl>
          </Seccion>
        )}

        {Object.keys(ficha).length > 0 && <Seccion id="ficha-establecimiento" title={t.profile.establishmentSheet} lead={t.profile.declaredData}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Object.entries(ficha).map(([bloque, valores]) => <div key={bloque} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h3 className="font-semibold text-ink">{fichaNombre(bloque, locale)}</h3>
            <dl className="mt-3 space-y-2">{Object.entries(valores).map(([clave, valor]) => <div key={clave} className="flex justify-between gap-3 text-sm">
              <dt className="text-muted">{fichaNombre(clave, locale)}</dt><dd className="text-right font-medium text-ink">{String(valor)}</dd>
            </div>)}</dl>
          </div>)}</div>
        </Seccion>}

        {sec.rodeo && codigos(sec.rodeo.por_especie).length > 0 && (
          <Seccion id="rodeo" title={t.profile.herd} lead={t.profile.herdLead}>
            <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              {codigos(sec.rodeo.por_especie).map((r) => {
                const e = (r as { especie?: "BOV" | "BUB" }).especie ?? "BOV";
                const rango = (r as { rango?: string; cabezas?: number }).rango ?? nf.format((r as { cabezas?: number }).cabezas ?? 0);
                return (
                  <div key={e} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                    <SpeciesChip especie={especieDe(e)} withIcon label={t.common.species[e]} />
                    <p className="mt-3 text-[26px] font-bold tabular-nums tracking-[-0.02em] text-ink">{rango}</p>
                    <p className="text-[13px] text-muted">{t.profile.heads}</p>
                  </div>
                );
              })}
              {sec.rodeo.pct_identificacion_individual && (
                <div className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5">
                  <div>
                    <p className="flex items-baseline justify-between text-[13px] text-muted">
                      {t.profile.individualId}
                      <span className="text-[16px] font-bold tabular-nums text-ink">{pct(sec.rodeo.pct_identificacion_individual)} %</span>
                    </p>
                    <div className="mt-1.5">
                      <Progress value={Number(sec.rodeo.pct_identificacion_individual)} label={t.profile.individualId} />
                    </div>
                  </div>
                  {sec.rodeo.pct_rfid && (
                    <div>
                      <p className="flex items-baseline justify-between text-[13px] text-muted">
                        {t.profile.rfid}
                        <span className="text-[16px] font-bold tabular-nums text-ink">{pct(sec.rodeo.pct_rfid)} %</span>
                      </p>
                      <div className="mt-1.5">
                        <Progress value={Number(sec.rodeo.pct_rfid)} label={t.profile.rfid} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Seccion>
        )}

        {ampliada.reproductores && <Seccion id="reproductores" title={t.profile.breeders} lead={t.profile.breedersLead}>
          <ReproductoresPublicos items={ampliada.reproductores} locale={locale} t={t} />
        </Seccion>}

        {ampliada.composicion && <Seccion id="composicion-rodeo" title={t.profile.composition}>
          {(ampliada.composicion.por_especie?.length || ampliada.composicion.razas?.length) ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(ampliada.composicion.por_especie ?? []).map((e) => <article key={e.especie} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <p className="text-[14px] font-semibold text-ink">{e.nombre ?? (e.especie ? t.common.species[e.especie as "BOV" | "BUB"] : "")}</p>
              <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">{e.rango ?? nf.format(e.cabezas ?? 0)} <span className="text-[13px] font-normal text-muted">{t.profile.heads}</span></p>
              {!!e.categorias?.length && <ul className="mt-3 divide-y divide-border border-t border-border">{e.categorias.map((c, i) => <li key={`${c.nombre}-${i}`} className="flex justify-between gap-3 py-2 text-[12.5px]"><span className="text-muted">{c.nombre}</span><span className="tabular-nums text-ink">{c.rango ?? (c.cabezas != null ? nf.format(c.cabezas) : "")}</span></li>)}</ul>}
            </article>)}
            {!!ampliada.composicion.razas?.length && <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4"><h3 className="text-[14px] font-semibold text-ink">{t.profile.breeds}</h3><ul className="mt-3 space-y-2">{ampliada.composicion.razas.map((r, i) => <li key={`${r.especie}-${r.raza}-${i}`} className="flex justify-between gap-3 text-[13px]"><span className="text-muted">{razaNombre(r.raza ?? "")}</span>{r.cantidad != null && <span className="tabular-nums text-ink">{nf.format(r.cantidad)}</span>}</li>)}</ul></article>}
          </div> : <p className="text-[14px] text-muted">{t.profile.noComposition}</p>}
        </Seccion>}

        {ampliada.indicadores && <Seccion id="indicadores-rodeo" title={t.profile.indicators}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ampliada.indicadores.prenez_ultimo_tacto && <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5"><p className="text-[13px] text-muted">{t.profile.pregnancy}</p><p className="mt-1 text-[30px] font-bold tabular-nums text-ink">{pct(ampliada.indicadores.prenez_ultimo_tacto.porcentaje)} %</p><p className="mt-1 text-[12px] text-muted">{ampliada.indicadores.prenez_ultimo_tacto.evaluados} · {t.profile.source}: {ampliada.indicadores.prenez_ultimo_tacto.fuente}</p><p className="mt-1 text-[12px] text-muted">{t.profile.date}: {ampliada.indicadores.prenez_ultimo_tacto.fecha}</p></article>}
            {(ampliada.indicadores.partos_por_temporada ?? []).map((v) => <article key={v.temporada} className="rounded-[var(--radius-card)] border border-border bg-surface p-5"><p className="text-[13px] text-muted">{t.profile.calvingsSeason} · {v.temporada}</p><p className="mt-1 text-[30px] font-bold tabular-nums text-ink">{nf.format(v.partos)}</p><p className="mt-1 text-[12px] text-muted">{t.profile.source}: {v.fuente} · {t.profile.date}: {v.fecha}</p></article>)}
            {ampliada.indicadores.anios_en_tropilla != null && <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5"><p className="text-[13px] text-muted">{t.profile.yearsOnPlatform}</p><p className="mt-1 text-[30px] font-bold tabular-nums text-ink">{nf.format(ampliada.indicadores.anios_en_tropilla)}</p><p className="mt-1 text-[12px] text-muted">{t.profile.source}: {ampliada.indicadores.antiguedad_fuente?.fuente ?? "TROPILLA"} · {t.profile.date}: {ampliada.indicadores.antiguedad_fuente?.fecha}</p></article>}
            {ampliada.indicadores.plan_sanitario && <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5"><p className="text-[13px] text-muted">{t.profile.health}</p><p className="mt-1 text-[14px] text-ink">{ampliada.indicadores.plan_sanitario.texto}</p><p className="mt-1 text-[12px] text-muted">{t.profile.source}: {ampliada.indicadores.plan_sanitario.fuente} · {t.profile.date}: {ampliada.indicadores.plan_sanitario.fecha}</p></article>}
          </div>
        </Seccion>}

        {!!ampliada.galeria?.fotos?.length && <Seccion id="galeria" title={t.profile.gallerySection}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{ampliada.galeria.fotos.map((f, i) => <Photo key={f.sha256} src={f} alt={f.alt ?? ""} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className={`aspect-[4/3] rounded-lg border border-border ${i === 0 ? "col-span-2 row-span-2 aspect-square sm:col-span-1 sm:row-span-1 sm:aspect-[4/3]" : ""}`} />)}</div>
        </Seccion>}

        {(sec.sanidad || sec.trazabilidad) && (
          <div className="grid gap-8 border-t border-border pt-8 lg:grid-cols-2">
            {sec.sanidad && (
              <section aria-labelledby="sanidad">
                <h2 id="sanidad" className="text-[20px] font-bold tracking-[-0.01em] text-ink">
                  {t.profile.health}
                </h2>
                <p className="mt-1 text-[14px] text-muted">{t.profile.healthLead}</p>
                {!(sec.sanidad.ultimos_12_meses ?? []).length && (
                  <p className="mt-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-[14px] text-muted">{t.profile.healthEmpty}</p>
                )}
                <ul className="mt-4 divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface empty:hidden">
                  {(sec.sanidad.ultimos_12_meses ?? []).map((s) => (
                    <li key={s.enfermedad} className="flex items-start gap-3 px-4 py-3">
                      <IconShieldCheck size={20} className="mt-0.5 shrink-0 text-campo" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-semibold text-ink">{enfermedadNombre(s.enfermedad, locale)}</p>
                        <p className="text-[13px] text-muted">{s.texto}</p>
                      </div>
                      {s.registros != null && <span className="text-[12.5px] tabular-nums text-muted">{t.profile.records(s.registros)}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {sec.trazabilidad && (
              <section aria-labelledby="traza">
                <h2 id="traza" className="text-[20px] font-bold tracking-[-0.01em] text-ink">
                  {t.profile.trace}
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                    <dd className="text-[26px] font-bold tabular-nums text-ink">{nf.format(sec.trazabilidad.eventos ?? 0)}</dd>
                    <dt className="text-[13px] text-muted">{t.profile.events}</dt>
                  </div>
                  <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                    <dd className="text-[26px] font-bold tabular-nums text-ink">{sec.trazabilidad.historial_meses}</dd>
                    <dt className="text-[13px] text-muted">{t.profile.months}</dt>
                  </div>
                  {Number(sec.trazabilidad.pct_integridad_registrada ?? 0) === 0 && (
                    <p className="col-span-2 flex items-start gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-[13px] text-muted">
                      <IconClock size={16} className="mt-0.5 shrink-0" />
                      {t.profile.integrityPending}
                    </p>
                  )}
                  {Number(sec.trazabilidad.pct_integridad_registrada ?? 0) > 0 && (
                    <div className="col-span-2 rounded-[var(--radius-card)] border border-border bg-surface p-4">
                      <p className="flex items-baseline justify-between">
                        <TrustBadge nivel="integridad_registrada" label={t.common.trust.integridad_registrada} />
                        <span className="text-[20px] font-bold tabular-nums text-ink">{pct(sec.trazabilidad.pct_integridad_registrada)} %</span>
                      </p>
                      <p className="mt-1 text-[13px] text-muted">{t.profile.integrity}</p>
                      <div className="mt-2">
                        <Progress value={Number(sec.trazabilidad.pct_integridad_registrada)} label={t.profile.integrity} />
                      </div>
                    </div>
                  )}
                </dl>
              </section>
            )}
          </div>
        )}

        {!!sec.documentos?.length && (
          <Seccion id="documentos" title={t.profile.documents}>
            <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
              {sec.documentos.map((d) => (
                <li key={d.titulo} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
                  <IconFile size={22} className="shrink-0 text-monte" />
                  <div className="min-w-0 flex-1 basis-[220px]">
                    <p className="text-[14.5px] font-semibold text-ink">{d.titulo}</p>
                    <p className="text-[12.5px] text-muted">{[d.emisor_declarado, d.emitido_en?.split("-").reverse().join("/")].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-1 pl-[34px] sm:pl-0">
                    <TrustBadge nivel={d.confianza ?? "declarado"} label={t.common.trust[d.confianza ?? "declarado"]} />
                    {d.verificacion_url && (
                      <Link href={`/${locale}${d.verificacion_url}`} className={buttonClass("ghost", "sm", "text-campo")}>
                        {t.offer.verify}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        {sec.ofertas && (
          <Seccion id="ofertas" title={t.profile.offers}>
            {sec.ofertas.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sec.ofertas.map((o) => (
                  <Link
                    key={o.codigo}
                    href={`/${locale}/ofertas/${o.codigo}`}
                    className="group overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-shadow hover:shadow-[var(--shadow-hover)]"
                  >
                    {o.foto?.url || o.foto_url ? (
                      <Photo src={o.foto ?? o.foto_url} alt={o.foto?.alt ?? o.titulo ?? ""} sizes="(min-width:1024px) 380px, 100vw" className="aspect-[16/10]" />
                    ) : (
                      <div className="flex aspect-[16/8] items-end justify-between bg-campo-50 p-4 text-monte" role="img" aria-label={o.titulo ?? ""}>
                        <span className="text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums">
                          {o.cantidad}
                          <span className="ml-1.5 text-[15px] font-semibold tracking-normal">{t.common.heads}</span>
                        </span>
                        {(o as { especie?: string }).especie === "BUB" || o.categorias?.[0]?.startsWith("BUB") ? <IconBuffalo size={40} /> : <IconCow size={40} />}
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-[16px] font-semibold text-ink">{o.titulo}</p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {o.cantidad} {t.common.heads}
                        {o.peso_promedio_kg && ` · ${nf.format(Number(o.peso_promedio_kg))} ${t.common.kgAvg}`}
                        {o.categorias?.[0] && ` · ${categoriaNombre(o.categorias[0], locale)}`}
                      </p>
                      <p className="mt-3 flex items-center justify-between">
                        <Badge tone={o.estado === "reservada" ? "warning" : "success"} icon={<IconCheckCircle size={14} />}>
                          {t.offer.status[o.estado ?? "publicada"] ?? o.estado}
                        </Badge>
                        <IconArrowRight size={18} className="text-campo transition-transform group-hover:translate-x-0.5" />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-[var(--radius-card)] border border-border bg-surface px-5 py-4 text-[14.5px] text-muted">{t.profile.noOffers}</p>
            )}
          </Seccion>
        )}
        {!!sec.contratos?.length && (
          <Seccion id="contratos" title={t.profile.contracts}>
            <div className="grid gap-4 sm:grid-cols-2">
              {sec.contratos.map((c) => (
                <Link
                  key={c.codigo}
                  href={`/${locale}/contratos/${c.codigo}`}
                  className="group rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-shadow hover:shadow-[var(--shadow-hover)]"
                >
                  <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">{t.contract.eyebrow}</p>
                  <p className="mt-1 text-[17px] font-semibold text-ink">
                    {t.contract.title(nf.format(c.kg_ofrecidos ?? 0), c.categoria ? categoriaNombre(c.categoria, locale).toLowerCase() : "")}
                  </p>
                  <p className="mt-1 text-[13px] tabular-nums text-muted">
                    {t.contract.tokensOf(c.tokens_libres ?? 0, c.tokens_totales ?? 0)} · {t.contract.delivery} {c.fecha_entrega?.split("-").reverse().join("/")}
                  </p>
                  <div className="mt-3">
                    <Progress value={c.tokens_totales ? Math.round((1 - (c.tokens_libres ?? 0) / c.tokens_totales) * 100) : 0} label={t.contract.tokens} />
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-medium text-campo group-hover:underline">
                    {t.contract.lockedTitle} <IconArrowRight size={14} />
                  </p>
                </Link>
              ))}
            </div>
          </Seccion>
        )}
      </div>
      {contacto}
    </>
  );
}
