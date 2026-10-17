import type { ReactNode } from "react";
import { Badge, Card, CardBody, CardHeader, Notice, Table, Td, Th, Tr, cx } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconCloud, IconExternal, IconInfo, IconLeaf, IconMessage } from "@/components/icons";
import type { Tone } from "@/lib/status";
import { fecha, fechaHora } from "@/lib/format";
import type { S } from "@/lib/schemas";

type Resultado = S<"BriefForrajeResultado">;
type Escenario = S<"BriefEscenario">;

const nf0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const num = (s: string | null | undefined, f = nf1) => (s == null || s === "" ? "—" : f.format(Number(s)));
const toneladas = (kg?: string | null) => (kg == null ? "—" : `${nf1.format(Number(kg) / 1000)} t`);

export const ESTADO_ESCENARIO: Record<Escenario["estado"], { label: string; tone: Tone; icon: ReactNode }> = {
  sin_faltante: { label: "Sin faltante", tone: "success", icon: <IconCheckCircle size={14} /> },
  cubierto: { label: "Cubierto por reservas", tone: "success", icon: <IconCheckCircle size={14} /> },
  parcial: { label: "Cobertura parcial", tone: "warning", icon: <IconAlert size={14} /> },
  sin_reservas: { label: "Faltante sin reservas", tone: "danger", icon: <IconAlert size={14} /> },
  sin_datos: { label: "Faltan datos", tone: "neutral", icon: <IconInfo size={14} /> },
};

export const ESTADO_REVISION: Record<string, { label: string; tone: Tone }> = {
  sin_revisar: { label: "Sin revisar", tone: "neutral" },
  revisado: { label: "Revisado", tone: "success" },
  con_observaciones: { label: "Con observaciones", tone: "warning" },
};

const ORIGEN: Record<string, string> = {
  parametro: "Referencia TROPILLA",
  establecimiento: "Propio del campo",
  brief: "Cargado en este brief",
  existencias: "Existencias declaradas",
  ficha: "Ficha del establecimiento",
  potreros: "Suma de potreros",
  sin_dato: "Sin dato",
};

const ENSO: Record<string, string> = { el_nino: "El Niño", la_nina: "La Niña", neutral: "Neutral" };

function Dato({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-bold leading-8 tracking-[-0.02em] text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

function Rango({ c, horizonte }: { c?: S<"BriefCobertura"> | null; horizonte: number }) {
  if (!c) return null;
  const pct = (d: number) => `${Math.min(100, (d / horizonte) * 100)}%`;
  return (
    <div className="space-y-1.5">
      <div className="relative h-2 rounded-full bg-neutral-bg" role="img" aria-label={`Entre ${c.dias_min} y ${c.dias_max} días sobre un horizonte de ${horizonte}`}>
        <div className="absolute inset-y-0 rounded-full bg-campo-50 border border-campo" style={{ left: pct(c.dias_min), width: `calc(${pct(c.dias_max)} - ${pct(c.dias_min)})`, minWidth: 4 }} />
        <div className="absolute inset-y-[-3px] w-[2px] bg-monte" style={{ left: pct(c.dias) }} />
      </div>
      <p className="flex justify-between text-[12px] text-muted tabular-nums">
        <span>0</span>
        <span>{horizonte} días</span>
      </p>
    </div>
  );
}

function TarjetaEscenario({ e, horizonte, cercano }: { e: Escenario; horizonte: number; cercano: boolean }) {
  const st = ESTADO_ESCENARIO[e.estado];
  const dif = e.diferencia_ev == null ? null : Number(e.diferencia_ev);
  return (
    <section className={cx("flex flex-col rounded-[var(--radius-card)] border bg-surface", cercano ? "border-monte" : "border-border")}>
      <header className="space-y-2 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold text-ink">{e.nombre}</h3>
          {cercano && (
            <Badge tone="primary" icon={<IconCloud size={13} />}>
              Más cercano al clima actual
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
          <Badge tone={st.tone} icon={st.icon}>
            {st.label}
          </Badge>
          {Number(e.reduccion_oferta_pct) > 0 ? `Pasto −${num(e.reduccion_oferta_pct, nf0)} %` : "Pasto según receptividad declarada"}
        </div>
      </header>
      {e.estado === "sin_datos" ? (
        <p className="px-5 py-4 text-[14px] text-muted">{e.lectura}</p>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
            <div>
              <dt className="text-muted">EV de referencia</dt>
              <dd className="font-semibold text-ink tabular-nums">{num(e.ev_referencia, nf0)}</dd>
            </div>
            <div>
              <dt className="text-muted">{dif != null && dif > 0 ? "EV por encima" : "Margen en EV"}</dt>
              <dd className="font-semibold text-ink tabular-nums">{dif == null ? "—" : nf0.format(Math.abs(dif))}</dd>
            </div>
            <div>
              <dt className="text-muted">Faltante de MS por día</dt>
              <dd className="font-semibold text-ink tabular-nums">{Number(e.faltante_ms_kg_dia) > 0 ? `${num(e.faltante_ms_kg_dia, nf0)} kg` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Faltante en {horizonte} días</dt>
              <dd className="font-semibold text-ink tabular-nums">{Number(e.faltante_ms_kg_horizonte) > 0 ? toneladas(e.faltante_ms_kg_horizonte) : "—"}</dd>
            </div>
          </dl>
          {e.cobertura && (
            <div className="space-y-2">
              <p className="text-[13.5px] text-ink">
                Reservas cubren <span className="font-semibold tabular-nums">{e.cobertura.dias_min}–{e.cobertura.dias_max} días</span>{" "}
                <span className="text-muted">(central {e.cobertura.dias})</span>
              </p>
              <Rango c={e.cobertura} horizonte={horizonte} />
            </div>
          )}
          <p className="mt-auto text-[13px] leading-5 text-muted">{e.lectura}</p>
        </div>
      )}
    </section>
  );
}

/** Resultado del brief preventivo (TPA-71): escenarios con rango, supuestos con origen, clima de TPA-70 y preguntas para el asesor. */
export function ResultadoBrief({ r }: { r: Resultado }) {
  const cob = r.reservas.cobertura_rodeo_completo;
  const clima = r.clima;
  return (
    <div className="space-y-4">
      <Notice tone="info" title="Escenario exploratorio · piloto con asesor">
        {r.aviso}
      </Notice>
      {r.faltantes.length > 0 && (
        <Notice tone="warning" title="Datos que faltan o se supusieron">
          <ul className="list-disc space-y-0.5 pl-5">
            {r.faltantes.map((f) => (
              <li key={f.campo}>{f.mensaje}</li>
            ))}
            {r.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Dato
          label="Rodeo considerado"
          value={`${num(r.inventario.ev, nf0)} EV`}
          hint={`${nf0.format(r.inventario.cabezas)} cabezas · ${ORIGEN[r.inventario.origen] ?? r.inventario.origen}`}
        />
        <Dato
          label="Carga declarada"
          value={r.carga_declarada_ev_ha ? `${num(r.carga_declarada_ev_ha, nf2)} EV/ha` : "—"}
          hint={r.receptividad.valor_ev_ha ? `Receptividad declarada: ${num(r.receptividad.valor_ev_ha, nf2)} EV/ha` : "Sin receptividad declarada"}
        />
        <Dato label="Reservas utilizables" value={toneladas(r.reservas.ms_utilizable_kg)} hint="Materia seca, descontadas pérdidas" />
        <Dato
          label="Reservas para todo el rodeo"
          value={cob ? `${cob.dias_min}–${cob.dias_max} días` : "—"}
          hint="Si no hubiera pasto (p. ej., anegamiento o helada fuerte)"
        />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-ink">Escenarios a {r.horizonte_dias} días</h2>
          <p className="text-[12.5px] text-muted">Barra: rango de días que cubren las reservas; la línea marca el valor central.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {r.escenarios.map((e) => (
            <TarjetaEscenario key={e.codigo} e={e} horizonte={r.horizonte_dias} cercano={r.clima.disponible && r.escenario_cercano_al_clima.codigo === e.codigo} />
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-muted">{r.escenario_cercano_al_clima.motivo} Es una referencia para leer los escenarios, no un pronóstico de tu pasto.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Preguntas para tu asesor" description="El brief no indica qué hacer: ordena la conversación con quien conoce tu campo." />
          <ol className="divide-y divide-border">
            {r.preguntas_asesor.map((q, i) => (
              <li key={q} className="flex gap-3 px-5 py-3 text-[14px] text-ink">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-campo-50 text-[12px] font-semibold text-monte tabular-nums">{i + 1}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardHeader
            title="Contexto climático"
            description={clima.disponible ? `${clima.zona} · calculado ${fechaHora(clima.calculado_en)}` : "Alertas de TPA-70"}
          />
          <CardBody className="space-y-3 text-[14px]">
            {!clima.disponible ? (
              <p className="text-muted">{clima.mensaje}</p>
            ) : (
              <>
                {(clima.alertas ?? []).length ? (
                  <ul className="space-y-2">
                    {(clima.alertas ?? []).map((a) => (
                      <li key={`${a.tipo}-${a.desde}`} className="flex items-start gap-2">
                        <IconAlert size={16} className="mt-0.5 shrink-0 text-warning" />
                        <span>
                          <span className="font-medium text-ink">{a.titulo}</span>{" "}
                          <a href={a.fuente_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-campo hover:underline">
                            fuente <IconExternal size={12} />
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-2 text-muted">
                    <IconCheckCircle size={16} className="text-success" /> Sin alertas que afecten el pasto.
                  </p>
                )}
                {clima.lluvia?.anomalia_pct != null && (
                  <p className="text-muted">
                    Lluvia de los últimos {clima.lluvia.ventana_dias} días: <span className="font-semibold text-ink tabular-nums">{nf0.format(clima.lluvia.anomalia_pct)} %</span> de lo normal ({clima.lluvia.fuente}).
                  </p>
                )}
                {clima.enso?.fase && (
                  <p className="text-muted">
                    ENSO: <span className="font-semibold text-ink">{ENSO[clima.enso.fase] ?? clima.enso.fase}</span> · señal estacional regional ({clima.enso.fuente}).
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Supuestos usados" description="Cada número dice de dónde sale. Los de referencia son orientativos y no están validados por un profesional." />
        <Table minWidth={720}>
          <thead>
            <tr>
              <Th>Supuesto</Th>
              <Th numeric>Valor</Th>
              <Th>Origen</Th>
              <Th>Fuente</Th>
            </tr>
          </thead>
          <tbody>
            <Tr>
              <Td className="font-medium">Superficie ganadera</Td>
              <Td numeric>{r.superficie.valor_ha ? `${num(r.superficie.valor_ha, nf1)} ha` : "—"}</Td>
              <Td>{r.superficie.origen === "establecimiento" ? "Mi establecimiento" : (ORIGEN[r.superficie.origen] ?? r.superficie.origen)}</Td>
              <Td className="text-muted">{r.superficie.detalle}</Td>
            </Tr>
            <Tr>
              <Td className="font-medium">Receptividad</Td>
              <Td numeric>{r.receptividad.valor_ev_ha ? `${num(r.receptividad.valor_ev_ha, nf2)} EV/ha` : "—"}</Td>
              <Td>{ORIGEN[r.receptividad.origen] ?? r.receptividad.origen}</Td>
              <Td className="text-muted">{[r.receptividad.criterio, r.receptividad.periodo].filter(Boolean).join(" · ") || "—"}</Td>
            </Tr>
            {r.supuestos.map((s) => (
              <Tr key={s.clave}>
                <Td className="font-medium">{s.nombre}</Td>
                <Td numeric>
                  {num(s.valor, nf2)} {s.unidad}
                </Td>
                <Td>
                  <Badge tone={s.origen === "parametro" ? "neutral" : "primary"}>{ORIGEN[s.origen] ?? s.origen}</Badge>
                </Td>
                <Td className="text-muted">{s.fuente}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Inventario considerado" description={r.inventario.actualizado_en ? `Existencias al ${fecha(r.inventario.actualizado_en)}` : ORIGEN[r.inventario.origen]} />
          {r.inventario.filas.length ? (
            <Table minWidth={420}>
              <thead>
                <tr>
                  <Th>Categoría</Th>
                  <Th numeric>Cabezas</Th>
                  <Th numeric>EV/cab.</Th>
                  <Th numeric>EV</Th>
                </tr>
              </thead>
              <tbody>
                {r.inventario.filas.map((f) => (
                  <Tr key={f.categoria}>
                    <Td>{f.categoria_nombre}</Td>
                    <Td numeric>{nf0.format(f.cabezas)}</Td>
                    <Td numeric>{num(f.ev_por_cabeza, nf2)}</Td>
                    <Td numeric>{num(f.ev, nf1)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <CardBody>
              <p className="text-[14px] text-muted">Sin hacienda en el escenario.</p>
            </CardBody>
          )}
        </Card>
        <Card>
          <CardHeader title="Incertidumbre" description={`Margen de ±${num(r.incertidumbre.margen_pct, nf0)} % sobre la demanda`} />
          <CardBody className="space-y-3 text-[14px]">
            <p className="text-ink">{r.incertidumbre.explicacion}</p>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
                <IconLeaf size={16} /> El cálculo no contempla
              </p>
              <ul className="list-disc space-y-0.5 pl-5 text-muted">
                {r.incertidumbre.no_contempla.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            {r.reservas.items.length > 0 && (
              <p className="flex items-start gap-1.5 text-muted">
                <IconMessage size={16} className="mt-0.5 shrink-0" />
                Reservas: {r.reservas.items.map((i) => `${i.nombre} ${toneladas(i.kg_tal_cual)} tal cual (${num(i.ms_pct, nf0)} % MS)`).join(" · ")}.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
