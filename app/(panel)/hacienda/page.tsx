import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, EmptyState, FilterTabs, PageHeader, Select, buttonClass, inputClass } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconCow, IconFilter, IconSearch, IconUpload } from "@/components/icons";
import { HaciendaTabla, type FilaAnimal } from "@/components/panel/hacienda/tabla";
import { PersistFilters } from "@/components/panel/hacienda/persist-filters";
import { HaciendaTabs } from "@/components/panel/hacienda/tabs";
import { listLotes } from "@/lib/data/potreros";
import { requireContexto } from "@/lib/establecimiento";
import { FILTROS_HACIENDA, listAnimales, listPotreros, type FiltrosHacienda } from "@/lib/data/hacienda";
import { getCatalogos } from "@/lib/data/catalogos";
import { edad, fecha, hoyAR } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Hacienda" };

type SP = Record<string, string | string[] | undefined>;

const REPRO: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  prenada: { label: "Preñada", tone: "success" },
  vacia: { label: "Vacía", tone: "neutral" },
  servida: { label: "Servida", tone: "info" },
  parida: { label: "Parida", tone: "info" },
};

function leer(sp: SP): { f: FiltrosHacienda; cursor?: string } {
  const f: FiltrosHacienda = {};
  for (const k of FILTROS_HACIENDA) {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.slice(0, 80);
    if (s) f[k] = s;
  }
  const c = sp.cursor;
  return { f, cursor: (Array.isArray(c) ? c[0] : c) || undefined };
}

function href(f: FiltrosHacienda, cambios: Partial<FiltrosHacienda & { cursor: string }> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...cambios })) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/hacienda?${s}` : "/hacienda?limpiar=1";
}

async function Listado({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const { f, cursor } = leer(await searchParams);
  const est = ctx.activa.establecimiento_id;
  const [res, potreros, cat, todosLotes] = await Promise.all([listAnimales(est, f, cursor), listPotreros(est).catch(() => []), getCatalogos(), listLotes(est).catch(() => [])]);
  await connection();
  const hoy = hoyAR(new Date());

  const catNombre = new Map(cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo]));
  const razaNombre = new Map(cat.razas.map((r) => [r.codigo, r.nombre ?? r.codigo]));
  const lotes = todosLotes.filter((l) => !f.especie || l.especie === f.especie);
  const categorias = cat.categorias.filter((c) => !f.especie || c.especie === f.especie);

  const filas: FilaAnimal[] = res.data.map((a) => ({
    id: a.id ?? "",
    ident: a.identificacion_principal ?? "Sin caravana",
    especie: especieDe(a.especie),
    sexo: a.sexo === "H" ? "Hembra" : a.sexo === "M" ? "Macho" : "",
    categoria: a.categoria_nombre ?? catNombre.get(a.categoria ?? "") ?? a.categoria ?? "",
    sugerida: a.categoria_sugerida && a.categoria_sugerida !== a.categoria ? (catNombre.get(a.categoria_sugerida) ?? a.categoria_sugerida) : null,
    raza: a.raza ? (razaNombre.get(a.raza) ?? a.raza) : null,
    edad: edad(a.edad_meses, true),
    peso: a.peso_kg ?? undefined,
    pesoFecha: fecha(a.peso_fecha, true),
    lote: a.lote?.nombre,
    potrero: a.potrero?.nombre,
    repro: a.estado_reproductivo
      ? {
          ...(REPRO[a.estado_reproductivo] ?? { label: a.estado_reproductivo, tone: "neutral" as const }),
          label:
            a.estado_reproductivo === "prenada" && a.fecha_probable_parto
              ? `Preñada · parto ${fecha(a.fecha_probable_parto, true)}`
              : (REPRO[a.estado_reproductivo]?.label ?? a.estado_reproductivo),
          tone: a.estado_reproductivo === "prenada" && a.fecha_probable_parto && a.fecha_probable_parto <= hoy ? ("warning" as const) : (REPRO[a.estado_reproductivo]?.tone ?? "neutral"),
        }
      : null,
    retiro: !!a.retiro_vigente,
  }));

  const activos = Object.keys(f).filter((k) => k !== "q" && k !== "especie" && k !== "orden").length;

  return (
    <>
      <PersistFilters />
      <Card>
        {/* Buscador + especie */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <form action="/hacienda" role="search" className="relative min-w-[240px] flex-1">
            {Object.entries(f)
              .filter(([k]) => k !== "q")
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <label htmlFor="q" className="sr-only">
              Buscar por caravana, RFID, tatuaje, marca o registro
            </label>
            <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input id="q" name="q" type="search" defaultValue={f.q} placeholder="Caravana, RFID, tatuaje, marca o registro" className={`${inputClass} pl-10`} />
          </form>
          <FilterTabs
            label="Especie"
            items={[
              { href: href(f, { especie: "", categoria: "", cursor: "" }), label: "Todas", active: !f.especie },
              { href: href(f, { especie: "BOV", categoria: "", cursor: "" }), label: "Bovinos", active: f.especie === "BOV" },
              { href: href(f, { especie: "BUB", categoria: "", cursor: "" }), label: "Bubalinos", active: f.especie === "BUB" },
            ]}
          />
        </div>

        {/* Filtros persistentes */}
        <form action="/hacienda" className="grid grid-cols-2 gap-3 border-b border-border bg-base px-5 py-3 md:grid-cols-3 xl:grid-cols-6">
          {f.q && <input type="hidden" name="q" value={f.q} />}
          {f.especie && <input type="hidden" name="especie" value={f.especie} />}
          <Select name="categoria" defaultValue={f.categoria ?? ""} aria-label="Categoría" className="h-10 text-[14px]">
            <option value="">Categoría</option>
            {categorias.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Select name="lote_id" defaultValue={f.lote_id ?? ""} aria-label="Lote" className="h-10 text-[14px]">
            <option value="">Lote</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </Select>
          <Select name="potrero_id" defaultValue={f.potrero_id ?? ""} aria-label="Potrero" className="h-10 text-[14px]">
            <option value="">Potrero</option>
            {potreros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
          <Select name="estado_reproductivo" defaultValue={f.estado_reproductivo ?? ""} aria-label="Estado reproductivo" className="h-10 text-[14px]">
            <option value="">Reproducción</option>
            <option value="prenada">Preñadas</option>
            <option value="vacia">Vacías</option>
            <option value="servida">Servidas</option>
            <option value="parida">Paridas</option>
          </Select>
          <Select name="sanidad" defaultValue={f.sanidad ?? ""} aria-label="Sanidad" className="h-10 text-[14px]">
            <option value="">Sanidad</option>
            <option value="retiro">Con retiro vigente</option>
            <option value="reactor">Reactores</option>
          </Select>
          <Select name="orden" defaultValue={f.orden ?? ""} aria-label="Ordenar" className="h-10 text-[14px]">
            <option value="">Por identificación</option>
            <option value="reciente">Más recientes</option>
            <option value="categoria">Categoría</option>
            <option value="peso">Peso</option>
            <option value="edad">Edad</option>
          </Select>
          <div className="col-span-full flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-[13.5px] text-ink">
              <input type="checkbox" name="sugerencia_categoria" value="1" defaultChecked={!!f.sugerencia_categoria} className="h-4 w-4 accent-monte" />
              Con recategorización sugerida
            </label>
            <button type="submit" className={buttonClass("outline", "sm")}>
              <IconFilter size={16} /> Aplicar filtros
            </button>
            {(activos > 0 || f.q || f.especie) && (
              <Link href="/hacienda?limpiar=1" className="text-[13px] font-medium text-campo hover:underline">
                Limpiar todo
              </Link>
            )}
            <span className="ml-auto text-[13px] text-muted">
              <span className="font-semibold tabular-nums text-ink">{res.data.length}</span> {res.data.length === 1 ? "animal" : "animales"} en esta página
            </span>
          </div>
        </form>

        {filas.length ? (
          <HaciendaTabla
            filas={filas}
            potreros={potreros.map((p) => ({ id: p.id ?? "", nombre: p.nombre ?? "" }))}
            lotes={todosLotes.map((l) => ({ id: l.id ?? "", nombre: l.nombre ?? "", especie: especieDe(l.especie) }))}
            puedeCargar={ctx.can("hacienda.crear")}
            hoy={hoy}
          />
        ) : (
          <EmptyState
            icon={<IconCow size={24} />}
            title={activos || f.q || f.especie ? "Ningún animal coincide con estos filtros" : "Todavía no hay animales identificados"}
            description={
              activos || f.q || f.especie
                ? "Probá con otra caravana o sacá algún filtro. Los animales de lotes sin identificar no aparecen acá hasta que los individualices."
                : "Cargá el stock inicial desde la planilla o identificá animales en la manga con la app. Los lotes por cantidades no se listan animal por animal."
            }
            action={
              activos || f.q || f.especie ? (
                <Link href="/hacienda?limpiar=1" className={buttonClass("outline", "md")}>
                  Ver todo el rodeo
                </Link>
              ) : (
                <>
                  {ctx.can("importaciones.gestionar") && (
                    <Link href="/hacienda/importar" className={buttonClass("primary", "md")}>
                      <IconUpload size={18} /> Cargar stock por planilla
                    </Link>
                  )}
                  <Link href="/hacienda/lotes" className={buttonClass("outline", "md")}>
                    Ver lotes por cantidades
                  </Link>
                </>
              )
            }
          />
        )}

        {(res.meta?.prev_cursor || res.meta?.next_cursor) && (
          <nav aria-label="Páginas" className="flex items-center justify-between border-t border-border px-5 py-3">
            {res.meta?.prev_cursor ? (
              <Link href={href(f, { cursor: res.meta.prev_cursor })} className={buttonClass("ghost", "sm")}>
                <IconArrowLeft size={16} /> Anteriores
              </Link>
            ) : (
              <span />
            )}
            {res.meta?.next_cursor && (
              <Link href={href(f, { cursor: res.meta.next_cursor })} className={buttonClass("ghost", "sm")}>
                Siguientes <IconArrowRight size={16} />
              </Link>
            )}
          </nav>
        )}
      </Card>
    </>
  );
}

/** Acceso a la carga por planilla (TPA-21), sólo para quien puede importar. */
async function AccionImportar() {
  const ctx = await requireContexto();
  if (!ctx.can("importaciones.gestionar")) return null;
  return (
    <Link href="/hacienda/importar" className={buttonClass("outline", "md")}>
      <IconUpload size={18} /> Importar planilla
    </Link>
  );
}

/** Listado de hacienda con búsqueda y filtros (TPA-18). Paginado server-side por cursor. */
export default function HaciendaPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        title="Hacienda"
        subtitle="Animales identificados del establecimiento. Buscá por cualquier identificador y trabajá sobre un grupo."
        actions={
          <Suspense fallback={null}>
            <AccionImportar />
          </Suspense>
        }
      />
      <HaciendaTabs activo="animales" />
      <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Listado searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
