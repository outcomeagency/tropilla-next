import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DatosShell } from "@/components/datos/shell";
import { PoliticaForm, RevisionForm } from "@/components/datos/forms";
import { Badge, Button, Card, CardBody, CardHeader, DataList, KpiCard, Notice, Spinner, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClock, IconDownload, IconList, IconSearch, IconShieldCheck } from "@/components/icons";
import { getToken } from "@/lib/session";
import { getGobernanza, getPrueba } from "@/lib/data/agregados";
import { ejecutarPruebaAction } from "@/lib/agregados-actions";
import { ACCIONES_BITACORA, ASPECTOS, ESTADO_ASPECTO, trimestre } from "@/lib/agregados";
import { fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Gobernanza de datos agregados" };

type SP = Promise<{ prueba?: string; error?: string }>;

export default function Page({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-muted"><Spinner /></div>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

/** Gobernanza (TPA-75), solo equipo: gate previo al opt-in real, prueba de reidentificación, política y bitácora. */
async function Contenido({ searchParams }: { searchParams: SP }) {
  if (!(await getToken())) redirect("/ingresar?next=/datos/gobernanza");
  const g = await getGobernanza();
  if (!g) redirect("/datos");
  const sp = await searchParams;
  const pruebaId = sp.prueba && /^[0-9a-f-]{36}$/.test(sp.prueba) ? sp.prueba : g.ultima_prueba?.id;
  const prueba = pruebaId ? await getPrueba(pruebaId).catch(() => null) : null;
  const aprobados = g.gate.aspectos.filter((a) => a.estado === "aprobado").length;
  const pruebaVigente = g.ultima_prueba?.politica_version === g.politica.version && g.ultima_prueba.resultado === "aprobada";

  return (
    <DatosShell actual="gobernanza" esStaff>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Gobernanza de datos agregados</h1>
        <p className="mt-1 max-w-[72ch] text-sm text-muted">
          Antes de sumar un solo dato real con opt-in, el equipo revisa la amenaza de reidentificación, los permisos, las cohortes y la auditoría bajo la política vigente.
        </p>
      </div>

      <div className="mb-6">
        {g.gate.habilita_opt_in_real ? (
          <Notice tone="success" title={`Gate aprobado para la política v${g.politica.version}`}>
            Se puede planificar el opt-in real de productores (consentimiento separado por propósito y revisión legal). Hasta que exista ese ticket, la fuente sigue siendo sintética.
          </Notice>
        ) : (
          <Notice tone="warning" title={`Opt-in real cerrado · ${aprobados} de 4 aspectos aprobados`}>
            El tablero funciona solo con el dataset sintético. Ningún dato de productores entra hasta aprobar los cuatro aspectos con la política vigente.
          </Notice>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aspectos aprobados del gate" value={`${aprobados}/4`} icon={<IconShieldCheck size={20} />} />
        <KpiCard label="Consultas en 30 días" value={nf.format(g.uso_30_dias.consultas ?? 0)} icon={<IconSearch size={20} />} />
        <KpiCard label="Exportaciones en 30 días" value={nf.format(g.uso_30_dias.exportaciones ?? 0)} icon={<IconDownload size={20} />} />
        <KpiCard label="Celdas reservadas (30 días)" value={`${g.uso_30_dias.suprimidas_pct ?? 0} %`} icon={<IconList size={20} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Gate previo al opt-in real" description={`Revisiones de la política v${g.politica.version}`} />
            <ul className="divide-y divide-border">
              {g.gate.aspectos.map((a) => {
                const e = ESTADO_ASPECTO[a.estado ?? "pendiente"];
                return (
                  <li key={a.aspecto} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{ASPECTOS[a.aspecto!].label}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{ASPECTOS[a.aspecto!].detalle}</p>
                      {a.nota && (
                        <p className="mt-2 text-[13.5px] text-ink">
                          «{a.nota}» <span className="text-muted">— {a.revisor}, {fechaHora(a.revisado_en)}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <Badge tone={e.tone} icon={a.estado === "aprobado" ? <IconCheckCircle size={13} /> : a.estado === "observado" ? <IconAlert size={13} /> : <IconClock size={13} />}>
                        {e.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border px-5 py-4">
              <RevisionForm pruebaAprobada={pruebaVigente} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Prueba de reidentificación"
              description="Ataca todo lo publicable con la política vigente: 3 métricas × 2 especies × 8 trimestres."
              action={
                <form action={ejecutarPruebaAction}>
                  <Button type="submit" size="sm">Correr prueba ahora</Button>
                </form>
              }
            />
            {sp.error === "prueba" && (
              <div className="px-5 pt-4">
                <Notice tone="danger" title="No se pudo correr la prueba. Probá de nuevo." />
              </div>
            )}
            {prueba ? (
              <>
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 text-[13.5px] text-muted">
                  <Badge tone={prueba.resultado === "aprobada" ? "success" : "danger"} icon={prueba.resultado === "aprobada" ? <IconCheckCircle size={13} /> : <IconAlert size={13} />}>
                    {prueba.resultado === "aprobada" ? "Aprobada" : "Fallida"}
                  </Badge>
                  <span>
                    Política v{prueba.politica_version} · {prueba.ejecutada_por} · {fechaHora(prueba.created_at)}
                  </span>
                  {prueba.politica_version !== g.politica.version && <Badge tone="warning">De una política anterior</Badge>}
                </div>
                <Table minWidth={680}>
                  <thead>
                    <tr>
                      <Th>Control</Th>
                      <Th numeric>Evaluadas</Th>
                      <Th numeric>Fallas</Th>
                      <Th numeric>Advertencias</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(prueba.controles ?? []).map((c) => (
                      <Tr key={c.codigo}>
                        <Td>
                          <p className="text-ink">{c.titulo}</p>
                          {c.mitigacion && <p className="mt-0.5 text-[12.5px] text-muted">{c.mitigacion}</p>}
                          {!!c.ejemplos?.length && <p className="mt-0.5 text-[12.5px] text-danger">Ej.: {c.ejemplos.join(" · ")}</p>}
                        </Td>
                        <Td numeric>{nf.format(c.evaluadas ?? 0)}</Td>
                        <Td numeric className={c.fallas ? "font-semibold text-danger" : ""}>{nf.format(c.fallas ?? 0)}</Td>
                        <Td numeric>{c.advertencias != null ? nf.format(c.advertencias) : "—"}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </>
            ) : (
              <CardBody>
                <p className="text-sm text-muted">Todavía no se corrió ninguna prueba. Es requisito para aprobar la amenaza de reidentificación.</p>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Bitácora" description="Cambios de política, licencias, integrantes, pruebas y revisiones. No se puede editar." />
            {g.bitacora.length ? (
              <Table minWidth={640}>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Acción</Th>
                    <Th>Quién</Th>
                    <Th>Licencia</Th>
                  </tr>
                </thead>
                <tbody>
                  {g.bitacora.map((b) => (
                    <Tr key={b.id}>
                      <Td className="whitespace-nowrap tabular-nums">{fechaHora(b.created_at)}</Td>
                      <Td>{ACCIONES_BITACORA[b.accion ?? ""] ?? b.accion}</Td>
                      <Td>{b.usuario}</Td>
                      <Td>{b.cliente ?? "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody>
                <p className="text-sm text-muted">Sin movimientos todavía.</p>
              </CardBody>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title={`Política vigente · v${g.politica.version}`} description={g.politica.nota ?? undefined} />
            <CardBody className="space-y-5">
              <DataList
                items={[
                  { label: "Mínimo por celda", value: `${g.politica.k_minimo} establecimientos` },
                  { label: "Dominancia máxima", value: `${g.politica.dominancia_max_pct} %` },
                  { label: "Redondeo de cabezas", value: `A ${g.politica.redondeo_cabezas}` },
                  { label: "Tope diario por licencia", value: `${g.politica.consultas_por_dia} consultas` },
                  { label: "Desglose por escala", value: g.politica.desglose_escala ? "Permitido" : "No permitido" },
                  { label: "Desde", value: fechaHora(g.politica.created_at) },
                ]}
              />
              <details className="rounded-[10px] border border-border">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">Publicar una nueva versión</summary>
                <div className="border-t border-border px-4 py-4">
                  <PoliticaForm actual={g.politica} />
                </div>
              </details>
              {g.politicas.length > 1 && (
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">Versiones anteriores</p>
                  <ul className="space-y-1.5 text-[13px] text-muted">
                    {g.politicas.slice(1).map((p) => (
                      <li key={p.version}>
                        v{p.version} · k {p.k_minimo} · {p.dominancia_max_pct} % · {fechaHora(p.created_at)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Dataset" description="Fuente única del prototipo" />
            <CardBody>
              <DataList
                items={[
                  { label: "Fuente", value: <Badge tone="warning">Sintético</Badge> },
                  { label: "Versión", value: g.dataset.version },
                  { label: "Establecimientos inventados", value: nf.format(g.dataset.establecimientos ?? 0) },
                  { label: "Filas", value: nf.format(g.dataset.filas ?? 0) },
                  {
                    label: "Período",
                    value: g.dataset.trimestres?.length ? `${trimestre(g.dataset.trimestres[0], true)} a ${trimestre(g.dataset.trimestres[g.dataset.trimestres.length - 1], true)}` : "—",
                  },
                ]}
              />
              <p className="mt-4 text-[12.5px] text-muted">
                Generado con semilla fija; no deriva de ningún dato cargado por productores. Incluye a propósito celdas chicas y un criadero dominante para ejercitar la supresión.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </DatosShell>
  );
}
