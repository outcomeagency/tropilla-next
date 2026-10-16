import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Button, Card, CardHeader, EmptyState, FilterTabs, PageHeader, SpeciesChip, cx } from "@/components/ui";
import { IconAlert, IconCalendar, IconChevronDown, IconPlus } from "@/components/icons";
import { CuandoBadge, ReproduccionTabs, precisionLabel } from "@/components/panel/reproduccion/vientres";
import { requireContexto } from "@/lib/establecimiento";
import { finDeMes, listPartos, mesNombre, sumarMes, type PartoCalendario } from "@/lib/data/reproduccion";
import { fecha, hoyAR, nf } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Calendario de partos" };

type SP = { mes?: string; especie?: string; vencidos?: string };

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function href(sp: SP, cambios: Partial<SP>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...cambios })) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/reproduccion/partos?${s}` : "/reproduccion/partos";
}

/** Días de la grilla del mes (lunes a domingo, con días de relleno de los meses vecinos). */
function grilla(ym: string): Array<{ iso: string; delMes: boolean }> {
  const [y, m] = ym.split("-").map(Number);
  const primero = new Date(Date.UTC(y, m - 1, 1));
  const offset = (primero.getUTCDay() + 6) % 7;
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const celdas = Math.ceil((offset + ultimo) / 7) * 7;
  return Array.from({ length: celdas }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, 1 - offset + i));
    return { iso: d.toISOString().slice(0, 10), delMes: d.getUTCMonth() === m - 1 };
  });
}

function diaLargo(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function Madre({ p }: { p: PartoCalendario }) {
  const a = p.animal;
  return (
    <Link href={`/hacienda/${a?.id}?tab=reproduccion`} className="font-semibold text-ink hover:text-campo hover:underline">
      {a?.identificacion_principal ?? "Sin caravana"}
    </Link>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  await connection();
  const est = ctx.activa.establecimiento_id;
  const hoy = hoyAR(new Date());
  const mes = sp.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes) ? sp.mes : hoy.slice(0, 7);
  const especie = sp.especie === "BOV" || sp.especie === "BUB" ? sp.especie : undefined;
  const puedeRegistrar = ctx.can("reproduccion.crear");

  const [delMes, vencidos] = await Promise.all([
    listPartos(est, { especie, desde: `${mes}-01`, hasta: finDeMes(mes) }),
    listPartos(est, { especie, vencidos: true }),
  ]);

  const porDia = new Map<string, PartoCalendario[]>();
  for (const p of delMes) {
    const k = p.fecha_probable_parto ?? "";
    porDia.set(k, [...(porDia.get(k) ?? []), p]);
  }
  const dias = [...porDia.keys()].sort();
  const celdas = grilla(mes);
  const soloVencidos = sp.vencidos === "1";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Mes" className="flex items-center gap-1">
          <Link href={href(sp, { mes: sumarMes(mes, -1) })} aria-label="Mes anterior" className="grid h-9 w-9 place-items-center rounded-[8px] border border-border-strong bg-surface text-ink hover:bg-surface-2">
            <IconChevronDown size={16} className="rotate-90" />
          </Link>
          <h2 className="min-w-[170px] text-center text-[17px] font-semibold capitalize text-ink">{mesNombre(mes)}</h2>
          <Link href={href(sp, { mes: sumarMes(mes, 1) })} aria-label="Mes siguiente" className="grid h-9 w-9 place-items-center rounded-[8px] border border-border-strong bg-surface text-ink hover:bg-surface-2">
            <IconChevronDown size={16} className="-rotate-90" />
          </Link>
          {mes !== hoy.slice(0, 7) && (
            <Link href={href(sp, { mes: undefined })} className="ml-2 text-[13px] font-medium text-campo hover:underline">
              Volver a hoy
            </Link>
          )}
        </nav>
        <FilterTabs
          label="Especie del calendario"
          items={[
            { href: href(sp, { especie: undefined }), label: "Todas", active: !especie },
            { href: href(sp, { especie: "BOV" }), label: "Bovinos", active: especie === "BOV" },
            { href: href(sp, { especie: "BUB" }), label: "Bubalinos", active: especie === "BUB" },
          ]}
        />
      </div>

      {vencidos.length > 0 && (
        <div id="vencidos" className={cx("mb-4 rounded-[var(--radius-card)] border border-danger-border bg-danger-bg px-5 py-4 text-danger", soloVencidos && "ring-2 ring-danger-border")}>
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <IconAlert size={18} />
            {vencidos.length} {vencidos.length === 1 ? "parto vencido" : "partos vencidos"}: más de 15 días desde la fecha probable sin parto registrado
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {vencidos.map((p) => (
              <li key={p.animal?.id} className="flex items-center gap-2 rounded-[8px] border border-danger-border bg-surface px-3 py-1.5 text-[13px] text-ink">
                <Madre p={p} />
                <span className="text-muted">FPP {fecha(p.fecha_probable_parto)}</span>
                {puedeRegistrar && (
                  <Link href={`/reproduccion/registrar?tipo=reproduccion.parto&animales=${p.animal?.id}`} className="font-medium text-campo hover:underline">
                    Registrar parto
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="self-start overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-surface-2">
            {DIAS.map((d) => (
              <span key={d} className="px-2 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celdas.map((c, i) => {
              const ps = porDia.get(c.iso) ?? [];
              const esHoy = c.iso === hoy;
              const hayVencido = ps.some((p) => p.vencido);
              const atrasado = !hayVencido && ps.length > 0 && c.iso < hoy;
              return (
                <div
                  key={c.iso}
                  className={cx(
                    "min-h-[92px] border-border p-1.5 sm:p-2",
                    i % 7 !== 6 && "border-r",
                    i < celdas.length - 7 && "border-b",
                    !c.delMes && "bg-base",
                  )}
                >
                  <span
                    className={cx(
                      "inline-grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12.5px] tabular-nums",
                      esHoy ? "bg-monte font-semibold text-blanco" : c.delMes ? "text-ink" : "text-subtle",
                    )}
                  >
                    {Number(c.iso.slice(8))}
                  </span>
                  {c.delMes && ps.length > 0 && (
                    <a
                      href={`#dia-${c.iso}`}
                      className={cx(
                        "mt-1 block rounded-[6px] border px-1.5 py-1 text-[11.5px] leading-tight hover:shadow-[var(--shadow-hover)]",
                        hayVencido ? "border-danger-border bg-danger-bg text-danger" : atrasado ? "border-warning-border bg-warning-bg text-warning" : "border-campo-50 bg-campo-50 text-monte",
                      )}
                    >
                      <span className="block font-semibold tabular-nums">
                        {ps.length} {ps.length === 1 ? "parto" : "partos"}
                      </span>
                      <span className="hidden truncate sm:block">{ps.map((p) => p.animal?.identificacion_principal ?? "s/c").join(" · ")}</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={`Partos de ${mesNombre(mes).split(" ")[0]}`}
            description={delMes.length ? `${nf.format(delMes.length)} ${delMes.length === 1 ? "hembra con fecha probable" : "hembras con fecha probable"} en el mes.` : undefined}
          />
          {dias.length === 0 ? (
            <EmptyState
              icon={<IconCalendar size={24} />}
              title="Sin partos probables este mes"
              description="Las fechas salen de los tactos y servicios registrados. Mirá los meses siguientes o registrá una sesión de tacto."
              action={
                <>
                  <Button href={href(sp, { mes: sumarMes(mes, 1) })} variant="outline">
                    Mes siguiente
                  </Button>
                  {puedeRegistrar && (
                    <Button href="/reproduccion/tacto" variant="ghost" icon={<IconPlus size={16} />}>
                      Sesión de tacto
                    </Button>
                  )}
                </>
              }
            />
          ) : (
            <ol className="divide-y divide-border">
              {dias.map((d) => (
                <li key={d} id={`dia-${d}`} className="scroll-mt-6 px-5 py-3.5">
                  <p className={cx("mb-2 text-[13px] font-semibold first-letter:uppercase", d === hoy ? "text-monte" : "text-muted")}>
                    {diaLargo(d)}
                    {d === hoy && " · hoy"}
                  </p>
                  <ul className="space-y-2">
                    {(porDia.get(d) ?? []).map((p) => (
                      <li key={p.animal?.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <Madre p={p} />
                        <SpeciesChip especie={especieDe(p.animal?.especie)} />
                        <span className="text-[12.5px] text-muted">
                          {p.animal?.categoria_nombre}
                          {p.animal?.lote?.nombre ? ` · ${p.animal.lote.nombre}` : ""}
                        </span>
                        <span className="ml-auto flex items-center gap-2">
                          <Badge tone="neutral">{precisionLabel(p.fpp_precision)}</Badge>
                          <CuandoBadge p={p} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

/** Calendario mensual de partos probables con aviso de vencidos (TPA-30). */
export default function PartosPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Reproducción" subtitle="Calendario de partos probables, mes por mes. La fecha sale del tacto o del servicio de cada hembra." />
      <ReproduccionTabs activo="partos" />
      <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
