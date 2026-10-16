import Link from "next/link";
import { Fragment, Suspense } from "react";
import type { Metadata } from "next";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  FilterTabs,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  Tr,
  TrustInline,
  buttonClass,
  inputClass,
} from "@/components/ui";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronRight,
  IconFilter,
  IconList,
  IconPlus,
} from "@/components/icons";
import { HaciendaTabs } from "@/components/panel/hacienda/tabs";
import { EventoIcono } from "@/components/panel/hacienda/timeline";
import { requireContexto } from "@/lib/establecimiento";
import {
  FILTROS_EVENTOS,
  listEventos,
  type FiltrosEventos,
} from "@/lib/data/eventos";
import { getCatalogos } from "@/lib/data/catalogos";
import { ROL_LABEL } from "@/lib/auth";
import { fecha } from "@/lib/format";
import { resumenIdentificacion } from "@/lib/identificaciones";

export const metadata: Metadata = { title: "Eventos de hacienda" };

type SP = Record<string, string | string[] | undefined>;

const MODULOS = [
  ["", "Todos"],
  ["hacienda", "Hacienda"],
  ["reproduccion", "Reproducción"],
  ["sanidad", "Sanidad"],
  ["establecimiento", "Establecimiento"],
] as const;

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const mesLargo = (ym: string) =>
  ym.length === 7 ? `${MESES[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}` : "";

function leer(sp: SP): { f: FiltrosEventos; cursor?: string } {
  const f: FiltrosEventos = {};
  for (const k of FILTROS_EVENTOS) {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.slice(0, 64);
    if (s) f[k] = s;
  }
  if (f.desde && !/^\d{4}-\d{2}-\d{2}$/.test(f.desde)) delete f.desde;
  if (f.hasta && !/^\d{4}-\d{2}-\d{2}$/.test(f.hasta)) delete f.hasta;
  const c = sp.cursor;
  return { f, cursor: (Array.isArray(c) ? c[0] : c) || undefined };
}

function href(
  f: FiltrosEventos,
  cambios: Partial<FiltrosEventos & { cursor: string }> = {},
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...cambios }))
    if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/hacienda/eventos?${s}` : "/hacienda/eventos";
}

async function Registro({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const { f, cursor } = leer(await searchParams);
  const est = ctx.activa.establecimiento_id;
  const [res, cat] = await Promise.all([
    listEventos(est, f, cursor),
    getCatalogos(),
  ]);
  const tipos = cat.tiposEvento.filter(
    (t) => !f.modulo || t.modulo === f.modulo,
  );
  const filtrado = !!(f.tipo || f.desde || f.hasta || f.modulo);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <FilterTabs
          label="Módulo"
          items={MODULOS.map(([m, label]) => ({
            href: href(f, { modulo: m, tipo: "", cursor: "" }),
            label,
            active: (f.modulo ?? "") === m,
          }))}
        />
      </div>
      <form
        action="/hacienda/eventos"
        className="grid grid-cols-2 items-end gap-3 border-b border-border bg-base px-5 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        {f.modulo && <input type="hidden" name="modulo" value={f.modulo} />}
        <div className="col-span-2 md:col-span-1">
          <Select
            name="tipo"
            defaultValue={f.tipo ?? ""}
            aria-label="Tipo de evento"
            className="h-10 text-[14px]"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.nombre}
              </option>
            ))}
          </Select>
        </div>
        <label className="text-[12px] font-semibold text-muted">
          Desde
          <input
            type="date"
            name="desde"
            defaultValue={f.desde}
            className={`${inputClass} mt-1 h-10 text-[14px]`}
          />
        </label>
        <label className="text-[12px] font-semibold text-muted">
          Hasta
          <input
            type="date"
            name="hasta"
            defaultValue={f.hasta}
            className={`${inputClass} mt-1 h-10 text-[14px]`}
          />
        </label>
        <div className="col-span-2 flex items-center gap-3 md:col-span-1">
          <button type="submit" className={buttonClass("outline", "sm")}>
            <IconFilter size={16} /> Filtrar
          </button>
          {filtrado && (
            <Link
              href="/hacienda/eventos"
              className="text-[13px] font-medium text-campo hover:underline"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {res.data.length ? (
        <Table minWidth={860}>
          <thead>
            <tr>
              <Th className="w-[112px]">Fecha</Th>
              <Th>Evento</Th>
              <Th className="w-[220px]">Cargó</Th>
              <Th className="w-[200px]">Registro</Th>
              <Th className="w-[48px]">
                <span className="sr-only">Abrir</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((e, i) => {
              const mes = (e.ocurrido_en ?? "").slice(0, 7);
              const nuevoMes =
                mes !== (res.data[i - 1]?.ocurrido_en ?? "").slice(0, 7);
              const resumen =
                e.tipo === "hacienda.identificacion" && e.resumen
                  ? resumenIdentificacion(e.resumen)
                  : e.resumen;
              return (
                <Fragment key={e.id}>
                  {nuevoMes && (
                    <tr>
                      <td
                        colSpan={5}
                        className="border-b border-border bg-base px-5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted"
                      >
                        {mesLargo(mes)}
                      </td>
                    </tr>
                  )}
                  <Tr>
                    <Td className="whitespace-nowrap tabular-nums text-muted">
                      {fecha(e.ocurrido_en)}
                    </Td>
                    <Td>
                      <Link
                        href={`/hacienda/eventos/${e.id}`}
                        className="group flex items-center gap-3"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-monte">
                          <EventoIcono tipo={e.tipo} size={18} />
                        </span>
                        <span
                          className={
                            e.anulado ? "min-w-0 opacity-60" : "min-w-0"
                          }
                        >
                          <span
                            className={`block font-semibold text-ink group-hover:underline ${e.anulado ? "line-through" : ""}`}
                          >
                            {e.tipo_nombre ?? e.tipo}
                          </span>
                          {resumen && (
                            <span className="block truncate text-[13px] text-muted">
                              {resumen}
                            </span>
                          )}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      {e.autor?.nombre && (
                        <span className="flex items-center gap-2 text-[13px]">
                          <Avatar name={e.autor.nombre} size={24} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {e.autor.nombre}
                            </span>
                            {e.autor.rol && (
                              <span className="block text-[12px] text-muted">
                                {ROL_LABEL[
                                  e.autor.rol as keyof typeof ROL_LABEL
                                ] ?? e.autor.rol}
                              </span>
                            )}
                          </span>
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <TrustInline nivel={e.confianza ?? "declarado"} />
                        {e.anulado && <Badge tone="danger">Anulado</Badge>}
                        {!e.anulado && (e.version ?? 1) > 1 && (
                          <Badge tone="info">Corregido · v{e.version}</Badge>
                        )}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/hacienda/eventos/${e.id}`}
                        aria-label={`Abrir ${e.tipo_nombre ?? "evento"}`}
                        className="grid h-8 w-8 place-items-center rounded-[8px] text-subtle hover:bg-base hover:text-ink"
                      >
                        <IconChevronRight size={18} />
                      </Link>
                    </Td>
                  </Tr>
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<IconList size={24} />}
          title={
            filtrado
              ? "Ningún evento coincide con estos filtros"
              : "Todavía no hay eventos registrados"
          }
          description={
            filtrado
              ? "Probá con otro tipo o ampliá las fechas."
              : "Cada ingreso, venta, traslado, vacuna o tacto que se cargue, desde la web o desde la manga, aparece acá con quién lo cargó."
          }
          action={
            filtrado ? (
              <Link
                href="/hacienda/eventos"
                className={buttonClass("outline", "md")}
              >
                Ver todos
              </Link>
            ) : ctx.can("hacienda.crear") ? (
              <Link
                href="/hacienda/eventos/nuevo"
                className={buttonClass("primary", "md")}
              >
                <IconPlus size={18} /> Registrar evento
              </Link>
            ) : undefined
          }
        />
      )}

      {(res.meta?.prev_cursor || res.meta?.next_cursor) && (
        <nav
          aria-label="Páginas"
          className="flex items-center justify-between border-t border-border px-5 py-3"
        >
          {res.meta?.prev_cursor ? (
            <Link
              href={href(f, { cursor: res.meta.prev_cursor })}
              className={buttonClass("ghost", "sm")}
            >
              <IconArrowLeft size={16} /> Más nuevos
            </Link>
          ) : (
            <span />
          )}
          {res.meta?.next_cursor && (
            <Link
              href={href(f, { cursor: res.meta.next_cursor })}
              className={buttonClass("ghost", "sm")}
            >
              Más viejos <IconArrowRight size={16} />
            </Link>
          )}
        </nav>
      )}
    </Card>
  );
}

async function AccionRegistrar() {
  const ctx = await requireContexto();
  if (!ctx.can("hacienda.crear")) return null;
  return (
    <Link
      href="/hacienda/eventos/nuevo"
      className={buttonClass("primary", "md")}
    >
      <IconPlus size={18} /> Registrar evento
    </Link>
  );
}

/** Registro de eventos del establecimiento (TPA-22): append-only, con autor, rol y nivel de confianza. */
export default function EventosPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        title="Hacienda"
        subtitle="Todo lo que pasó en el campo, en orden. Nada se borra: las correcciones y anulaciones quedan a la vista."
        actions={
          <Suspense fallback={null}>
            <AccionRegistrar />
          </Suspense>
        }
      />
      <HaciendaTabs activo="eventos" />
      <Suspense
        fallback={
          <div className="h-[560px] rounded-[var(--radius-card)] border border-border bg-surface" />
        }
      >
        <Registro searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
