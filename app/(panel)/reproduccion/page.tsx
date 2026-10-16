import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Button, Card, CardHeader, EmptyState, FilterTabs, KpiCard, PageHeader, SpeciesChip, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert, IconArrowRight, IconCalendar, IconChart, IconClock, IconHeart, IconPlus, IconSearch } from "@/components/icons";
import { CuandoBadge, ESTADOS_VIENTRE, PartosPorMes, ReproduccionTabs, VientresEspecie, precisionLabel } from "@/components/panel/reproduccion/vientres";
import { requireContexto } from "@/lib/establecimiento";
import { getTablero, listPartos, type PartoCalendario } from "@/lib/data/reproduccion";
import { fecha, hoyAR, nf } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Reproducción" };

type SP = { especie?: string };

const pf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Fila de un parto: madre, especie, FPP con su fuente, lote/potrero y acción. */
function FilaParto({ p, puedeRegistrar }: { p: PartoCalendario; puedeRegistrar: boolean }) {
  const a = p.animal;
  return (
    <Tr>
      <Td className="whitespace-nowrap">
        <span className="font-semibold tabular-nums">{fecha(p.fecha_probable_parto)}</span>
        <span className="block text-[12px] text-muted">{precisionLabel(p.fpp_precision)}</span>
      </Td>
      <Td>
        <Link href={`/hacienda/${a?.id}?tab=reproduccion`} className="font-semibold text-ink hover:text-campo hover:underline">
          {a?.identificacion_principal ?? "Sin caravana"}
        </Link>
        <span className="block text-[12.5px] text-muted">{a?.categoria_nombre}</span>
      </Td>
      <Td>
        <SpeciesChip especie={especieDe(a?.especie)} />
      </Td>
      <Td className="text-[13.5px]">
        {a?.lote?.nombre ?? <span className="text-muted">Sin lote</span>}
        {a?.potrero?.nombre && <span className="block text-[12.5px] text-muted">{a.potrero.nombre}</span>}
      </Td>
      <Td>
        <CuandoBadge p={p} />
      </Td>
      <Td className="text-right">
        {puedeRegistrar && (p.dias_para_parto ?? 1) <= 15 && (
          <Button href={`/reproduccion/registrar?tipo=reproduccion.parto&animales=${a?.id}`} variant="outline" size="sm">
            Registrar parto
          </Button>
        )}
      </Td>
    </Tr>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  await connection();
  const est = ctx.activa.establecimiento_id;
  const especie = sp.especie === "BOV" || sp.especie === "BUB" ? sp.especie : undefined;
  const hoy = hoyAR(new Date());
  const [tablero, vencidos, proximos] = await Promise.all([
    getTablero(est, especie),
    listPartos(est, { especie, vencidos: true }),
    listPartos(est, { especie, vencidos: false, desde: sumarDias(hoy, -15), hasta: sumarDias(hoy, 45) }),
  ]);
  const puedeRegistrar = ctx.can("reproduccion.crear");

  const suma = (k: "total_vientres" | "prenadas" | "partos_proximos" | "partos_vencidos" | "vacias") => tablero.reduce((s, t) => s + (t[k] ?? 0), 0);
  const total = suma("total_vientres");
  const prenadas = suma("prenadas");

  if (total === 0)
    return (
      <>
      <Tabs especie={especie} />
      <Card>
        <EmptyState
          icon={<IconHeart size={24} />}
          title={especie ? "No hay vientres de esta especie" : "Todavía no hay vientres para mostrar"}
          description="El tablero cuenta las hembras en edad reproductiva (vacas, vaquillonas, búfalas y bubillas). Cargá la hacienda y registrá un servicio o una sesión de tacto: TROPILLA calcula la fecha probable de parto con la gestación de cada especie y raza y arma el calendario."
          action={
            <>
              {puedeRegistrar && (
                <Button href="/reproduccion/tacto" icon={<IconPlus size={18} />}>
                  Sesión de tacto
                </Button>
              )}
              <Button href={especie ? "/reproduccion" : "/hacienda"} variant="outline">
                {especie ? "Ver todas las especies" : "Ir a Hacienda"}
              </Button>
            </>
          }
        />
      </Card>
      </>
    );

  const proximosOrden = proximos.filter((p) => !p.vencido).sort((a, b) => (a.fecha_probable_parto ?? "").localeCompare(b.fecha_probable_parto ?? ""));

  return (
    <>
      <Tabs especie={especie} />

      {vencidos.length > 0 && (
        <Card className="mb-4 border-danger-border">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-danger-border bg-danger-bg px-5 py-3.5 text-danger">
            <span className="flex items-start gap-2.5">
              <IconAlert size={20} className="mt-0.5 shrink-0" />
              <span>
                <span className="block text-[15px] font-semibold">
                  {vencidos.length} {vencidos.length === 1 ? "parto vencido sin registrar" : "partos vencidos sin registrar"}
                </span>
                <span className="block text-[13px] opacity-90">
                  Pasaron más de 15 días de la fecha probable. Registrá el parto o el aborto, o volvé a tactar si quedó vacía.
                </span>
              </span>
            </span>
          </header>
          <Table minWidth={820}>
            <tbody>
              {vencidos.map((p) => (
                <FilaParto key={p.animal?.id} p={p} puedeRegistrar={puedeRegistrar} />
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="vientres" value={nf.format(total)} icon={<IconHeart size={22} />} />
        <KpiCard
          label={`preñadas · ${pf.format(total ? (prenadas / total) * 100 : 0)} % de preñez`}
          value={nf.format(prenadas)}
          icon={<IconChart size={22} />}
          href={`/hacienda?estado_reproductivo=prenada${especie ? `&especie=${especie}` : ""}`}
        />
        <KpiCard label="partos en los próximos 15 días" value={nf.format(suma("partos_proximos"))} icon={<IconCalendar size={22} />} href="/reproduccion/partos" />
        <KpiCard label="partos vencidos" value={nf.format(suma("partos_vencidos"))} icon={<IconClock size={22} />} href="/reproduccion/partos?vencidos=1" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader title="Vientres por estado" description="Según el último servicio, tacto o parto registrado de cada hembra." />
          <div className="divide-y divide-border px-5 pb-3 pt-3">
            {tablero.map((t) => (
              <VientresEspecie key={t.especie} t={t} />
            ))}
          </div>
          <Table minWidth={420}>
            <thead>
              <tr>
                <Th>Estado</Th>
                {tablero.map((t) => (
                  <Th key={t.especie} numeric>
                    {t.especie === "BUB" ? "Bubalinos" : "Bovinos"}
                  </Th>
                ))}
                {tablero.length > 1 && <Th numeric>Total</Th>}
              </tr>
            </thead>
            <tbody>
              {ESTADOS_VIENTRE.filter((e) => e.key !== "sin_estado" || tablero.some((t) => (t.sin_estado ?? 0) > 0)).map((e) => (
                <Tr key={e.key}>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${e.bg}`} aria-hidden="true" />
                      {e.label}
                    </span>
                  </Td>
                  {tablero.map((t) => (
                    <Td key={t.especie} numeric>
                      {nf.format(t[e.key] ?? 0)}
                    </Td>
                  ))}
                  {tablero.length > 1 && (
                    <Td numeric className="font-semibold">
                      {nf.format(tablero.reduce((s, t) => s + (t[e.key] ?? 0), 0))}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Partos esperados por mes"
            description="Preñadas según el mes de su fecha probable de parto."
            action={
              <Link href="/reproduccion/partos" className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
                Calendario <IconArrowRight size={14} />
              </Link>
            }
          />
          <div className="px-5 pb-5 pt-5">
            {prenadas > 0 ? (
              <PartosPorMes tablero={tablero} mesActual={hoy.slice(0, 7)} />
            ) : (
              <p className="py-10 text-center text-[14px] text-muted">No hay preñadas con fecha probable de parto. Registrá un tacto para verlas acá.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Próximos partos"
          description="Fecha probable de parto de acá a 45 días, y las atrasadas dentro de la tolerancia de 15 días."
          action={
            <Button href="/reproduccion/partos" variant="outline" size="sm" icon={<IconCalendar size={16} />}>
              Ver calendario
            </Button>
          }
        />
        {proximosOrden.length ? (
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Fecha probable</Th>
                <Th>Madre</Th>
                <Th>Especie</Th>
                <Th>Lote / potrero</Th>
                <Th>Cuándo</Th>
                <Th>
                  <span className="sr-only">Acción</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {proximosOrden.map((p) => (
                <FilaParto key={p.animal?.id} p={p} puedeRegistrar={puedeRegistrar} />
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<IconSearch size={24} />}
            title="No hay partos en los próximos 45 días"
            description="Los más lejanos están en el calendario, mes por mes."
            action={
              <Button href="/reproduccion/partos" variant="outline">
                Abrir el calendario
              </Button>
            }
          />
        )}
      </Card>
    </>
  );
}

function Tabs({ especie }: { especie?: string }) {
  const filtro = (e?: string) => `/reproduccion${e ? `?especie=${e}` : ""}`;
  return (
    <ReproduccionTabs activo="tablero">
      <FilterTabs
        label="Especie"
        items={[
          { href: filtro(), label: "Todas", active: !especie },
          { href: filtro("BOV"), label: "Bovinos", active: especie === "BOV" },
          { href: filtro("BUB"), label: "Bubalinos", active: especie === "BUB" },
        ]}
      />
      <Link href="/reproduccion/reproductores" className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-ink hover:bg-base">Reproductores externos</Link>
    </ReproduccionTabs>
  );
}

/** Tablero de vientres: estados por especie, partos por mes y alertas de parto vencido (TPA-30). */
export default function ReproduccionPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        title="Reproducción"
        subtitle="Vientres por estado y partos que vienen, separados por especie."
        actions={
          <Suspense fallback={null}>
            <Acciones />
          </Suspense>
        }
      />
      <Suspense fallback={<div className="h-[700px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Acciones() {
  const ctx = await requireContexto();
  if (!ctx.can("reproduccion.crear")) return null;
  return (
    <>
      <Button href="/reproduccion/tacto" variant="outline">
        Sesión de tacto
      </Button>
      <Button href="/reproduccion/registrar" icon={<IconPlus size={18} />}>
        Registrar
      </Button>
    </>
  );
}
