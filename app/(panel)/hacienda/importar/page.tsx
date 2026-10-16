import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, CardBody, CardHeader, EmptyState, Notice, PageHeader, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconBuffalo, IconCow, IconDownload, IconList, IconLock } from "@/components/icons";
import { SubirPlanilla } from "@/components/panel/importar/subir";
import { requireContexto } from "@/lib/establecimiento";
import { getEstablecimiento } from "@/lib/data/establecimientos";
import { getCatalogos } from "@/lib/data/catalogos";
import { getImportacion, importacionPendienteId } from "@/lib/data/importaciones";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Cargar stock por planilla" };

type SP = { cancelada?: string };

const PASOS = [
  { n: 1, t: "Descargá la plantilla", d: "Una fila por animal" },
  { n: 2, t: "Subí la planilla", d: "CSV o Excel" },
  { n: 3, t: "Revisá y corregí", d: "Errores fila por fila" },
  { n: 4, t: "Confirmá", d: "Se registra cada ingreso" },
];

function Pasos() {
  return (
    <ol className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border md:grid-cols-4">
      {PASOS.map((p) => (
        <li key={p.n} className="flex items-center gap-3 bg-surface px-4 py-3">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${p.n <= 2 ? "bg-monte text-blanco" : "bg-surface-2 text-muted"}`}>{p.n}</span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-ink">{p.t}</span>
            <span className="block text-[12px] text-muted">{p.d}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  if (!ctx.can("importaciones.gestionar")) {
    return (
      <Card>
        <EmptyState
          icon={<IconLock size={24} />}
          title="Tu rol no permite importar hacienda"
          description="La carga inicial por planilla la hacen el dueño y la administración. Pedile a alguno de ellos que la suba, o cargá los animales desde la app en la manga."
          action={
            <Link href="/hacienda" className={buttonClass("outline", "md")}>
              Volver a Hacienda
            </Link>
          }
        />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const [sp, e, cat, pendienteId] = await Promise.all([searchParams, getEstablecimiento(est).catch(() => null), getCatalogos(), importacionPendienteId(est)]);
  const pendiente = pendienteId ? await getImportacion(est, pendienteId).catch(() => null) : null;
  await connection();
  const especies = (e?.especies?.length ? e.especies : ["BUB", "BOV"]) as Array<"BOV" | "BUB">;
  const ordenadas = (["BUB", "BOV"] as const).filter((x) => especies.includes(x));
  const catDe = (esp: string) =>
    cat.categorias
      .filter((c) => c.especie === esp)
      .map((c) => c.nombre ?? c.codigo)
      .join(", ");

  const COLS: Array<{ col: string; req?: boolean; valores: string }> = [
    { col: "especie", req: true, valores: "BUB o BOV (también «búfalo», «bovino»)" },
    { col: "sexo", req: true, valores: "H (hembra) o M (macho)" },
    ...ordenadas.map((x) => ({ col: "categoria", req: true, valores: `${x === "BUB" ? "Bubalinos" : "Bovinos"}: ${catDe(x)}` })),
    { col: "raza", valores: "Nombre de la raza (ej. Murrah, Braford)" },
    { col: "caravana · caravana_oficial · tatuaje · marca", valores: "Como figuran en el animal. No se pueden repetir" },
    { col: "rfid", valores: "15 dígitos" },
    { col: "fecha_nacimiento", valores: "AAAA-MM-DD o DD/MM/AAAA" },
    { col: "nacimiento_estimado · castrado", valores: "si / no" },
    { col: "denticion", valores: "leche, 2, 4 o 6+" },
    { col: "lote · potrero", valores: "Nombre exacto como está en TROPILLA" },
    { col: "senas", valores: "Texto libre" },
  ];

  return (
    <>
      {sp.cancelada && (
        <div className="mb-5">
          <Notice tone="info" title="Cancelaste la importación">No se cargó ningún animal. Podés corregir la planilla en tu computadora y subirla de nuevo.</Notice>
        </div>
      )}
      {pendiente && (pendiente.estado === "validada" || pendiente.estado === "con_errores" || pendiente.estado === "validando" || pendiente.estado === "subida") && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-info-border bg-info-bg px-4 py-3 text-sm text-info">
          <p>
            <span className="font-semibold">Tenés una planilla sin confirmar</span> · subida el {fechaHora(pendiente.created_at)} ·{" "}
            <span className="tabular-nums">{pendiente.filas_total ?? 0}</span> filas
          </p>
          <Link href={`/hacienda/importar/${pendiente.id}`} className={buttonClass("outline", "sm")}>
            Seguir revisando <IconArrowRight size={16} />
          </Link>
        </div>
      )}
      <Pasos />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="1 · Descargá la plantilla" description="Ya trae los encabezados y una fila de ejemplo que podés borrar." />
            <ul className="divide-y divide-border">
              {ordenadas.map((x) => (
                <li key={x} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">{x === "BUB" ? <IconBuffalo size={22} /> : <IconCow size={22} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">Plantilla {x === "BUB" ? "bubalinos" : "bovinos"}</span>
                    <span className="block text-[13px] text-muted">plantilla-stock-{x === "BUB" ? "bubalinos" : "bovinos"}.csv · se abre con Excel, Google Sheets o LibreOffice</span>
                  </span>
                  <a href={`/hacienda/importar/plantilla?especie=${x}`} download className={buttonClass("outline", "sm")}>
                    <IconDownload size={16} /> Descargar
                  </a>
                </li>
              ))}
            </ul>
            <p className="rounded-b-[var(--radius-card)] border-t border-border bg-base px-5 py-3 text-[12.5px] text-muted">
              ¿Bovinos y búfalos juntos? Usá cualquiera de las dos: la columna «especie» manda. Al guardar desde Excel elegí «Libro de Excel (.xlsx)» o «CSV UTF-8» para no perder las tildes.
            </p>
          </Card>

          <Card>
            <CardHeader title="2 · Subí la planilla completa" description="La revisamos fila por fila y te mostramos qué corregir antes de cargar nada." />
            <CardBody>
              <SubirPlanilla especies={ordenadas} />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="Qué va en cada columna" description="Sólo especie, sexo y categoría son obligatorias." />
            <dl className="divide-y divide-border">
              {COLS.map((c, i) => (
                <div key={`${c.col}-${i}`} className="px-5 py-2.5">
                  <dt className="flex items-center gap-2 font-mono text-[12.5px] font-medium text-ink">
                    {c.col}
                    {c.req && <span className="rounded-[var(--radius-chip)] bg-surface-2 px-1.5 font-sans text-[11px] font-semibold text-muted">Obligatoria</span>}
                  </dt>
                  <dd className="mt-0.5 text-[13px] leading-snug text-muted">{c.valores}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardBody className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">
                <IconList size={20} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">¿Todavía sin caravanas?</p>
                <p className="mt-0.5 text-[13.5px] text-muted">Cargá la hacienda por cantidades en un lote («190 búfalas, 95 bucerros») y la identificás de a poco en la manga.</p>
                <Link href="/hacienda/lotes/nuevo" className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-campo hover:underline">
                  Crear lote por cantidades <IconArrowRight size={15} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

/** Carga inicial de stock por planilla (TPA-21): plantilla, subida y referencia de columnas. */
export default function ImportarPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <Link href="/hacienda" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Hacienda
      </Link>
      <PageHeader title="Cargar stock por planilla" subtitle="Subí la hacienda que ya tenés en una sola vez. Cada animal entra con su evento de ingreso." />
      <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
