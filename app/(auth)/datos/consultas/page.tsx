import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DatosShell } from "@/components/datos/shell";
import { Badge, Card, CardHeader, EmptyState, Spinner, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { IconDownload, IconList, IconSearch } from "@/components/icons";
import { getToken } from "@/lib/session";
import { getConsultas, getContextoAgregados } from "@/lib/data/agregados";
import { ESPECIES_AGREGADOS, METRICAS, trimestre, type MetricaCodigo } from "@/lib/agregados";
import { fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Consultas registradas" };

type SP = Promise<{ licencia?: string; cursor?: string }>;

export default function Page({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-muted"><Spinner /></div>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

/** Registro inmutable de consultas (TPA-75): el cliente ve las de su licencia; el equipo, todas. */
async function Contenido({ searchParams }: { searchParams: SP }) {
  if (!(await getToken())) redirect("/ingresar?next=/datos/consultas");
  const ctx = await getContextoAgregados();
  if (!ctx.acceso) redirect("/datos");
  const sp = await searchParams;
  const licencia = ctx.licencias.find((l) => l.id === sp.licencia)?.id ?? (ctx.es_staff ? undefined : ctx.licencias[0]?.id);
  const { data, meta } = await getConsultas(licencia, sp.cursor);
  const p = (x: Record<string, unknown>) => x as { metrica?: MetricaCodigo; especie?: "BOV" | "BUB"; geo?: string; escala?: boolean; desde?: string; hasta?: string };

  return (
    <DatosShell actual="consultas" esStaff={ctx.es_staff}>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Consultas registradas</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-muted">
          {ctx.es_staff && !licencia
            ? "Todas las consultas y exportaciones de todas las licencias, incluidas las vistas previas del equipo."
            : "Cada consulta y exportación de tu licencia queda registrada con quién la hizo, qué recorte pidió y cuántas celdas se reservaron. El registro no se puede editar ni borrar."}
        </p>
      </div>
      <Card>
        <CardHeader title={`${nf.format(data.length)} consultas${meta?.next_cursor ? " (hay más)" : ""}`} />
        {data.length ? (
          <Table minWidth={920}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Quién</Th>
                {ctx.es_staff && <Th>Licencia</Th>}
                <Th>Recorte</Th>
                <Th numeric>Celdas</Th>
                <Th numeric>Reservadas</Th>
                <Th>Política</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => {
                const q = p(c.parametros);
                return (
                  <Tr key={c.id}>
                    <Td className="whitespace-nowrap tabular-nums">{fechaHora(c.created_at)}</Td>
                    <Td>
                      <p>{c.usuario.nombre}</p>
                      <p className="mt-0.5">
                        <Badge icon={c.tipo === "exportacion" ? <IconDownload size={12} /> : <IconSearch size={12} />}>{c.tipo === "exportacion" ? "Exportación CSV" : "Consulta"}</Badge>
                      </p>
                    </Td>
                    {ctx.es_staff && <Td>{c.cliente?.nombre ?? <span className="text-muted">Vista previa del equipo</span>}</Td>}
                    <Td>
                      <p>{q.metrica ? METRICAS[q.metrica].label : "—"} · {q.especie ? ESPECIES_AGREGADOS[q.especie] : ""}</p>
                      <p className="text-[12.5px] text-muted">
                        {q.desde && q.hasta ? `${trimestre(q.desde, true)} a ${trimestre(q.hasta, true)}` : ""} · {q.geo === "nea" ? "Total NEA" : "Por provincia"}
                        {q.escala ? " · por escala" : ""}
                      </p>
                    </Td>
                    <Td numeric>{nf.format(c.celdas)}</Td>
                    <Td numeric>{nf.format(c.suprimidas)}</Td>
                    <Td className="tabular-nums">v{c.politica_version}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<IconList size={22} />} title="Todavía no hay consultas" description="Cuando alguien consulte el tablero o exporte un CSV, va a aparecer acá." action={<Link href="/datos" className={buttonClass("outline")}>Ir al tablero</Link>} />
        )}
        {meta?.next_cursor && (
          <div className="border-t border-border px-5 py-3">
            <Link prefetch={false} href={`/datos/consultas?${new URLSearchParams({ ...(licencia ? { licencia } : {}), cursor: meta.next_cursor })}`} className={buttonClass("outline", "sm")}>
              Ver anteriores
            </Link>
          </div>
        )}
      </Card>
    </DatosShell>
  );
}
