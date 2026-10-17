import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DatosShell } from "@/components/datos/shell";
import { LeyendaMotivos, TablaCubo } from "@/components/datos/cubo";
import { Badge, Button, Card, CardBody, CardHeader, DataList, EmptyState, KpiCard, Notice, Select, Spinner, buttonClass, cx } from "@/components/ui";
import { IconChart, IconDownload, IconLock, IconSearch, IconShieldCheck, IconClock } from "@/components/icons";
import { getToken } from "@/lib/session";
import { getContextoAgregados, getTablero, queryTablero, type Contexto, type Licencia } from "@/lib/data/agregados";
import { ESPECIES_AGREGADOS, METRICAS, TIPOS_CLIENTE, trimestre, type MetricaCodigo } from "@/lib/agregados";
import { fecha, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Tablero agregado" };

type SP = Promise<Record<string, string | undefined>>;

export default function Page({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

function Cargando() {
  return (
    <div className="grid min-h-dvh place-items-center bg-base text-muted">
      <span className="inline-flex items-center gap-2 text-sm">
        <Spinner /> Cargando el tablero…
      </span>
    </div>
  );
}

async function Contenido({ searchParams }: { searchParams: SP }) {
  if (!(await getToken())) redirect("/ingresar?next=/datos");
  const ctx = await getContextoAgregados();
  if (!ctx.acceso) {
    return (
      <DatosShell actual="tablero" esStaff={false}>
        <Card>
          <EmptyState
            icon={<IconLock size={22} />}
            title="Tu cuenta no tiene una licencia de datos agregados"
            description="El tablero es para organizaciones con un acuerdo de uso firmado con TROPILLA: finalidad declarada, métricas habilitadas y compromiso de no reidentificar establecimientos. Si tu organización ya lo firmó, pedí que te sumen como integrante."
            action={
              <Link href="/es" className={buttonClass("outline")}>
                Volver a TROPILLA
              </Link>
            }
          />
        </Card>
      </DatosShell>
    );
  }

  const sp = await searchParams;
  const licencia = ctx.licencias.find((l) => l.id === sp.licencia) ?? ctx.licencias[0] ?? null;
  const habilitadas = (licencia?.metricas ?? Object.keys(METRICAS)) as MetricaCodigo[];
  const metrica = (habilitadas.includes(sp.metrica as MetricaCodigo) ? sp.metrica : habilitadas[0]) as MetricaCodigo;
  const especie = sp.especie === "BUB" ? "BUB" : "BOV";
  const geo = sp.geo === "nea" ? "nea" : "provincia";
  const escala = sp.escala === "1" && ctx.politica.desglose_escala;
  const ultimos = ctx.trimestres.slice(-4);
  const desde = ctx.trimestres.includes(sp.desde ?? "") ? sp.desde! : ultimos[0];
  const hasta = ctx.trimestres.includes(sp.hasta ?? "") ? sp.hasta! : ultimos[ultimos.length - 1];
  const params = { cliente: licencia?.id, metrica, especie, geo, escala, desde, hasta };
  const resultado = sp.consultar === "1" ? await getTablero(params) : null;
  const data = resultado && "data" in resultado ? resultado.data : null;
  const cupoRestante = data?.consulta.cupo_restante ?? (licencia ? Math.max(0, licencia.cupo_diario - licencia.consultas_hoy) : null);

  return (
    <DatosShell actual="tablero" esStaff={ctx.es_staff}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Tablero agregado</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-muted">
            Tendencias por zona y trimestre sin acceso a fichas: solo se publican celdas con al menos {ctx.politica.k_minimo} establecimientos y sin un aportante dominante.
          </p>
        </div>
        <Badge tone="warning" icon={<IconChart size={13} />}>
          Datos sintéticos
        </Badge>
      </div>

      <div className="mb-6">
        <Notice tone="warning" title="Ningún número de esta página corresponde a un establecimiento real">
          {ctx.aviso} Dataset {ctx.dataset_version}.
        </Notice>
      </div>

      {ctx.licencias.length > 1 && (
        <nav aria-label="Licencia" className="mb-4 inline-flex flex-wrap gap-1 rounded-[10px] bg-surface-2 p-1">
          {ctx.licencias.map((l) => (
            <Link
              key={l.id}
              href={`/datos?licencia=${l.id}`}
              prefetch={false}
              aria-current={l.id === licencia?.id ? "page" : undefined}
              className={cx("inline-flex h-8 items-center rounded-[7px] px-3 text-[13px] font-medium", l.id === licencia?.id ? "bg-surface text-ink ring-1 ring-border" : "text-muted hover:text-ink")}
            >
              {l.nombre}
            </Link>
          ))}
        </nav>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="self-start">
          <CardHeader title="Qué querés analizar" description="Cada consulta usa una del cupo diario y queda registrada con tu usuario." />
          <CardBody>
            <form action="/datos" method="get" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {licencia && <input type="hidden" name="licencia" value={licencia.id} />}
              <input type="hidden" name="consultar" value="1" />
              <fieldset className="sm:col-span-2 xl:col-span-3">
                <legend className="mb-1.5 text-[13px] font-semibold text-ink">Métrica</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(METRICAS) as MetricaCodigo[]).map((m) => {
                    const ok = habilitadas.includes(m);
                    return (
                      <label
                        key={m}
                        className={cx(
                          "flex gap-2.5 rounded-[10px] border p-3",
                          ok ? "cursor-pointer border-border has-[:checked]:border-campo has-[:checked]:bg-campo-50" : "border-border bg-surface-2 opacity-70",
                        )}
                      >
                        <input type="radio" name="metrica" value={m} defaultChecked={m === metrica} disabled={!ok} className="mt-1 accent-monte" />
                        <span>
                          <span className="block text-sm font-semibold text-ink">{METRICAS[m].label}</span>
                          <span className="mt-0.5 block text-[12.5px] text-muted">{ok ? METRICAS[m].detalle : "No incluida en tu licencia."}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <Campo label="Especie" id="especie">
                <Select id="especie" name="especie" defaultValue={especie}>
                  {Object.entries(ESPECIES_AGREGADOS).map(([c, n]) => (
                    <option key={c} value={c}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo label="Zona" id="geo">
                <Select id="geo" name="geo" defaultValue={geo}>
                  <option value="provincia">NEA y cada provincia</option>
                  <option value="nea">Solo total NEA</option>
                </Select>
              </Campo>
              <Campo label="Escala" id="escala" hint={ctx.politica.desglose_escala ? undefined : "La política vigente no permite desglosar por escala."}>
                <Select id="escala" name="escala" defaultValue={escala ? "1" : "0"} disabled={!ctx.politica.desglose_escala}>
                  <option value="0">Sin desglose</option>
                  <option value="1">Por escala del establecimiento</option>
                </Select>
              </Campo>
              <Campo label="Desde" id="desde">
                <Select id="desde" name="desde" defaultValue={desde}>
                  {ctx.trimestres.map((t) => (
                    <option key={t} value={t}>
                      {trimestre(t)}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo label="Hasta" id="hasta">
                <Select id="hasta" name="hasta" defaultValue={hasta}>
                  {ctx.trimestres.map((t) => (
                    <option key={t} value={t}>
                      {trimestre(t)}
                    </option>
                  ))}
                </Select>
              </Campo>
              <div className="flex items-end">
                <Button type="submit" icon={<IconSearch size={16} />} className="w-full" disabled={cupoRestante === 0}>
                  Consultar
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-5">
          {licencia ? <LicenciaCard licencia={licencia} cupoRestante={cupoRestante ?? 0} /> : <VistaPrevia />}
          <PoliticaCard ctx={ctx} />
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {sp.error_export && <Notice tone="danger" title="No se pudo exportar">{sp.error_export}</Notice>}
        {resultado && "error" in resultado && (
          <Notice tone={resultado.code === "cupo_consultas_agotado" ? "warning" : "danger"} title="No se pudo hacer la consulta">
            {resultado.error}
          </Notice>
        )}
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Celdas publicadas" value={nf.format(data.resumen.celdas! - data.resumen.suprimidas!)} icon={<IconChart size={20} />} />
              <KpiCard label="Celdas reservadas" value={nf.format(data.resumen.suprimidas ?? 0)} icon={<IconLock size={20} />} />
              <KpiCard label={data.consulta.cupo_diario ? `Consultas restantes hoy (de ${data.consulta.cupo_diario})` : "Vista previa del equipo (sin cupo)"} value={data.consulta.cupo_restante ?? "—"} icon={<IconClock size={20} />} />
              <KpiCard label="Política de divulgación aplicada" value={`v${data.politica.version}`} icon={<IconShieldCheck size={20} />} />
            </div>
            <Card>
              <CardHeader
                title={`${METRICAS[metrica].label} · ${ESPECIES_AGREGADOS[especie]}`}
                description={`${METRICAS[metrica].unidad} · ${trimestre(data.trimestres[0])} a ${trimestre(data.trimestres[data.trimestres.length - 1])}${data.desglose_escala ? " · por escala" : ""}`}
                action={
                  <a href={`/datos/exportar${queryTablero(params)}`} className={buttonClass("outline", "sm")} download>
                    <IconDownload size={15} /> Exportar CSV
                  </a>
                }
              />
              <TablaCubo data={data} />
              <div className="border-t border-border px-5 py-4">
                <LeyendaMotivos k={data.politica.k_minimo} p={data.politica.dominancia_max_pct} />
                <p className="mt-3 text-[12px] text-subtle">
                  Consulta {data.consulta.id} · dataset {data.consulta.dataset_version} · el CSV cuenta como otra consulta. Valores redondeados: establecimientos a 5, cabezas a {data.politica.redondeo_cabezas}, precios a $10/kg.
                </p>
              </div>
            </Card>
          </>
        ) : (
          !resultado && (
            <Card>
              <EmptyState
                icon={<IconSearch size={22} />}
                title="Elegí la métrica y el período, y consultá"
                description="El resultado es una tabla por zona y trimestre. Las celdas que podrían revelar a un establecimiento aparecen como «Reservada», con el motivo, y nunca se pueden despejar restando del total."
              />
            </Card>
          )
        )}
      </div>
    </DatosShell>
  );
}

function Campo({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

function LicenciaCard({ licencia, cupoRestante }: { licencia: Licencia; cupoRestante: number }) {
  return (
    <Card>
      <CardHeader title={licencia.nombre} description={TIPOS_CLIENTE[licencia.tipo]} action={<Badge tone="success" icon={<IconShieldCheck size={13} />}>Licencia activa</Badge>} />
      <CardBody className="space-y-4">
        <p className="text-[13.5px] leading-relaxed text-ink">{licencia.finalidad}</p>
        <DataList
          className="sm:grid-cols-2"
          items={[
            { label: "Contrato", value: licencia.contrato_version },
            { label: "Vigente hasta", value: licencia.vigente_hasta ? fecha(licencia.vigente_hasta) : "Sin vencimiento" },
            { label: "Consultas hoy", value: <span className="tabular-nums">{licencia.cupo_diario - cupoRestante} de {licencia.cupo_diario}</span> },
            { label: "Métricas", value: licencia.metricas.map((m) => METRICAS[m as MetricaCodigo].label).join(", ") },
          ]}
        />
      </CardBody>
    </Card>
  );
}

function VistaPrevia() {
  return (
    <Notice tone="info" title="Vista previa del equipo">
      Estás viendo el tablero sin licencia: no descuenta cupo, pero cada consulta queda registrada con tu usuario.
    </Notice>
  );
}

function PoliticaCard({ ctx }: { ctx: Contexto }) {
  return (
    <Card>
      <CardHeader title={`Cómo se protege · política v${ctx.politica.version}`} />
      <CardBody>
        <ul className="space-y-2.5 text-[13.5px] text-ink">
          <li className="flex gap-2"><IconShieldCheck size={16} className="mt-0.5 shrink-0 text-campo" />Mínimo {ctx.politica.k_minimo} establecimientos por celda.</li>
          <li className="flex gap-2"><IconShieldCheck size={16} className="mt-0.5 shrink-0 text-campo" />Ningún establecimiento aporta más del {ctx.politica.dominancia_max_pct} %.</li>
          <li className="flex gap-2"><IconShieldCheck size={16} className="mt-0.5 shrink-0 text-campo" />Zonas amplias, trimestres cerrados y escalas fijas: no hay filtros libres.</li>
          <li className="flex gap-2"><IconShieldCheck size={16} className="mt-0.5 shrink-0 text-campo" />Cabezas redondeadas a {ctx.politica.redondeo_cabezas}; tope de {ctx.politica.consultas_por_dia} consultas por día.</li>
        </ul>
        <p className="mt-3 text-[12.5px] text-muted">
          {ctx.opt_in_real_habilitado
            ? "El gate de gobernanza está aprobado; los datos reales requieren además el opt-in de cada productor y revisión legal."
            : "Los datos reales de productores siguen cerrados hasta aprobar el gate de gobernanza."}
        </p>
      </CardBody>
    </Card>
  );
}
