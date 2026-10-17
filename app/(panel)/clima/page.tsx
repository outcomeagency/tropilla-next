import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Notice, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconCheckCircle, IconCloud, IconExternal } from "@/components/icons";
import { AlertaClima, SEVERIDAD, TIPO_CLIMA } from "@/components/panel/clima/alerta-clima";
import { requireContexto } from "@/lib/establecimiento";
import { getClima, getReglasClima, type ClimaRegla } from "@/lib/data/clima";
import { alternarReglaClimaAction } from "@/lib/clima-actions";
import { fecha, fechaHora, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Clima y alertas" };

type SP = { ok?: string; error?: string };

const PRECISION: Record<string, string> = {
  establecimiento: "ubicación del establecimiento (redondeada a ~1 km)",
  departamento: "centro del departamento",
  provincia: "capital de la provincia (cargá el departamento o la ubicación para más precisión)",
  sin_ubicacion: "sin ubicación",
};

const ENSO: Record<string, string> = { el_nino: "El Niño", la_nina: "La Niña", neutral: "Neutral" };

const ERRORES: Record<string, string> = {
  permiso: "Tu rol no permite cambiar las reglas climáticas.",
  conexion: "No pudimos conectar con TROPILLA. Probá de nuevo.",
  api: "No se pudo guardar el cambio. Probá de nuevo.",
};

const num = (v?: number | null, sufijo = "") => (v == null ? "—" : `${nf.format(v)}${sufijo}`);

/** Umbrales legibles de una regla (los parámetros vienen como datos de la API). */
function umbrales(r: ClimaRegla): string {
  const p = r.parametros ?? {};
  switch (r.tipo) {
    case "lluvia":
      return `≥ ${p.mm_dia} mm en un día o ≥ ${p.mm_72h} mm en 72 h`;
    case "sequia":
      return `lluvia de ${p.ventana_dias} días ≤ ${p.anomalia_max_pct} % de lo normal y ≤ ${p.lluvia_pronostico_max_mm} mm pronosticados`;
    case "helada":
      return `mínima ≤ ${p.tmin_c} °C`;
    case "calor":
      return `THI ≥ ${p.thi_min} durante ${p.dias_consecutivos} días seguidos`;
    case "incendio":
      return `máx. ≥ ${p.tmax_c} °C, HR ≤ ${p.hr_min_max_pct} %, viento ≥ ${p.viento_kmh} km/h y ≤ ${p.lluvia_7d_max_mm} mm en 7 días`;
    case "enso":
      return `|ONI| ≥ ${p.oni_umbral}`;
    default:
      return Object.entries(p)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
  }
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const [ctx, sp] = await Promise.all([requireContexto(), searchParams]);
  const est = ctx.activa.establecimiento_id;
  const [r, reglas] = await Promise.all([getClima(est), getReglasClima(est)]);
  const puedeEditar = ctx.can("establecimiento.editar");

  if (r.estado !== "ok") {
    return (
      <Card>
        <EmptyState
          icon={<IconCloud size={24} />}
          title={r.estado === "sin_endpoint" ? "El clima todavía no está disponible" : "No pudimos traer el pronóstico"}
          description={r.estado === "sin_endpoint" ? "La API de este entorno aún no publica alertas climáticas." : `${r.mensaje} Probá de nuevo en unos minutos.`}
          action={<Button href="/clima">Reintentar</Button>}
        />
      </Card>
    );
  }

  const { clima } = r;
  const alertas = clima.alertas ?? [];
  const lluvia = clima.lluvia as { ventana_dias?: number; hasta?: string; acumulada_mm?: number; normal_mm?: number; anomalia_pct?: number; anios_referencia?: number } | null | undefined;
  const enso = clima.enso as { fase?: string; oni?: number; temporada?: string; anio?: number; fuente_url?: string } | null | undefined;

  return (
    <div className="space-y-4">
      {sp.ok && <Notice tone="success" title={`Regla ${sp.ok}. Las alertas se recalcularon.`} />}
      {sp.error && <Notice tone="danger" title={ERRORES[sp.error] ?? ERRORES.api} />}
      <Notice tone="info" title="Pronóstico, no certeza">
        {clima.aviso}
      </Notice>
      {(clima.errores ?? []).length > 0 && (
        <Notice tone="warning" title="Alguna fuente no respondió">
          {(clima.errores ?? []).map((e) => e.mensaje).filter((m, i, all) => all.indexOf(m) === i).join(" ")}
        </Notice>
      )}

      <Card>
        <CardHeader
          title="Alertas vigentes"
          description={`${clima.zona} · punto consultado: ${PRECISION[clima.precision ?? ""] ?? clima.precision} · calculado ${fechaHora(clima.calculado_en)}`}
        />
        {alertas.length ? (
          <ul>
            {alertas.map((a) => (
              <li key={a.id} className="border-b border-border last:border-b-0">
                <AlertaClima a={a} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<IconCheckCircle size={24} />}
            title="Sin alertas por ahora"
            description="El pronóstico no supera los umbrales configurados para tu zona. Las alertas nuevas también llegan como aviso a la app y al teléfono."
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Pronóstico diario" description="Open-Meteo, 16 días. A más días, más incertidumbre." />
          {(clima.pronostico ?? []).length ? (
            <Table minWidth={620}>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th numeric>Máx.</Th>
                  <Th numeric>Mín.</Th>
                  <Th numeric>Lluvia</Th>
                  <Th numeric>Prob.</Th>
                  <Th numeric>HR mín.</Th>
                  <Th numeric>Viento máx.</Th>
                </tr>
              </thead>
              <tbody>
                {(clima.pronostico ?? []).map((d) => (
                  <Tr key={d.fecha}>
                    <Td className="whitespace-nowrap tabular-nums">{fecha(d.fecha, true)}</Td>
                    <Td numeric>{num(d.tmax, " °C")}</Td>
                    <Td numeric>{num(d.tmin, " °C")}</Td>
                    <Td numeric>{num(d.lluvia_mm, " mm")}</Td>
                    <Td numeric>{num(d.prob_lluvia, " %")}</Td>
                    <Td numeric>{num(d.hr_min, " %")}</Td>
                    <Td numeric>{num(d.viento_max, " km/h")}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={<IconCloud size={24} />} title="Sin pronóstico" description="La fuente no respondió todavía. Se reintenta cada 6 horas." />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Lluvia acumulada" description="Reanálisis ERA5 (no es el pluviómetro de tu campo)." />
            <CardBody>
              {lluvia ? (
                <dl className="grid grid-cols-2 gap-3 text-[14px]">
                  <div>
                    <dt className="text-muted">Últimos {lluvia.ventana_dias} días</dt>
                    <dd className="text-[20px] font-semibold tabular-nums text-ink">{num(lluvia.acumulada_mm, " mm")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Promedio {lluvia.anios_referencia} años</dt>
                    <dd className="text-[20px] font-semibold tabular-nums text-ink">{num(lluvia.normal_mm, " mm")}</dd>
                  </div>
                  <div className="col-span-2 text-muted">
                    {num(lluvia.anomalia_pct, " %")} de lo normal, hasta el {fecha(lluvia.hasta)}.
                  </div>
                </dl>
              ) : (
                <p className="text-[14px] text-muted">Sin datos de lluvia observada por ahora.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="ENSO (El Niño / La Niña)" description="Señal estacional regional, no pronóstico local." />
            <CardBody>
              {enso ? (
                <p className="text-[14px] text-ink">
                  <span className="font-semibold">{ENSO[enso.fase ?? ""] ?? enso.fase}</span> · ONI {enso.oni} ({enso.temporada} {enso.anio}).{" "}
                  <a href={enso.fuente_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-campo hover:underline">
                    NOAA CPC <IconExternal size={13} />
                  </a>
                </p>
              ) : (
                <p className="text-[14px] text-muted">Sin dato ENSO por ahora.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Reglas y umbrales"
          description="Umbrales iniciales orientativos, a validar con tu asesor. Las alertas avisan qué revisar; no son indicaciones de manejo."
        />
        {reglas.length ? (
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>Regla</Th>
                <Th>Se activa si</Th>
                <Th>Horizonte</Th>
                <Th>Severidad</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {reglas.map((g) => (
                <Tr key={g.codigo}>
                  <Td className="font-medium">
                    {g.nombre}
                    <span className="block text-[12px] font-normal text-muted">{TIPO_CLIMA[g.tipo ?? ""] ?? g.tipo}</span>
                  </Td>
                  <Td className="text-muted">{umbrales(g)}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{g.parametros?.horizonte_dias} días</Td>
                  <Td>{SEVERIDAD[g.severidad ?? ""]?.label ?? g.severidad}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={g.activa ? "success" : "neutral"}>{g.activa ? "Activa" : "Desactivada"}</Badge>
                      {g.personalizada && <Badge tone="primary">Propia</Badge>}
                      {puedeEditar && (
                        <form action={alternarReglaClimaAction}>
                          <input type="hidden" name="codigo" value={g.codigo} />
                          <input type="hidden" name="activa" value={g.activa ? "0" : "1"} />
                          <Button type="submit" variant="outline" size="sm">
                            {g.activa ? "Desactivar" : "Activar"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <CardBody>
            <p className="text-[14px] text-muted">No pudimos traer las reglas.</p>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title="Fuentes" description="Gratuitas y sin clave. Cada alerta indica su fuente y la hora de los datos." />
        <ul>
          {(clima.fuentes ?? []).map((f) => (
            <li key={f.nombre} className="border-b border-border px-5 py-3 text-[14px] last:border-b-0">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-campo hover:underline">
                {f.nombre} <IconExternal size={13} />
              </a>
              <span className="block text-[12.5px] text-muted">
                {f.licencia} · {f.cadencia}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** Clima y alertas por establecimiento (TPA-70). */
export default function ClimaPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Clima y alertas" subtitle="Pronóstico y riesgos climáticos para la zona del establecimiento." actions={<Button href="/clima/escenarios" variant="outline">Escenarios a 6 meses</Button>} />
      <Suspense
        fallback={
          <div className="space-y-4" aria-hidden="true">
            <div className="h-[64px] rounded-[10px] border border-border bg-surface" />
            <div className="h-[260px] rounded-[var(--radius-card)] border border-border bg-surface" />
          </div>
        }
      >
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
