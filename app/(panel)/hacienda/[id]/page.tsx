import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Card, CardBody, CardHeader, DataList, EmptyState, FilterTabs, KpiCard, SpeciesChip, TrustBadge, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconArrowRight, IconChart, IconFile, IconHeart, IconList, IconPlus, IconScale, IconShieldCheck, IconTag } from "@/components/icons";
import { Photo } from "@/components/public/photo";
import { Timeline } from "@/components/panel/hacienda/timeline";
import { CurvaPeso, TablaPesajes } from "@/components/panel/hacienda/curva-peso";
import { fmtGdp } from "@/lib/pesajes";
import { requireContexto } from "@/lib/establecimiento";
import { getAnimal, getPesajesAnimal, getDocumentosAnimal, getGenealogia, getMovimientosIdentificacion, getTimeline, type AnimalDetalle } from "@/lib/data/hacienda";
import { IdentificacionesPanel } from "@/components/panel/hacienda/identificaciones";
import { tipoIdentLabel } from "@/lib/identificaciones";
import { getCatalogos } from "@/lib/data/catalogos";
import { ApiError } from "@/lib/api";
import { edad, fecha, fechaLarga, hoyAR, nf } from "@/lib/format";
import { especieDe } from "@/lib/types";
import type { S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Ficha del animal" };

const TABS = [
  { k: "resumen", l: "Resumen" },
  { k: "identificaciones", l: "Identificaciones" },
  { k: "timeline", l: "Timeline" },
  { k: "sanidad", l: "Sanidad" },
  { k: "reproduccion", l: "Reproducción" },
  { k: "documentos", l: "Documentos" },
  { k: "genealogia", l: "Genealogía" },
] as const;

const DENTICION: Record<string, string> = { dl: "Diente de leche", "2": "2 dientes", "4": "4 dientes", "6_mas": "6 dientes o más", boca_llena: "Boca llena" };
const ORIGEN: Record<string, string> = { inventario: "Stock inicial", nacimiento: "Nacido en el establecimiento", compra: "Comprado", ingreso: "Ingreso" };
const REPRO: Record<string, string> = { prenada: "Preñada", vacia: "Vacía", servida: "Servida", parida: "Parida" };

type Params = Promise<{ id: string }>;
type SP = Promise<{ tab?: string; cursor?: string; anulados?: string }>;

function AnimalLink({ a, rol }: { a: { id?: string; identificacion_principal?: string | null; categoria_nombre?: string } | null | undefined; rol: string }) {
  if (!a?.id) {
    return (
      <div className="rounded-[12px] border border-dashed border-border-strong p-4">
        <p className="text-[12px] font-medium text-muted">{rol}</p>
        <p className="mt-1 text-[14px] text-muted">Sin dato cargado</p>
      </div>
    );
  }
  return (
    <Link href={`/hacienda/${a.id}`} className="block rounded-[12px] border border-border p-4 transition-colors hover:border-campo hover:bg-base">
      <p className="text-[12px] font-medium text-muted">{rol}</p>
      <p className="mt-1 text-[16px] font-semibold tabular-nums text-ink">{a.identificacion_principal ?? "Sin caravana"}</p>
      {a.categoria_nombre && <p className="text-[13px] text-muted">{a.categoria_nombre}</p>}
    </Link>
  );
}

async function Ficha({ params, searchParams }: { params: Params; searchParams: SP }) {
  const ctx = await requireContexto();
  const { id } = await params;
  const { tab = "resumen", cursor, anulados } = await searchParams;
  const est = ctx.activa.establecimiento_id;
  let a: AnimalDetalle;
  try {
    a = await getAnimal(est, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  const cat = await getCatalogos();
  const razaCat = cat.razas.find((r) => r.codigo === a.raza);
  const raza = razaCat?.nombre ?? a.raza;
  const sugerida = a.categoria_sugerida && a.categoria_sugerida !== a.categoria ? (cat.categorias.find((c) => c.codigo === a.categoria_sugerida)?.nombre ?? a.categoria_sugerida) : null;
  const ids = (a.identificaciones ?? []).filter((i) => i.vigente !== false);
  const cc = a.condicion_corporal;
  const conf = a.confianza_resumen as { eventos?: number; con_integridad_registrada?: number } | undefined;
  const claseFaena = a.clase_faena as { abreviatura?: string; clase?: string } | null | undefined;
  const retiroHasta = a.retiro_carne_hasta as string | null | undefined;
  const puedeCargar = ctx.can("hacienda.crear") && (a.estado ?? "activo") === "activo";

  let contenido: ReactNode = null;
  if (tab === "resumen" || tab === "timeline" || tab === "sanidad" || tab === "reproduccion") {
    const modulo = tab === "sanidad" ? "sanidad" : tab === "reproduccion" ? "reproduccion" : undefined;
    const [tl, pesajes] = await Promise.all([
      getTimeline(est, id, { modulo, cursor, incluir_anulados: anulados ? "1" : undefined }),
      tab === "resumen" ? getPesajesAnimal(est, id).catch(() => []) : Promise.resolve([]),
    ]);
    const eventos = tab === "resumen" ? tl.data.slice(0, 5) : tl.data;
    const lista = eventos.length ? (
      <Timeline eventos={eventos} />
    ) : (
      <EmptyState icon={<IconList size={24} />} title="Sin eventos en esta sección" description="Cuando se registre algo para este animal (en el campo o desde la web) aparece acá con su autor y su fecha." />
    );

    if (tab === "resumen") {
      contenido = (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Card>
            <CardHeader title="Datos del animal" />
            <CardBody>
              <DataList
                items={[
                  { label: "Nacimiento", value: a.fecha_nacimiento ? `${fechaLarga(a.fecha_nacimiento)}${a.nacimiento_estimado ? " (estimado)" : ""}` : "—" },
                  { label: "Edad", value: edad(a.edad_meses) || "—" },
                  { label: "Origen", value: ORIGEN[a.origen ?? ""] ?? a.origen ?? "—" },
                  { label: "Dentición", value: DENTICION[a.denticion ?? ""] ?? a.denticion ?? "—" },
                  ...(a.sexo === "M" ? [{ label: "Castrado", value: a.castrado == null ? "Sin dato" : a.castrado ? "Sí" : "No" }] : []),
                  { label: "Condición corporal", value: cc?.valor ? `${cc.valor} (escala ${cc.escala}) · ${fecha(cc.fecha)}` : "—" },
                  {
                    label: "Lote",
                    value: a.lote?.id ? (
                      <Link href={`/hacienda/lotes/${a.lote.id}`} className="text-campo hover:underline">
                        {a.lote.nombre}
                      </Link>
                    ) : (
                      "Sin lote"
                    ),
                  },
                  { label: "Potrero", value: a.potrero?.nombre ?? "—" },
                  ...(claseFaena ? [{ label: "Clase de faena (Res. 470/2012)", value: `${claseFaena.abreviatura} · ${claseFaena.clase}` }] : []),
                  ...(a.senas ? [{ label: "Señas particulares", value: a.senas }] : []),
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Últimos eventos"
              action={
                <Link href={`/hacienda/${id}?tab=timeline`} className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
                  Ver todo <IconArrowRight size={14} />
                </Link>
              }
            />
            <CardBody>{lista}</CardBody>
          </Card>
          <Card className="overflow-hidden xl:col-span-2">
            <CardHeader
              title="Peso y ganancia diaria"
              description={pesajes.length > 1 ? "Ganancia diaria entre cada pesaje. Los promedios del lote cuentan hasta que el animal tuvo pesaje propio." : undefined}
              action={
                puedeCargar ? (
                  <Link href={`/hacienda/pesajes?animal=${id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
                    <IconScale size={15} /> Cargar pesaje
                  </Link>
                ) : undefined
              }
            />
            {pesajes.length ? (
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <div className="px-5 py-4">
                  <CurvaPeso puntos={pesajes} />
                </div>
                <div className="border-t border-border lg:border-l lg:border-t-0">
                  <TablaPesajes puntos={pesajes} />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<IconScale size={24} />}
                title="Todavía no tiene pesajes"
                description="Con dos pesajes se calcula la ganancia diaria. Pesalo en la manga con la app o cargá el peso acá."
              />
            )}
          </Card>
        </div>
      );
    } else {
      contenido = (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader
              title={tab === "sanidad" ? "Sanidad" : tab === "reproduccion" ? "Reproducción" : "Timeline completo"}
              description="Nada se borra: las correcciones crean una versión nueva y la anterior queda visible."
              action={
                <Link href={`/hacienda/${id}?tab=${tab}${anulados ? "" : "&anulados=1"}`} className="text-[13px] font-medium text-campo hover:underline">
                  {anulados ? "Ocultar anulados" : "Mostrar anulados"}
                </Link>
              }
            />
            <CardBody>{lista}</CardBody>
            {tl.meta?.next_cursor && (
              <div className="border-t border-border px-5 py-3">
                <Link href={`/hacienda/${id}?tab=${tab}&cursor=${encodeURIComponent(tl.meta.next_cursor)}${anulados ? "&anulados=1" : ""}`} className={buttonClass("ghost", "sm")}>
                  Eventos anteriores <IconArrowRight size={16} />
                </Link>
              </div>
            )}
          </Card>
          <div className="space-y-4">
            {tab === "sanidad" && (
              <Card>
                <CardHeader title="Retiro" />
                <CardBody className="text-[14px]">
                  {a.retiro_vigente && retiroHasta ? (
                    <p className="flex gap-2 text-warning">
                      <IconAlert size={18} className="shrink-0" /> No faenar ni vender para faena hasta el {fechaLarga(retiroHasta)}.
                    </p>
                  ) : (
                    <p className="flex gap-2 text-success">
                      <IconShieldCheck size={18} className="shrink-0" /> Sin retiro vigente{retiroHasta ? ` (el último terminó el ${fecha(retiroHasta)})` : ""}.
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
            {tab === "reproduccion" && a.sexo === "H" && (
              <Card>
                <CardHeader title="Estado reproductivo" />
                <CardBody>
                  <DataList
                    className="sm:grid-cols-1"
                    items={[
                      { label: "Estado", value: REPRO[a.estado_reproductivo ?? ""] ?? "Sin dato" },
                      { label: "Último servicio", value: fecha(a.servicio_fecha) || "—" },
                      {
                        label: "Fecha probable de parto",
                        value: a.fecha_probable_parto ? `${fechaLarga(a.fecha_probable_parto)}${a.fpp_precision ? ` · según ${String(a.fpp_precision)}` : ""}` : "—",
                      },
                      { label: "Partos", value: a.partos ?? 0 },
                      { label: "Último parto", value: fecha(a.ultimo_parto_fecha) || "—" },
                    ]}
                  />
                </CardBody>
              </Card>
            )}
            {conf?.eventos != null && (
              <Card>
                <CardHeader title="Evidencia" />
                <CardBody className="space-y-2 text-[14px]">
                  <p>
                    <span className="font-semibold tabular-nums">{conf.eventos}</span> eventos registrados
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums">{conf.con_integridad_registrada ?? 0}</span>
                    <span className="text-muted">con</span>
                    <TrustBadge nivel="integridad_registrada" />
                  </p>
                  <p className="text-[12.5px] text-muted">El resto queda «Declarado» hasta el próximo anclaje diario.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      );
    }
  } else if (tab === "identificaciones") {
    const movimientos = await getMovimientosIdentificacion(est, id).catch(() => []);
    contenido = (
      <IdentificacionesPanel
        animalId={id}
        identificaciones={a.identificaciones ?? []}
        movimientos={movimientos}
        puedeEditar={ctx.can("hacienda.crear") && (a.estado ?? "activo") === "activo"}
        prefijoTatuaje={(razaCat as { prefijo_tatuaje?: string | null } | undefined)?.prefijo_tatuaje ?? null}
        razaNombre={raza}
        hoy={hoyAR(new Date())}
      />
    );
  } else if (tab === "documentos") {
    const docs = await getDocumentosAnimal(est, id).catch(() => []);
    contenido = (
      <Card>
        {docs.length ? (
          <ul className="divide-y divide-border">
            {docs.map((d, i) => (
              <li key={String(d.id ?? i)} className="flex items-center gap-3 px-5 py-3.5">
                <IconFile size={22} className="text-monte" />
                <span className="flex-1 text-[14.5px] font-medium text-ink">{String(d.titulo ?? d.tipo ?? "Documento")}</span>
                <TrustBadge nivel={(d.confianza as "declarado" | "integridad_registrada") ?? "declarado"} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<IconFile size={24} />}
            title="Sin documentos vinculados"
            description="Certificados, análisis o la DT-e de este animal: sacales una foto desde la app y vinculalos acá. Cada versión queda con su huella."
            action={
              <Link href="/documentos" className={buttonClass("outline", "md")}>
                Ir a Documentos
              </Link>
            }
          />
        )}
      </Card>
    );
  } else if (tab === "genealogia") {
    const g = await getGenealogia(est, id);
    const madre = (g.madre ?? null) as { id?: string; identificacion_principal?: string | null; categoria_nombre?: string } | null;
    const padre = (g.padre ?? null) as typeof madre;
    contenido = (
      <Card>
        <CardBody className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimalLink a={madre} rol="Madre" />
            <AnimalLink a={padre} rol="Padre" />
          </div>
          <div>
            <h3 className="mb-2 text-[14px] font-semibold text-ink">Crías {g.crias?.length ? <span className="tabular-nums text-muted">· {g.crias.length}</span> : null}</h3>
            {g.crias?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {g.crias.map((c: S<"AnimalResumen">) => (
                  <AnimalLink key={c.id} a={c} rol={c.sexo === "H" ? "Hembra" : "Macho"} />
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-muted">Sin crías registradas.</p>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Link href="/hacienda" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Hacienda
      </Link>

      {/* Encabezado: foto, identificadores, chips, estados */}
      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <Photo src={a.foto_url} alt={`Foto de ${a.identificacion_principal ?? "el animal"}`} sizes="160px" className="aspect-square w-full shrink-0 rounded-[12px] border border-border sm:w-[148px]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] tabular-nums text-ink">{a.identificacion_principal ?? "Sin caravana"}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <SpeciesChip especie={especieDe(a.especie)} withIcon />
                  {raza && <Badge>{raza}</Badge>}
                  <Badge>{a.categoria_nombre ?? a.categoria}</Badge>
                  <Badge>{a.sexo === "H" ? "Hembra" : "Macho"}</Badge>
                  {a.estado && a.estado !== "activo" && <Badge tone="danger">{a.estado}</Badge>}
                  {a.estado_reproductivo === "prenada" && (
                    <Badge tone="success" icon={<IconHeart size={14} />}>
                      Preñada · parto {fecha(a.fecha_probable_parto)}
                    </Badge>
                  )}
                  {a.retiro_vigente && (
                    <Badge tone="warning" icon={<IconAlert size={14} />}>
                      Retiro vigente
                    </Badge>
                  )}
                  {sugerida && <Badge tone="success">Recategorización sugerida: {sugerida}</Badge>}
                </div>
              </div>
              {ctx.can("hacienda.crear") && (a.estado ?? "activo") === "activo" && (
                <Link href={`/hacienda/eventos/nuevo?animales=${id}`} className={buttonClass("outline", "sm")}>
                  <IconPlus size={16} /> Registrar evento
                </Link>
              )}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
              {ids.map((i) => (
                <li key={`${i.tipo}${i.valor}`} className="text-[13px]">
                  <span className="text-muted">{tipoIdentLabel(i.tipo)}</span>{" "}
                  <span className="font-semibold tabular-nums text-ink">{i.valor}</span>
                  {i.en_conflicto && <span className="ml-1 text-warning">(en conflicto)</span>}
                </li>
              ))}
              {!ids.length && <li className="text-[13px] text-muted">Sin identificadores vigentes</li>}
              {tab !== "identificaciones" && (
                <li className="text-[13px]">
                  <Link href={`/hacienda/${id}?tab=identificaciones`} className="font-medium text-campo hover:underline">
                    {ids.length ? "Ver historial y reponer" : "Agregar identificación"}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={a.peso_fecha ? `Peso · ${fecha(a.peso_fecha)}` : "Peso"} value={a.peso_kg ? `${nf.format(Number(a.peso_kg))} kg` : "—"} icon={<IconScale size={22} />} />
        <KpiCard label="Ganancia diaria" value={a.gdp_kg_dia ? fmtGdp(Number(a.gdp_kg_dia)) : "—"} icon={<IconChart size={22} />} />
        <KpiCard label="Edad" value={edad(a.edad_meses, true) || "—"} icon={<IconTag size={22} />} />
        <KpiCard label="Eventos registrados" value={a.eventos_count != null ? String(a.eventos_count) : "—"} icon={<IconList size={22} />} />
      </div>

      <div className="mb-4 overflow-x-auto">
        <FilterTabs label="Secciones de la ficha" items={TABS.map((t) => ({ href: `/hacienda/${id}?tab=${t.k}`, label: t.l, active: tab === t.k }))} />
      </div>
      {contenido}
    </>
  );
}

/** Ficha del animal con timeline (TPA-17). */
export default function AnimalPage(props: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<div className="h-[560px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Ficha params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
