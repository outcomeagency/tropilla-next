import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireContexto } from "@/lib/establecimiento";
import { getEscenariosClimaticos, type DatosEscenarios } from "@/lib/data/escenarios-climaticos";
import { fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Escenarios climáticos" };

const tono: Record<string, string> = { verde: "border-success-border bg-success-bg text-success", amarillo: "border-warning-border bg-warning-bg text-warning", rojo: "border-danger-border bg-danger-bg text-danger", gris: "border-border bg-surface-2 text-muted" };

function LluviaChart({ datos }: { datos: DatosEscenarios }) {
  const serie = datos.fuentes.nasa_power?.serie?.PRECTOTCORR;
  const puntos = Object.entries(serie ?? {}).filter(([fecha, valor]) => /^\d{8}$/.test(fecha) && Number.isFinite(valor) && valor >= 0).slice(-180);
  const meses = new Map<string, number>();
  for (const [fecha, valor] of puntos) {
    const mes = `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}`;
    meses.set(mes, (meses.get(mes) ?? 0) + valor);
  }
  const filas = [...meses.entries()].slice(-6);
  const max = Math.max(1, ...filas.map(([, v]) => v));
  if (!filas.length) return <p className="text-sm text-muted">NASA POWER no entregó una serie de precipitación legible para este período.</p>;
  return (
    <figure aria-label="Precipitación mensual observada por NASA POWER">
      <div className="grid grid-cols-6 items-end gap-3 border-b border-border px-2 pb-2" role="img" aria-label="Barras de precipitación mensual en milímetros">
        {filas.map(([mes, mm]) => <div key={mes} className="flex h-36 flex-col items-center justify-end gap-2"><span className="text-xs tabular-nums text-muted">{Math.round(mm)} mm</span><div className="w-full rounded-t bg-campo" style={{ height: `${Math.max(4, (mm / max) * 88)}%` }} /><span className="text-xs text-muted">{mes}</span></div>)}
      </div>
      <figcaption className="mt-2 text-xs text-muted">Observaciones agregadas por mes; no son el pronóstico de los próximos meses. Coordenada aproximada por privacidad.</figcaption>
    </figure>
  );
}

async function Contenido() {
  const ctx = await requireContexto();
  const result = await getEscenariosClimaticos(ctx.activa.establecimiento_id);
  if (result.estado !== "ok") return <Card><CardBody><EmptyState icon={<span aria-hidden="true">◷</span>} title={result.estado === "calculando" ? "Estamos preparando el análisis" : result.estado === "sin_endpoint" ? "Escenarios todavía no disponibles" : "No pudimos cargar los escenarios"} description={result.estado === "error" ? result.mensaje : "La consulta se procesa en segundo plano con fuentes externas. Probá de nuevo en unos minutos."} /></CardBody></Card>;
  const { data } = result;
  return <div className="space-y-5">
    <Card><CardHeader title="Lectura del momento" description={`${data.zona} · actualizado ${fechaHora(data.emitido_en)}`} /><CardBody><p className="max-w-4xl text-sm leading-6 text-ink">{data.resumen}</p><p className="mt-3 text-xs leading-5 text-muted">{data.aviso}{result.actualizando ? " Se está preparando una actualización en segundo plano; mostramos el último análisis disponible." : ""}</p></CardBody></Card>
    <section aria-label="Escenarios a seis meses" className="grid gap-4 md:grid-cols-2">
      {data.escenarios.map((e) => <Card key={e.codigo}><CardBody><div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold text-ink">{e.titulo}</h2><span className={`rounded-md border px-2 py-1 text-xs font-semibold ${tono[e.nivel] ?? tono.gris}`}>{e.nivel === "gris" ? "Sin estimación" : e.nivel === "verde" ? "Sin señal destacada" : e.nivel === "rojo" ? "Señal alta" : "Para revisar"}</span></div><p className="mt-3 text-sm leading-6 text-muted">{e.descripcion}</p><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs"><div><dt className="text-muted">Horizonte</dt><dd className="mt-1 font-medium text-ink">{e.horizonte_meses[0]}–{e.horizonte_meses[1]} meses</dd></div><div><dt className="text-muted">Incertidumbre</dt><dd className="mt-1 font-medium text-ink">{e.incertidumbre}</dd></div></dl><p className="mt-3 text-xs leading-5 text-muted">{e.probabilidad_nota}</p></CardBody></Card>)}
    </section>
    <Card><CardHeader title="Lluvia observada" description="NASA POWER · acumulados mensuales recientes" /><CardBody><LluviaChart datos={data} /></CardBody></Card>
    <Card><CardHeader title="Opciones para evaluar" description={data.plan_respuesta[0]?.orientacion ?? "Son accesos a herramientas del ecosistema; la decisión queda en tus manos."} /><CardBody><ul className="grid gap-3 sm:grid-cols-2">{data.plan_respuesta.map((p) => <li key={p.relacion}><Link href={p.href} className="block rounded-lg border border-border p-4 text-sm font-medium text-campo hover:bg-surface-2">{p.accion}<span className="mt-1 block text-xs font-normal text-muted">{p.relacion} · Abrir herramienta →</span></Link></li>)}</ul></CardBody></Card>
    <Card><CardHeader title="Fuentes y límites" description="Fecha de consulta, cobertura y condiciones de uso." /><CardBody><ul className="space-y-3">{Object.entries(data.fuentes).map(([key, f]) => <li key={key} className="border-b border-border pb-3 last:border-0"><p className="text-sm font-medium text-ink">{f.fuente ?? key}: {f.estado ?? "consultado"}</p><p className="mt-1 text-xs text-muted">{f.mensaje ?? `Consultado ${f.consultado_en ? fechaHora(f.consultado_en) : "sin fecha"}. ${f.licencia ?? ""}`}</p>{f.periodos?.length ? <div className="mt-2 space-y-1 text-xs text-muted"><p>Probabilidades de fase ENSO del Pacífico (no son probabilidad de lluvia local):</p>{f.periodos.slice(0, 6).map((p) => <p key={p.temporada} className="tabular-nums">{p.temporada}: El Niño {p.probabilidades.el_nino_pct}% · neutral {p.probabilidades.neutral_pct}% · La Niña {p.probabilidades.la_nina_pct}%</p>)}</div> : null}{f.url && <a className="mt-1 inline-block text-xs text-campo underline" href={f.url} target="_blank" rel="noreferrer">Ver fuente</a>}</li>)}</ul></CardBody></Card>
  </div>;
}

export default async function EscenariosPage() {
  return <><PageHeader title="Escenarios climáticos" subtitle="Señales regionales para pensar con tiempo. La incertidumbre y el origen de cada dato están a la vista." /><Suspense fallback={<Card><CardBody><p className="text-sm text-muted">Cargando el último análisis climático…</p></CardBody></Card>}><Contenido /></Suspense></>;
}
