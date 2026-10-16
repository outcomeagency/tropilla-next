import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Card, EmptyState, PageHeader, Spinner, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconArrowRight, IconCheckCircle, IconClose, IconCow, IconLock, IconUpload } from "@/components/icons";
import { AutoRefresh } from "@/components/panel/importar/auto-refresh";
import { RevisionImportacion } from "@/components/panel/importar/revision";
import { requireContexto } from "@/lib/establecimiento";
import { ApiError } from "@/lib/api";
import { getCatalogos } from "@/lib/data/catalogos";
import { listLotes, listPotrerosConArchivados } from "@/lib/data/potreros";
import { getImportacion, listFilas, type ImportacionFila } from "@/lib/data/importaciones";
import { COLUMNA_LABEL, type Columna } from "@/lib/planilla";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Revisar planilla" };

type SP = { confirmando?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Procesando({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Card>
      <div className="flex items-start gap-4 px-6 py-10 sm:px-8">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border border-border bg-crema text-campo">
          <Spinner size={22} />
        </span>
        <div className="max-w-[62ch]">
          <h2 className="text-[17px] font-semibold text-ink">{titulo}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{texto}</p>
          <AutoRefresh />
        </div>
      </div>
    </Card>
  );
}

const REVISAR = "Nada entra a la hacienda hasta que confirmes: corregí acá las filas con errores o descartalas.";

function ConTitulo({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={titulo} subtitle={subtitulo} />
      {children}
    </>
  );
}

function identDe(f: ImportacionFila): string {
  const ids = ((f.datos as { identificaciones?: Array<{ valor?: string }> } | undefined)?.identificaciones ?? []).map((i) => i.valor).filter(Boolean);
  return ids[0] ?? "Sin identificación";
}

async function Contenido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  if (!ctx.can("importaciones.gestionar")) {
    return (
      <Card>
        <EmptyState
          icon={<IconLock size={24} />}
          title="Tu rol no permite importar hacienda"
          description="La carga inicial por planilla la hacen el dueño y la administración."
        />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  let imp;
  try {
    imp = await getImportacion(est, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  await connection();

  if (imp.estado === "subida" || imp.estado === "validando") {
    return (
      <ConTitulo titulo="Revisar planilla" subtitulo={REVISAR}>
        <Procesando
          titulo="Estamos revisando la planilla"
          texto="Leemos fila por fila y buscamos errores: categorías, caravanas repetidas, lotes y potreros que no existen. Con unos cientos de animales tarda segundos."
        />
      </ConTitulo>
    );
  }
  if (sp.confirmando && imp.estado !== "confirmada" && imp.estado !== "cancelada") {
    return (
      <ConTitulo titulo="Importando hacienda">
        <Procesando
          titulo="Estamos cargando los animales"
          texto={`Se registra un ingreso por cada fila lista (${imp.filas_validas ?? 0}). No cierres esta página: cuando termine vas a ver el resultado.`}
        />
      </ConTitulo>
    );
  }

  if (imp.estado === "cancelada") {
    return (
      <ConTitulo titulo="Importación cancelada">
        <Card>
          <EmptyState
            icon={<IconClose size={24} />}
            title="Esta importación se canceló"
            description="No se cargó ningún animal de esta planilla. Si la corregiste, subila de nuevo."
            action={
              <Link href="/hacienda/importar" className={buttonClass("primary", "md")}>
                <IconUpload size={18} /> Subir otra planilla
              </Link>
            }
          />
        </Card>
      </ConTitulo>
    );
  }

  if (imp.estado === "confirmada") {
    const { filas } = await listFilas(est, id).catch(() => ({
      filas: [] as ImportacionFila[],
    }));
    const afuera = filas.filter((f) => f.accion === "descartar" || f.errores?.length);
    const n = imp.filas_validas ?? 0;
    return (
      <ConTitulo titulo="Importación terminada" subtitulo={`Planilla subida el ${fechaHora(imp.created_at)} · ${imp.filas_total ?? 0} filas.`}>
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col gap-5 px-6 py-8 sm:flex-row sm:items-start sm:px-8">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-success-bg text-success">
                <IconCheckCircle size={26} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
                  {n === 1 ? "Se cargó 1 animal" : `Se cargaron ${n.toLocaleString("es-AR")} animales`}
                </h2>
                <p className="mt-1 text-[15px] text-muted">
                  Cada uno quedó con su evento de ingreso por importación (registrado el {fechaHora(imp.confirmada_en)}, con tu usuario como autor). Ya aparecen
                  en Hacienda, en sus lotes y potreros.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/hacienda?orden=reciente" className={buttonClass("primary", "md")}>
                    <IconCow size={18} /> Ver la hacienda
                  </Link>
                  <Link href="/hacienda/importar" className={buttonClass("outline", "md")}>
                    Subir otra planilla
                  </Link>
                  <Link href="/inicio" className={buttonClass("ghost", "md")}>
                    Ir al inicio <IconArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </Card>
          {afuera.length > 0 && (
            <Card>
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">
                    {afuera.length === 1 ? "1 fila quedó afuera" : `${afuera.length} filas quedaron afuera`}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">No se cargaron. Si las necesitás, armá otra planilla sólo con estas filas.</p>
                </div>
              </header>
              <Table minWidth={560}>
                <thead>
                  <tr>
                    <Th className="w-20">Fila</Th>
                    <Th>Identificación</Th>
                    <Th>Motivo</Th>
                  </tr>
                </thead>
                <tbody>
                  {afuera.map((f) => (
                    <Tr key={f.numero}>
                      <Td className="tabular-nums text-muted">{f.numero}</Td>
                      <Td className="tabular-nums">{identDe(f)}</Td>
                      <Td>
                        {f.accion === "descartar" ? (
                          <Badge tone="neutral" icon={<IconClose size={13} />}>
                            Descartada
                          </Badge>
                        ) : (
                          <span className="flex items-start gap-1.5 text-[13.5px] text-danger">
                            <IconAlert size={14} className="mt-[3px] shrink-0" />
                            {(f.errores ?? []).map((e) => `${COLUMNA_LABEL[(e.campo ?? "fila") as Columna] ?? e.campo}: ${e.mensaje}`).join(" · ")}
                          </span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      </ConTitulo>
    );
  }

  // validada / con_errores → previsualización editable.
  const [{ filas, truncada }, cat, lotes, potreros] = await Promise.all([
    listFilas(est, id),
    getCatalogos(),
    listLotes(est).catch(() => []),
    listPotrerosConArchivados(est).catch(() => []),
  ]);
  const nombre = (x: { nombre?: string | null; codigo: string }) => x.nombre ?? x.codigo;
  return (
    <ConTitulo titulo="Revisar planilla" subtitulo={REVISAR}>
      <RevisionImportacion
        importacion={imp}
        filas={filas}
        truncada={truncada}
        nombres={{
          categoria: Object.fromEntries(cat.categorias.map((c) => [c.codigo, nombre(c)])),
          raza: Object.fromEntries(cat.razas.map((r) => [r.codigo, nombre(r)])),
          lote: Object.fromEntries(lotes.map((l) => [l.id ?? "", l.nombre ?? ""])),
          potrero: Object.fromEntries(potreros.map((p) => [p.id ?? "", p.nombre ?? ""])),
        }}
        categorias={cat.categorias.map((c) => ({
          codigo: c.codigo,
          nombre: nombre(c),
          especie: String(c.especie ?? ""),
        }))}
        razas={cat.razas
          .filter((r) => r.activa !== false)
          .map((r) => ({
            codigo: r.codigo,
            nombre: nombre(r),
            especie: String(r.especie ?? ""),
          }))}
        lotes={lotes.map((l) => ({
          codigo: l.id ?? "",
          nombre: l.nombre ?? "",
          especie: String(l.especie ?? ""),
        }))}
        potreros={potreros.map((p) => ({
          codigo: p.id ?? "",
          nombre: p.nombre ?? "",
        }))}
      />
    </ConTitulo>
  );
}

/** Revisión, corrección y confirmación de una planilla de stock (TPA-21). */
export default function ImportacionPage(props: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  return (
    <>
      <Link href="/hacienda/importar" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Cargar stock por planilla
      </Link>
      <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
