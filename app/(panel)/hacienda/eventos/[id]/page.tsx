import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { api, ApiError } from "@/lib/api";
import { Avatar, Badge, Card, CardBody, CardHeader, DataList, Notice, TrustBadge, buttonClass } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconChevronRight, IconExternal, IconHash, IconShieldCheck } from "@/components/icons";
import { EventoIcono } from "@/components/panel/hacienda/timeline";
import { requireContexto } from "@/lib/establecimiento";
import { getEvento } from "@/lib/data/eventos";
import { getAnimal, listPotreros } from "@/lib/data/hacienda";
import { listLotes } from "@/lib/data/potreros";
import { getCatalogos } from "@/lib/data/catalogos";
import { ROL_LABEL } from "@/lib/auth";
import { fecha, fechaHora } from "@/lib/format";
import { ETIQUETAS, VALORES } from "@/lib/eventos-hacienda";
import { diff } from "@/lib/correccion";
import { AnularEvento } from "@/components/panel/eventos/corregir";
import type { One, S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Evento" };

type Params = { id: string };
type Cria = { viva?: boolean; sexo?: string; peso_kg?: string; animal?: { animal_id?: string; sexo?: string; identificaciones?: Array<{ valor?: string }> } };
type SP = { ok?: string };

const ORIGEN: Record<string, string> = { web: "Web", app: "App de campo", push: "App de campo", importacion: "Planilla", sistema: "Sistema" };
const OCULTAR = new Set(["animales", "crias", "producto_id", "tarea_id", "operacion_id", "documento_ids", "contrato_id", "regla_id", "movimientos"]);
const OBSERVACION: Record<string, string> = {
  gestacion_corta: "Gestación más corta que el mínimo de la especie",
  gestacion_larga: "Gestación más larga que el máximo de la especie",
  pesaje_atipico: "El peso difiere más de 30 % del anterior en menos de 30 días",
  posterior_a_baja: "Evento posterior a la baja del animal",
  servicio_posparto_temprano: "Servicio antes de los días mínimos desde el parto",
};
const KG = new Set(["peso_kg", "peso_vivo_kg", "pcc_kg", "pcf_kg", "peso_min_kg", "peso_max_kg"]);

async function Contenido({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const est = ctx.activa.establecimiento_id;
  let det: S<"EventoDetalle">;
  try {
    det = await getEvento(est, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  const ev = det.evento ?? {};
  const ids = ev.sujetos?.animal_ids ?? [];
  const [cat, potreros, lotes, integridad, animales] = await Promise.all([
    getCatalogos(),
    listPotreros(est).catch(() => []),
    Promise.all([listLotes(est).catch(() => []), listLotes(est, { archivados: true }).catch(() => [])]).then(([a, b]) => [...a, ...b]),
    api<One<S<"IntegridadRegistro">>>(`/establecimientos/${est}/eventos/${ev.id ?? id}/integridad`).then((r) => r.data).catch(() => null),
    Promise.all(ids.slice(0, 24).map((a) => getAnimal(est, a).catch(() => null))),
  ]);
  const toroIds = (ev.payload?.toro_ids as string[] | undefined) ?? [];
  const crias = ((ev.payload?.crias as Cria[] | undefined) ?? []).slice(0, 4);
  const toros = await Promise.all(toroIds.slice(0, 12).map((t) => getAnimal(est, t).catch(() => null)));

  const nombres = new Map<string, string>([
    ...potreros.map((p) => [p.id ?? "", p.nombre ?? ""] as [string, string]),
    ...lotes.map((l) => [l.id ?? "", l.nombre ?? ""] as [string, string]),
    ...cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo] as [string, string]),
    ...cat.categoriasFaena.map((c) => [c.codigo, c.nombre ?? c.codigo] as [string, string]),
    ...cat.razas.map((r) => [r.codigo, r.nombre ?? r.codigo] as [string, string]),
    ...Object.values(cat.items).flat().map((i) => [i.codigo, i.nombre] as [string, string]),
  ]);
  const tipoNombre = cat.tiposEvento.find((t) => t.codigo === ev.tipo)?.nombre ?? ev.tipo ?? "Evento";
  const versiones = [...(det.versiones?.length ? det.versiones : [ev])].sort((x, y) => (x.version ?? 1) - (y.version ?? 1));
  const ultima = versiones.at(-1) ?? ev;
  const anulado = ultima.accion === "anulacion";
  const esVigente = !anulado && (ev.id === ultima.id || ev.vigente !== false);
  const modulo = (ev.tipo ?? "").split(".")[0];
  const puedeCorregir = ctx.can(modulo === "establecimiento" ? "establecimiento_eventos.crear" : `${modulo}.corregir`) && esVigente && ev.tipo !== "hacienda.individualizacion";

  const valor = (k: string, v: unknown): ReactNode => {
    if (v == null || v === "") return null;
    if (typeof v === "boolean") return v ? "Sí" : "No";
    if (typeof v === "number") return <span className="tabular-nums">{v}</span>;
    if (typeof v === "string") {
      if (KG.has(k)) return <span className="tabular-nums">{v.replace(".", ",")} kg</span>;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fecha(v);
      if (/^\d+\.\d+$/.test(v)) return <span className="tabular-nums">{v.replace(".", ",")}</span>;
      if (k === "escala") return v.replace("-", " a ");
      return nombres.get(v) ?? VALORES[v] ?? v;
    }
    return null;
  };
  const datos: Array<{ label: string; value: ReactNode }> = [];
  // Una anulación no repite los datos: se muestran los de la última versión con datos.
  const fuente = Object.keys(ev.payload ?? {}).length ? ev : (versiones.filter((v) => v.accion !== "anulacion").at(-1) ?? ev);
  for (const [k, v] of Object.entries(fuente.payload ?? {})) {
    if (OCULTAR.has(k)) continue;
    if (Array.isArray(v)) {
      if (k === "toro_ids") datos.push({ label: "Toros", value: toros.map((t) => t?.identificacion_principal ?? "Sin caravana").join(", ") || `${v.length}` });
      else if (v.every((x) => typeof x === "string" && !/^[0-9a-f-]{36}$/.test(x))) datos.push({ label: ETIQUETAS[k] ?? k.replace(/_/g, " "), value: (v as string[]).join(", ") });
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        const val = valor(k2, v2);
        if (val != null) datos.push({ label: `${ETIQUETAS[k] ?? k} · ${ETIQUETAS[k2] ?? k2}`, value: val });
      }
      continue;
    }
    const val = valor(k, v);
    if (val != null) datos.push({ label: ETIQUETAS[k] ?? k.replace(/_/g, " "), value: val });
  }
  if (ev.responsable) datos.push({ label: "Responsable", value: ev.responsable });
  const docIds = ((fuente.payload?.documento_ids as string[] | undefined) ?? []).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  if (docIds.length)
    datos.push({
      label: docIds.length === 1 ? "Documento adjunto" : "Documentos adjuntos",
      value: (
        <span className="flex flex-wrap gap-2">
          {docIds.map((d, i) => (
            <Link key={d} href={`/documentos/${d}`} className="font-medium text-campo hover:underline">
              {docIds.length === 1 ? "Ver el documento" : `Documento ${i + 1}`}
            </Link>
          ))}
        </span>
      ),
    });

  const conteo = Object.entries(ev.sujetos?.conteo ?? {});
  const loteSujeto = ev.sujetos?.lote_id;
  const huella = integridad?.huella ?? ev.huella;

  return (
    <>
      <Link href="/hacienda/eventos" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Eventos
      </Link>
      {(sp.ok === "corregido" || sp.ok === "anulado") && (
        <div className="mb-4">
          <Notice tone="success" title={sp.ok === "corregido" ? "Corrección guardada." : "Evento anulado."}>
            {sp.ok === "corregido" ? "Es la versión vigente; la anterior quedó en «Ver cambios»." : "Quedó tachado en la historia y se recalcularon stock y estados."}
          </Notice>
        </div>
      )}
      {!esVigente && !anulado && ultima.id && (
        <div className="mb-4">
          <Notice tone="warning" title={`Estás viendo la versión ${ev.version ?? 1}, que ya fue corregida.`}>
            <Link href={`/hacienda/eventos/${ultima.id}`} className="font-semibold underline">
              Abrir la versión vigente (v{ultima.version})
            </Link>
          </Notice>
        </div>
      )}
      {sp.ok === "registrado" && (
        <div className="mb-4">
          <Notice tone="success" title="Evento registrado.">
            Ya actualizó el stock y la historia de cada animal. Si algo quedó mal, se corrige con motivo; no se borra.
          </Notice>
        </div>
      )}

      <Card className="mb-4">
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          {puedeCorregir && (
            <div className="flex gap-2 sm:absolute sm:right-5 sm:top-5 sm:order-last">
              <Link href={`/hacienda/eventos/${ev.id}/corregir`} className={buttonClass("outline", "sm")}>
                Corregir
              </Link>
              <AnularEvento eventoId={ev.id ?? id} tipo={ev.tipo ?? ""} tipoNombre={tipoNombre} />
            </div>
          )}
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-crema text-monte">
            <EventoIcono tipo={ev.tipo} size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className={`text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink ${anulado ? "line-through opacity-60" : ""}`}>{tipoNombre}</h1>
            <p className="mt-1 text-[14px] text-muted">
              {ev.ocurrido_precision === "minuto" ? fechaHora(ev.ocurrido_en) : fecha(ev.ocurrido_en)} · cargado desde {ORIGEN[ev.origen ?? ""] ?? ev.origen ?? "—"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ev.autor?.nombre && (
                <span className="mr-1 flex items-center gap-2 text-[13px] text-ink">
                  <Avatar name={ev.autor.nombre} size={24} />
                  <span className="font-medium">{ev.autor.nombre}</span>
                  {ev.autor.rol && <span className="text-muted">· {ROL_LABEL[ev.autor.rol as keyof typeof ROL_LABEL] ?? ev.autor.rol}</span>}
                </span>
              )}
              <TrustBadge nivel={ev.confianza ?? "declarado"} />
              {(ev.version ?? 1) > 1 && !anulado && <Badge tone="info">Corregido · v{ev.version}</Badge>}
              {anulado && <Badge tone="danger">Anulado</Badge>}
              {ev.en_revision && (
                <Badge tone="warning" icon={<IconAlert size={14} />}>
                  En revisión
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Datos" />
            <CardBody>
              {datos.length ? <DataList items={datos} /> : <p className="text-[14px] text-muted">Este evento no lleva datos además de la fecha y los animales.</p>}
              {ev.observaciones && (
                <div className="mt-4 rounded-[10px] border border-border bg-base px-4 py-3 text-[14px] leading-relaxed text-ink">
                  <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">Observaciones</p>
                  <p className="whitespace-pre-line">{ev.observaciones}</p>
                </div>
              )}
              {!!ev.observaciones_validacion?.length && (
                <div className="mt-4">
                  <Notice tone="warning" title="Se guardó con advertencias confirmadas">
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {ev.observaciones_validacion.map((o) => (
                        <li key={o}>{OBSERVACION[o] ?? o.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</li>
                      ))}
                    </ul>
                  </Notice>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Sobre quiénes"
              description={
                ids.length
                  ? `${ids.length} ${ids.length === 1 ? "animal identificado" : "animales identificados"}`
                  : loteSujeto
                    ? "Lote de manejo"
                    : ev.sujetos?.potrero_id
                      ? "Toda la hacienda que estaba en el potrero"
                      : ev.sujetos?.tipo === "establecimiento"
                      ? "Todo el establecimiento"
                      : undefined
              }
            />
            {ev.sujetos?.potrero_id && (
              <Link href={`/establecimiento/potreros/${ev.sujetos.potrero_id}`} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 hover:bg-surface-2">
                <span>
                  <span className="block text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">Potrero</span>
                  <span className="font-semibold text-ink">{nombres.get(ev.sujetos.potrero_id) ?? "Potrero"}</span>
                </span>
                <IconChevronRight size={18} className="text-subtle" />
              </Link>
            )}
            {loteSujeto && (
              <Link href={`/hacienda/lotes/${loteSujeto}`} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 hover:bg-surface-2">
                <span>
                  <span className="block text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">Lote</span>
                  <span className="font-semibold text-ink">{nombres.get(loteSujeto) ?? "Lote"}</span>
                </span>
                <IconChevronRight size={18} className="text-subtle" />
              </Link>
            )}
            {conteo.length > 0 && (
              <ul className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
                {conteo.map(([c, n]) => (
                  <li key={c} className="rounded-[8px] border border-border bg-base px-2.5 py-1 text-[13px]">
                    {nombres.get(c) ?? c} <span className="font-semibold tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            )}
            {ids.length > 0 && (
              <ul className={ids.length > 4 ? "grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0" : "divide-y divide-border"}>
                {animales.map((a, i) =>
                  a ? (
                    <li key={a.id ?? i} className={ids.length > 4 ? "sm:border-b sm:border-border sm:odd:border-r" : undefined}>
                      <Link href={`/hacienda/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-2">
                        <span className="min-w-0">
                          <span className="font-semibold tabular-nums text-ink">{a.identificacion_principal ?? "Sin caravana"}</span>{" "}
                          <span className="text-[13px] text-muted">{a.categoria_nombre ?? a.categoria}</span>
                        </span>
                        {a.estado && a.estado !== "activo" ? <Badge tone="neutral">{a.estado}</Badge> : <IconChevronRight size={16} className="text-subtle" />}
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
            )}
            {crias.length > 0 && (
              <div className="border-t border-border px-5 py-3">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">Crías</p>
                <ul className="space-y-1.5 text-[14px]">
                  {crias.map((c, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      {c.viva && c.animal?.animal_id ? (
                        <Link href={`/hacienda/${c.animal.animal_id}`} className="font-semibold text-ink hover:underline">
                          {c.animal.identificaciones?.[0]?.valor ?? "Cría sin caravana"}
                        </Link>
                      ) : (
                        <span className="font-semibold text-muted">Nació muerta</span>
                      )}
                      <span className="text-muted">
                        {(c.animal?.sexo ?? c.sexo) === "H" ? "hembra" : "macho"}
                        {c.peso_kg ? ` · ${String(c.peso_kg).replace(".", ",")} kg` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ids.length > 24 && <p className="px-5 py-3 text-[13px] text-muted">y {ids.length - 24} más.</p>}
            {!ids.length && !loteSujeto && <p className="px-5 py-4 text-[14px] text-muted">Sin animales asociados.</p>}
          </Card>

          {versiones.length > 1 && (
            <Card className="overflow-hidden">
              <CardHeader title="Ver cambios" description="Cada corrección es una versión nueva; lo anterior queda tachado, nunca se borra." />
              <ol className="divide-y divide-border">
                {versiones
                  .map((v, i) => ({ v, cambios: i ? diff(versiones[i - 1], v) : [] }))
                  .reverse()
                  .map(({ v, cambios }) => (
                    <li key={v.id} className={v.id === ev.id ? "bg-surface-2 px-5 py-3.5" : "px-5 py-3.5"}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
                        <span>
                          <Link href={`/hacienda/eventos/${v.id}`} className="font-semibold text-ink hover:underline">
                            v{v.version}
                          </Link>{" "}
                          · {v.accion === "alta" ? "Original" : v.accion === "anulacion" ? "Anulación" : "Corrección"}
                          {v.id === ev.id && <span className="text-muted"> (esta)</span>}
                        </span>
                        <span className="text-[13px] text-muted">
                          {v.autor?.nombre} · {fechaHora(v.registrado_en)}
                        </span>
                      </div>
                      {v.motivo && <p className="mt-1 text-[13.5px] text-ink">Motivo: «{v.motivo}»</p>}
                      {cambios.length > 0 && v.accion !== "anulacion" && (
                        <ul className="mt-2 space-y-1 text-[13.5px]">
                          {cambios.map((c) => {
                            const k = c.campo;
                            const clave = Object.keys(ETIQUETAS).find((x) => k.endsWith(ETIQUETAS[x])) ?? "";
                            return (
                              <li key={k} className="flex flex-wrap items-baseline gap-x-2">
                                <span className="text-muted">{k}:</span>
                                <del className="text-muted decoration-danger/70">{c.antes == null || c.antes === "" ? "vacío" : valor(clave, c.antes) ?? String(c.antes)}</del>
                                <span aria-hidden="true" className="text-subtle">→</span>
                                <ins className="font-semibold text-ink no-underline">{c.despues == null || c.despues === "" ? "vacío" : valor(clave, c.despues) ?? String(c.despues)}</ins>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
              </ol>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Integridad" description="Huella del registro y su lugar en la cadena del establecimiento." />
            <CardBody className="space-y-3 text-[13.5px]">
              {huella ? (
                <>
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
                      <IconHash size={14} /> Huella SHA-256
                    </p>
                    <p className="break-all rounded-[8px] border border-border bg-base px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">{huella}</p>
                  </div>
                  <dl className="divide-y divide-border rounded-[10px] border border-border">
                    {[
                      ["Eslabón", integridad?.seq ?? ev.seq ? <span className="tabular-nums">#{integridad?.seq ?? ev.seq}</span> : "—"],
                      ["Registrado", fechaHora(integridad?.registrado_en ?? ev.registrado_en)],
                      [
                        "Anclaje",
                        integridad?.anclaje ? (
                          <span className="inline-flex items-center gap-1.5">
                            <IconShieldCheck size={14} className="text-success" /> {integridad.anclaje.red ?? integridad.anclaje.driver} · {integridad.anclaje.estado}
                          </span>
                        ) : (
                          "Pendiente (se ancla una vez por día)"
                        ),
                      ],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex items-baseline justify-between gap-3 px-3 py-2">
                        <dt className="text-muted">{label}</dt>
                        <dd className="text-right font-medium text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link href={`/es/v/${huella}`} className="inline-flex items-center gap-1.5 font-semibold text-campo hover:underline">
                    Ver la verificación pública <IconExternal size={14} />
                  </Link>
                  <p className="text-[12.5px] leading-snug text-muted">Prueba que el registro no cambió desde esa fecha. No certifica que lo declarado sea cierto.</p>
                </>
              ) : (
                <p className="text-muted">Sin huella todavía.</p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

/** Detalle de un evento (TPA-22): datos legibles, sujetos, versiones e integridad. */
export default function EventoPage(props: { params: Promise<Params>; searchParams: Promise<SP> }) {
  return (
    <Suspense fallback={<div className="h-[480px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
