import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Card, CardBody, CardHeader, DataList, EmptyState, KpiCard, Notice, PageHeader, Progress, SpeciesChip, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconChart, IconClock, IconCow, IconHash, IconMap, IconScale, IconTag } from "@/components/icons";
import { Timeline } from "@/components/panel/hacienda/timeline";
import { HaciendaTabla, type FilaAnimal } from "@/components/panel/hacienda/tabla";
import { ArchivarLote, EditarLote, ManejoLote } from "@/components/panel/lotes/acciones";
import { requireContexto } from "@/lib/establecimiento";
import { categoriasDe, getLote, getLoteEventos, listLotes } from "@/lib/data/lotes";
import { listAnimales, listPotreros } from "@/lib/data/hacienda";
import { getCatalogos } from "@/lib/data/catalogos";
import { ApiError } from "@/lib/api";
import { OK_LOTE, propositoNombre } from "@/lib/lotes";
import { edad, fecha, hoyAR, nf } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Lote" };

type SP = { ok?: string; n?: string; cant?: string; cursor?: string };

const LIMITE_ANIMALES = 100;
const dec2 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

async function Contenido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const est = ctx.activa.establecimiento_id;
  let l;
  try {
    l = await getLote(est, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  const individuales = l.cabezas_individuales ?? 0;
  const [cat, potreros, eventos, animales, lotes] = await Promise.all([
    getCatalogos(),
    listPotreros(est).catch(() => []),
    getLoteEventos(est, id, sp.cursor).catch(() => null),
    individuales > 0 ? listAnimales(est, { lote_id: id }, undefined, LIMITE_ANIMALES).catch(() => null) : Promise.resolve(null),
    individuales > 0 ? listLotes(est).catch(() => []) : Promise.resolve([]),
  ]);
  await connection();
  const hoy = hoyAR(new Date());

  const archivado = !!l.archivado_en;
  const especie = (l.especie === "BUB" ? "BUB" : "BOV") as "BOV" | "BUB";
  const categorias = categoriasDe(cat, especie);
  const catNombre = new Map(cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo]));
  const razaNombre = new Map(cat.razas.map((r) => [r.codigo, r.nombre ?? r.codigo]));
  const conteo = l.conteo ?? {};
  const anonimas = l.cabezas_anonimas ?? 0;
  const total = anonimas + individuales;

  // Composición: conteo por cantidades + animales identificados del lote, por categoría.
  const identPorCat = new Map<string, number>();
  for (const a of animales?.data ?? []) identPorCat.set(a.categoria ?? "", (identPorCat.get(a.categoria ?? "") ?? 0) + 1);
  const codigos = [...new Set([...Object.keys(conteo), ...identPorCat.keys()])].sort(
    (a, b) => categorias.findIndex((c) => c.codigo === a) - categorias.findIndex((c) => c.codigo === b),
  );
  const parcial = (animales?.meta?.next_cursor ?? null) !== null;

  const ok = sp.ok ? OK_LOTE[sp.ok] : undefined;
  const puedeEventos = ctx.can("hacienda.crear") && !archivado;
  const puedeEditar = ctx.can("maestros.editar") && !archivado;

  const filas: FilaAnimal[] = (animales?.data ?? []).map((a) => ({
    id: a.id ?? "",
    ident: a.identificacion_principal ?? "Sin caravana",
    especie: especieDe(a.especie),
    sexo: a.sexo === "H" ? "Hembra" : a.sexo === "M" ? "Macho" : "",
    categoria: a.categoria_nombre ?? catNombre.get(a.categoria ?? "") ?? a.categoria ?? "",
    raza: a.raza ? (razaNombre.get(a.raza) ?? a.raza) : null,
    edad: edad(a.edad_meses, true),
    peso: a.peso_kg ?? undefined,
    pesoFecha: fecha(a.peso_fecha, true),
    lote: a.lote?.nombre,
    potrero: a.potrero?.nombre,
    repro: null,
    retiro: !!a.retiro_vigente,
  }));

  return (
    <>
      <PageHeader
        title={l.nombre ?? "Lote"}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <SpeciesChip especie={especieDe(l.especie)} />
            {l.anonimo ? (
              <Badge tone="neutral" icon={<IconHash size={14} />}>
                Por cantidades
              </Badge>
            ) : (
              <Badge tone="success" icon={<IconTag size={14} />}>
                Identificados
              </Badge>
            )}
            {l.proposito && <span>{propositoNombre(l.proposito)}</span>}
            {l.potrero && (
              <span className="inline-flex items-center gap-1">
                <IconMap size={14} /> {l.potrero.nombre}
              </span>
            )}
          </span>
        }
        actions={
          <span key={sp.n} className="flex flex-wrap items-center gap-2">
            {archivado && <Badge tone="neutral">Archivado el {fecha(l.archivado_en)}</Badge>}
            {puedeEditar && (
              <>
                <EditarLote
                  lote={{
                    id,
                    nombre: l.nombre ?? "",
                    proposito: l.proposito ?? "",
                    anonimo: !!l.anonimo,
                    notas: l.notas ?? "",
                    row_version: String(l.row_version ?? ""),
                    individuales,
                    anonimas,
                  }}
                />
                <ArchivarLote id={id} nombre={l.nombre ?? ""} cabezas={total} />
              </>
            )}
          </span>
        }
      />

      {ok && (
        <div className="mb-4">
          <Notice tone={ok.tone ?? "success"} title={sp.ok === "individualizado" && sp.cant ? `${ok.titulo}: ${sp.cant}` : ok.titulo}>
            {ok.detalle}
            {sp.ok === "individualizado" && (
              <>
                {" "}
                <a href="#identificados" className="font-semibold underline">
                  Ver los animales
                </a>
              </>
            )}
          </Notice>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label={anonimas && individuales ? `cabezas · ${nf.format(anonimas)} por cantidad y ${nf.format(individuales)} identif.` : "cabezas"}
          value={nf.format(total)}
          icon={<IconCow size={22} />}
        />
        <KpiCard
          label={l.peso_promedio_kg ? `kg promedio · ${fecha(l.peso_promedio_fecha)}` : "kg promedio · sin pesajes"}
          value={l.peso_promedio_kg ? nf.format(Number(l.peso_promedio_kg)) : "—"}
          icon={<IconScale size={22} />}
        />
        <KpiCard label="kg/día de ganancia (GDP)" value={l.gdp_promedio_kg_dia ? dec2.format(Number(l.gdp_promedio_kg_dia)) : "—"} icon={<IconChart size={22} />} />
        <KpiCard
          label="potrero actual"
          value={<span className="block text-[20px] leading-7 [overflow-wrap:anywhere]">{l.potrero?.nombre ?? "Sin potrero"}</span>}
          icon={<IconMap size={22} />}
          href={l.potrero ? `/establecimiento/potreros/${l.potrero.id}` : undefined}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[auto_1fr]">
        <div className="min-w-0 self-start xl:col-start-1 xl:row-start-1">
          <Card className="overflow-hidden">
            <CardHeader
              title="Composición por categoría"
              description={
                total
                  ? l.anonimo
                    ? "El conteo por cantidades sale de los eventos del lote (altas, bajas, recategorizaciones e individualizaciones)."
                    : "Animales identificados del lote, por categoría."
                  : "El lote está vacío."
              }
            />
            {codigos.length ? (
              <ul className={`-mb-px -mr-px grid ${codigos.length === 1 ? "" : codigos.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 2xl:grid-cols-3"}`}>
                {codigos.map((c) => {
                  const anon = conteo[c] ?? 0;
                  const ind = identPorCat.get(c) ?? 0;
                  const n = anon + ind;
                  return (
                    <li key={c} className="border-b border-r border-border px-5 py-4">
                      <p className="font-semibold text-ink">{catNombre.get(c) ?? c}</p>
                      <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">
                        {nf.format(n)} <span className="text-[13px] font-medium text-muted">cab.</span>
                      </p>
                      <p className="mb-2 text-[12.5px] text-muted">
                        {[anon ? `${nf.format(anon)} por cantidad` : null, ind ? `${nf.format(ind)} ${ind === 1 ? "identificado" : "identificados"}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {codigos.length > 1 && (
                        <Progress value={total ? (n / total) * 100 : 0} label={`${catNombre.get(c) ?? c}: ${Math.round(total ? (n / total) * 100 : 0)}% del lote`} />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<IconCow size={24} />}
                title="Todavía no hay hacienda en este lote"
                description={
                  l.anonimo
                    ? "Cargá cuántas cabezas hay por categoría con «Sumar cabezas». Después le registrás vacunas, pesajes y traslados en grupo."
                    : "Elegí los animales en Hacienda y tocá «Cambiar de lote» para sumarlos."
                }
                action={
                  !l.anonimo ? (
                    <Link href="/hacienda" className={buttonClass("outline", "md")}>
                      Ir a Hacienda
                    </Link>
                  ) : undefined
                }
              />
            )}
            {parcial && (
              <p className="border-t border-border px-5 py-2.5 text-[12.5px] text-muted">
                Los identificados por categoría se calculan sobre los primeros {LIMITE_ANIMALES} animales del lote.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4 self-start xl:col-start-2 xl:row-span-2 xl:row-start-1">
          {puedeEventos && (
            <Card className="overflow-hidden">
              <CardHeader title="Manejo del lote" description="Cada acción queda como evento en la historia del lote." />
              <ManejoLote
                key={sp.n}
                lote={{
                  id,
                  nombre: l.nombre ?? "",
                  especie,
                  anonimo: !!l.anonimo,
                  potreroId: l.potrero?.id ?? null,
                  conteo,
                  total,
                }}
                categorias={categorias}
                potreros={potreros.map((p) => ({
                  codigo: p.id ?? "",
                  nombre: p.nombre ?? "",
                }))}
                razas={cat.razas
                  .filter((r) => r.especie === especie)
                  .map((r) => ({
                    codigo: r.codigo,
                    nombre: r.nombre ?? r.codigo,
                  }))}
                causas={cat.items.causas_muerte ?? []}
                hoy={hoy}
                puedeOfertar={ctx.can("ofertas.gestionar")}
              />
            </Card>
          )}
          <Card>
            <CardHeader title="Datos del lote" />
            <CardBody>
              <DataList
                className="sm:grid-cols-2"
                items={[
                  {
                    label: "Especie",
                    value: especie === "BUB" ? "Bubalinos" : "Bovinos",
                  },
                  {
                    label: "Propósito",
                    value: propositoNombre(l.proposito) || "Sin definir",
                  },
                  {
                    label: "Cómo se lleva",
                    value: l.anonimo ? "Por cantidades" : "Animales identificados",
                  },
                  {
                    label: "Potrero",
                    value: l.potrero ? (
                      <Link href={`/establecimiento/potreros/${l.potrero.id}`} className="text-campo hover:underline">
                        {l.potrero.nombre}
                      </Link>
                    ) : (
                      "Sin potrero"
                    ),
                  },
                  ...(l.notas
                    ? [
                        {
                          label: "Notas",
                          value: <span className="whitespace-pre-line">{l.notas}</span>,
                        },
                      ]
                    : []),
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 self-start xl:col-start-1 xl:row-start-2">
          <Card>
            <CardHeader title="Historia del lote" description="Eventos grupales del lote, con autor y nivel de confianza. Los animales individualizados la heredan." />
            <CardBody>
              {eventos === null ? (
                <Notice tone="warning" title="No pudimos traer la historia del lote">
                  Probá recargar la página en un momento.
                </Notice>
              ) : eventos.data.length ? (
                <>
                  <Timeline eventos={eventos.data} />
                  {(eventos.meta?.next_cursor || sp.cursor) && (
                    <nav aria-label="Páginas de la historia" className="mt-5 flex items-center justify-between border-t border-border pt-3">
                      {sp.cursor ? (
                        <Link href={`/hacienda/lotes/${id}`} className={buttonClass("ghost", "sm")}>
                          <IconArrowLeft size={16} /> Más recientes
                        </Link>
                      ) : (
                        <span />
                      )}
                      {eventos.meta?.next_cursor && (
                        <Link href={`/hacienda/lotes/${id}?cursor=${encodeURIComponent(eventos.meta.next_cursor)}`} className={buttonClass("ghost", "sm")}>
                          Anteriores <IconArrowRight size={16} />
                        </Link>
                      )}
                    </nav>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={<IconClock size={24} />}
                  title="Sin eventos todavía"
                  description="Cuando sumes cabezas, lo muevas de potrero, lo peses o lo vacunes, cada evento aparece acá con fecha, autor y huella."
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {individuales > 0 && (
        <div id="identificados" className="scroll-mt-4">
          <Card>
            <CardHeader
              title="Animales identificados"
              description={`${nf.format(individuales)} en este lote. Elegí algunos para trasladarlos o pasarlos a otro lote.`}
              action={
                <Link href={`/hacienda?lote_id=${id}`} className={buttonClass("ghost", "sm")}>
                  Ver en Hacienda <IconArrowRight size={16} />
                </Link>
              }
            />
            {filas.length ? (
              <HaciendaTabla
                filas={filas}
                potreros={potreros.map((p) => ({
                  id: p.id ?? "",
                  nombre: p.nombre ?? "",
                }))}
                lotes={lotes.map((x) => ({
                  id: x.id ?? "",
                  nombre: x.nombre ?? "",
                  especie: especieDe(x.especie),
                }))}
                loteActual={id}
                puedeCargar={puedeEventos}
                hoy={hoy}
              />
            ) : (
              <EmptyState icon={<IconTag size={24} />} title="No pudimos traer los animales" description="Probá recargar la página en un momento." />
            )}
          </Card>
        </div>
      )}
    </>
  );
}

/** Ficha de un lote de manejo: composición, manejo grupal, animales e historia (TPA-20). */
export default function LotePage(props: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  return (
    <>
      <Link href="/hacienda/lotes" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Lotes
      </Link>
      <Suspense fallback={<div className="h-[720px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
