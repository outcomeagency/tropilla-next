"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { cancelarImportacionAction, confirmarImportacionAction, corregirFilaAction } from "@/lib/importacion-actions";
import { COLUMNA_LABEL, filaPlanilla, type Columna, type FilaPlanilla, type Nombres } from "@/lib/planilla";
import type { ImportacionFila, Importacion } from "@/lib/data/importaciones";
import { CRUDAS_PENDIENTES } from "./subir";
import { Dialog } from "@/components/dialog";
import { IconAlert, IconCheckCircle, IconClose, IconInfo, IconList, IconUpload } from "@/components/icons";
import { Badge, Button, Card, Field, Input, KpiCard, Notice, Select, SpeciesChip, Spinner, cx } from "@/components/ui";
import { especieDe } from "@/lib/types";

type Opcion = { codigo: string; nombre: string; especie: string };
type Filtro = "todas" | "errores" | "advertencias" | "descartadas";
type Clase = "lista" | "advertencia" | "error" | "descartada";

const PAGINA = 50;
const IDENT: Columna[] = ["caravana", "caravana_oficial", "rfid", "tatuaje", "marca"];

const clase = (f: ImportacionFila): Clase =>
  f.accion === "descartar" ? "descartada" : f.errores?.length ? "error" : f.advertencias?.length ? "advertencia" : "lista";

const ESTADO: Record<Clase, { label: string; tone: "success" | "warning" | "danger" | "neutral"; Icon: typeof IconAlert }> = {
  lista: { label: "Lista", tone: "success", Icon: IconCheckCircle },
  advertencia: { label: "Con aviso", tone: "warning", Icon: IconInfo },
  error: { label: "Con error", tone: "danger", Icon: IconAlert },
  descartada: { label: "Descartada", tone: "neutral", Icon: IconClose },
};

const mensajeAdv = (a: Record<string, unknown>) => String(a.mensaje ?? a.codigo ?? "");

/** Lo que escribió el productor (leído del CSV en el navegador) + correcciones hechas acá. */
function useCrudas(id: string) {
  const key = `tropilla_imp_${id}`;
  const [crudas, setCrudas] = useState<Record<number, FilaPlanilla>>({});
  useEffect(() => {
    try {
      let raw = localStorage.getItem(key);
      if (!raw) {
        const p = localStorage.getItem(CRUDAS_PENDIENTES);
        const parsed = p ? (JSON.parse(p) as { t: number; filas: FilaPlanilla[] }) : null;
        if (parsed && Date.now() - parsed.t < 15 * 60_000) {
          // Sólo se guarda la planilla en revisión: se limpian las anteriores.
          for (const k of Object.keys(localStorage)) if (k.startsWith("tropilla_imp_0")) localStorage.removeItem(k);
          raw = JSON.stringify(Object.fromEntries(parsed.filas.map((f, i) => [i + 1, f])));
          localStorage.setItem(key, raw);
        }
        localStorage.removeItem(CRUDAS_PENDIENTES);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage sólo existe en el navegador
      if (raw) setCrudas(JSON.parse(raw));
    } catch {
      /* sin localStorage: se corrige sin ver lo escrito */
    }
  }, [key]);
  function guardar(numero: number, f: FilaPlanilla) {
    setCrudas((c) => {
      const n = { ...c, [numero]: f };
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {
        /* nada */
      }
      return n;
    });
  }
  return { crudas, guardar };
}

/**
 * Previsualización de la planilla (TPA-21): resumen, filtro por estado, tabla
 * con la celda en error marcada y su mensaje, corrección en línea (PATCH, la
 * API revalida la fila), descartar/incluir, y confirmar o cancelar.
 */
export function RevisionImportacion({
  importacion,
  filas: iniciales,
  nombres,
  categorias,
  razas,
  lotes,
  potreros,
  truncada,
}: {
  importacion: Importacion;
  filas: ImportacionFila[];
  nombres: Record<keyof Nombres, Record<string, string>>;
  categorias: Opcion[];
  razas: Opcion[];
  lotes: Opcion[];
  potreros: Array<{ codigo: string; nombre: string }>;
  truncada: boolean;
}) {
  const [filas, setFilas] = useState(iniciales);
  const [filtro, setFiltro] = useState<Filtro>(() => (iniciales.some((f) => f.errores?.length && f.accion !== "descartar") ? "errores" : "todas"));
  const [visibles, setVisibles] = useState(PAGINA);
  const [editando, setEditando] = useState<number | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);
  const [errorFila, setErrorFila] = useState<{ numero: number; msg: string } | null>(null);
  const [dialogo, setDialogo] = useState<"confirmar" | "cancelar" | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [enviando, startEnvio] = useTransition();
  const { crudas, guardar } = useCrudas(importacion.id);

  const maps: Nombres = useMemo(
    () => ({
      categoria: new Map(Object.entries(nombres.categoria)),
      raza: new Map(Object.entries(nombres.raza)),
      lote: new Map(Object.entries(nombres.lote)),
      potrero: new Map(Object.entries(nombres.potrero)),
    }),
    [nombres],
  );

  const conteo = useMemo(() => {
    const c: Record<Clase, number> = { lista: 0, advertencia: 0, error: 0, descartada: 0 };
    for (const f of filas) c[clase(f)]++;
    return c;
  }, [filas]);
  const aImportar = conteo.lista + conteo.advertencia;

  const filtradas = useMemo(
    () =>
      filas.filter((f) => {
        const c = clase(f);
        return filtro === "todas" || (filtro === "errores" && c === "error") || (filtro === "advertencias" && c === "advertencia") || (filtro === "descartadas" && c === "descartada");
      }),
    [filas, filtro],
  );

  async function patch(numero: number, cambios: Parameters<typeof corregirFilaAction>[2]) {
    setOcupada(numero);
    setErrorFila(null);
    const r = await corregirFilaAction(importacion.id, numero, cambios);
    setOcupada(null);
    if (r.error || !r.fila) {
      setErrorFila({ numero, msg: r.error ?? "No pudimos guardar la fila." });
      return null;
    }
    const nueva = r.fila;
    setFilas((fs) => fs.map((f) => (f.numero === numero ? nueva : f)));
    return nueva;
  }

  function cambiarFiltro(f: Filtro) {
    setFiltro(f);
    setVisibles(PAGINA);
    setEditando(null);
  }

  const pagina = filtradas.slice(0, visibles).map((fila) => {
    const numero = fila.numero ?? 0;
    const c = clase(fila);
    const errores = fila.errores ?? [];
    const campos = new Set(errores.map((e) => e.campo ?? ""));
    const f = filaPlanilla((fila.datos ?? {}) as Record<string, unknown>, [...campos], maps, crudas[numero]);
    const descartada = c === "descartada";
    const avisos = (fila.advertencias ?? []).map((a) => mensajeAdv(a as Record<string, unknown>));
    return {
      fila,
      numero,
      c,
      errores,
      campos,
      f,
      avisos,
      descartada,
      abierta: editando === numero,
      conDetalle: !descartada && (errores.length > 0 || avisos.length > 0),
      ids: IDENT.filter((k) => f[k]).sort((a, b) => Number(campos.has(b)) - Number(campos.has(a))),
      identErr: IDENT.some((k) => campos.has(k)),
    };
  });
  type Vista = (typeof pagina)[number];

  const accion = ({ numero, c, abierta, descartada }: Vista) =>
    ocupada === numero ? (
      <span className="inline-flex h-9 items-center px-3 text-muted">
        <Spinner />
      </span>
    ) : descartada ? (
      <Button variant="ghost" size="sm" onClick={() => void patch(numero, { accion: "importar" })}>
        Incluir de nuevo
      </Button>
    ) : (
      <Button variant={c === "error" ? "outline" : "ghost"} size="sm" onClick={() => setEditando(abierta ? null : numero)} aria-expanded={abierta}>
        {abierta ? "Cerrar" : c === "error" ? "Corregir" : "Editar"}
      </Button>
    );

  const mensajes = ({ numero, c, errores, avisos, f, abierta }: Vista) => (
    <ul className="flex flex-wrap gap-x-5 gap-y-1">
      {errores.map((e, i) => {
        const label = COLUMNA_LABEL[(e.campo ?? "fila") as Columna] ?? e.campo ?? "";
        return (
          <li key={`e${i}`} className="flex items-start gap-1.5 text-[13px] text-danger">
            <IconAlert size={14} className="mt-[3px] shrink-0" />
            <span>
              <span className="font-semibold">
                {label}
                {IDENT.includes(e.campo as Columna) && f[e.campo as Columna] ? ` «${f[e.campo as Columna]}»` : ""}:
              </span>{" "}
              {sinEco(label, e.mensaje ?? "")}
            </span>
          </li>
        );
      })}
      {avisos.map((a, i) => (
        <li key={`a${i}`} className="flex items-start gap-1.5 text-[13px] text-warning">
          <IconInfo size={14} className="mt-[3px] shrink-0" />
          <span>{a} Se puede importar igual.</span>
        </li>
      ))}
      {c === "error" && !abierta && (
        <li>
          <button
            type="button"
            onClick={() => void patch(numero, { accion: "descartar" })}
            disabled={ocupada === numero}
            className="text-[13px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Descartar esta fila
          </button>
        </li>
      )}
    </ul>
  );

  const editor = ({ fila, numero, f, errores }: Vista) => (
    <EditorFila
      key={JSON.stringify(fila)}
      numero={numero}
      inicial={f}
      errores={Object.fromEntries(errores.map((e) => [e.campo ?? "", e.mensaje ?? ""]))}
      categorias={categorias}
      razas={razas}
      lotes={lotes}
      potreros={potreros}
      ocupada={ocupada === numero}
      error={errorFila?.numero === numero ? errorFila.msg : null}
      onCancel={() => setEditando(null)}
      onDescartar={() => void patch(numero, { accion: "descartar" }).then((r) => r && setEditando(null))}
      onSave={async (datos) => {
        guardar(numero, datos);
        const nueva = await patch(numero, { datos });
        if (nueva && !nueva.errores?.length) setEditando(null);
      }}
    />
  );

  const tabs: Array<{ id: Filtro; label: string; n: number }> = [
    { id: "todas", label: "Todas", n: filas.length },
    { id: "errores", label: "Con errores", n: conteo.error },
    { id: "advertencias", label: "Con aviso", n: conteo.advertencia },
    { id: "descartadas", label: "Descartadas", n: conteo.descartada },
  ];

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="filas en la planilla" value={filas.length} icon={<IconList size={22} />} />
        <KpiCard label="listas para importar" value={aImportar} icon={<IconCheckCircle size={22} />} />
        <KpiCard label={conteo.error === 1 ? "fila con errores" : "filas con errores"} value={conteo.error} icon={<IconAlert size={22} />} />
        <KpiCard label={`con aviso${conteo.descartada ? ` · ${conteo.descartada} descartada${conteo.descartada === 1 ? "" : "s"}` : ""}`} value={conteo.advertencia} icon={<IconInfo size={22} />} />
      </div>

      {truncada && (
        <div className="mb-4">
          <Notice tone="warning" title="Mostramos las primeras 3.000 filas">La planilla es más larga: al confirmar se importan todas las filas válidas, también las que no se ven acá.</Notice>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div role="tablist" aria-label="Filtrar filas" className="inline-flex flex-wrap gap-1 rounded-[10px] bg-surface-2 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filtro === t.id}
                onClick={() => cambiarFiltro(t.id)}
                className={cx(
                  "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium transition-colors",
                  filtro === t.id ? "bg-surface text-ink ring-1 ring-border" : "text-muted hover:text-ink",
                )}
              >
                {t.label}
                <span className={cx("tabular-nums", t.id === "errores" && t.n > 0 ? "font-semibold text-danger" : "text-subtle")}>{t.n}</span>
              </button>
            ))}
          </div>
          <p className="text-[13px] text-muted">Tocá «Corregir» para arreglar una fila acá mismo: se revisa de nuevo al guardar.</p>
        </div>

        {filtradas.length === 0 ? (
          <div className="flex items-start gap-4 px-6 py-10">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border border-border bg-crema text-campo">
              <IconCheckCircle size={24} />
            </span>
            <div>
              <h3 className="text-[17px] font-semibold text-ink">{filtro === "errores" ? "No quedan filas con errores" : filtro === "advertencias" ? "Ninguna fila tiene avisos" : filtro === "descartadas" ? "No descartaste filas" : "La planilla no tiene filas"}</h3>
              <p className="mt-1.5 text-[15px] text-muted">
                {filtro === "errores" ? (
                  <>Ya podés importar las <span className="font-semibold tabular-nums text-ink">{aImportar}</span> filas listas.</>
                ) : filas.length === 0 ? (
                  "Completá una fila por animal debajo de los encabezados y subila de nuevo."
                ) : (
                  "Mirá todas las filas para revisar la planilla completa."
                )}
              </p>
              {filtro !== "todas" && (
                <Button variant="outline" className="mt-4" onClick={() => cambiarFiltro("todas")}>
                  Ver todas las filas
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1000px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="bg-base">
                    {["Fila", "Estado", "Especie", "Sexo", "Categoría", "Raza", "Identificación", "Nacimiento", "Lote · Potrero", ""].map((h, i) => (
                      <th key={i} scope="col" className={cx("whitespace-nowrap border-b border-border px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted first:pl-5 last:pr-5", i === 0 && "w-14")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagina.map((v) => {
                    const { numero, c, campos, f, abierta, descartada, conDetalle, ids, identErr } = v;
                    const E = ESTADO[c];
                    const sigue = conDetalle || abierta || errorFila?.numero === numero;
                    const borde = sigue ? "" : "border-b border-border";
                    return (
                      <Fragment key={numero}>
                        <tr className={cx("align-top", descartada ? "text-subtle" : "text-ink", c === "error" && "bg-danger-bg/40")}>
                          <td className={cx("py-3 pl-5 pr-3 font-semibold tabular-nums text-muted", borde)}>{numero}</td>
                          <td className={cx("px-3 py-3", borde)}>
                            <Badge tone={E.tone} icon={<E.Icon size={13} />}>
                              {E.label}
                            </Badge>
                          </td>
                          <Celda err={campos.has("especie")} borde={borde}>
                            {f.especie === "BUB" || f.especie === "BOV" ? <SpeciesChip especie={especieDe(f.especie)} /> : f.especie || ""}
                          </Celda>
                          <Celda err={campos.has("sexo")} borde={borde}>
                            {sexoDe(f.sexo)}
                          </Celda>
                          <Celda err={campos.has("categoria")} borde={borde}>
                            {f.categoria}
                          </Celda>
                          <Celda err={campos.has("raza")} borde={borde}>
                            {f.raza}
                          </Celda>
                          <Celda err={identErr} borde={borde} vacio="Sin identificación">
                            {ids.length ? (
                              <span className="tabular-nums">
                                {f[ids[0]]}
                                {ids.length > 1 && <span className="ml-1.5 text-[12px] text-muted">+{ids.length - 1}</span>}
                              </span>
                            ) : null}
                          </Celda>
                          <Celda err={campos.has("fecha_nacimiento")} borde={borde}>
                            {f.fecha_nacimiento && <span className="tabular-nums">{fechaCorta(f.fecha_nacimiento)}</span>}
                            {f.nacimiento_estimado === "si" && <span className="ml-1 text-[12px] text-muted">(est.)</span>}
                          </Celda>
                          <Celda err={campos.has("lote") || campos.has("potrero")} borde={borde}>
                            {[f.lote, f.potrero].filter(Boolean).join(" · ")}
                          </Celda>
                          <td className={cx("py-2 pl-3 pr-5 text-right", borde)}>{accion(v)}</td>
                        </tr>
                        {conDetalle && (
                          <tr className={cx(c === "error" && "bg-danger-bg/40")}>
                            <td className={cx(abierta || errorFila?.numero === numero ? "" : "border-b border-border")} />
                            <td colSpan={9} className={cx("pb-3 pl-3 pr-5", abierta || errorFila?.numero === numero ? "" : "border-b border-border")}>
                              {mensajes(v)}
                            </td>
                          </tr>
                        )}
                        {errorFila?.numero === numero && !abierta && (
                          <tr>
                            <td colSpan={10} className="border-b border-border px-5 pb-3">
                              <p role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
                                <IconAlert size={14} /> {errorFila.msg}
                              </p>
                            </td>
                          </tr>
                        )}
                        {abierta && (
                          <tr>
                            <td colSpan={10} className="border-b border-border bg-base px-5 py-4">
                              {editor(v)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Teléfono: una tarjeta por fila, mismos datos y acciones. */}
            <ul className="divide-y divide-border md:hidden">
              {pagina.map((v) => {
                const { numero, c, campos, f, abierta, descartada, conDetalle, ids, identErr } = v;
                const E = ESTADO[c];
                const dato = (err: boolean, txt: string | undefined) =>
                  err ? (
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                      <IconAlert size={13} />
                      {txt || "Falta"}
                    </span>
                  ) : (
                    txt
                  );
                return (
                  <li key={numero} className={cx("px-4 py-3.5", c === "error" && "bg-danger-bg/40", descartada && "text-subtle")}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                        <span className="tabular-nums text-muted">Fila {numero}</span>
                        <Badge tone={E.tone} icon={<E.Icon size={13} />}>
                          {E.label}
                        </Badge>
                      </p>
                      {accion(v)}
                    </div>
                    <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[14px] text-ink">
                      {dato(campos.has("especie"), f.especie === "BUB" ? "Bubalino" : f.especie === "BOV" ? "Bovino" : f.especie)}
                      <span className="text-subtle">·</span>
                      {dato(campos.has("sexo"), sexoDe(f.sexo))}
                      <span className="text-subtle">·</span>
                      {dato(campos.has("categoria"), f.categoria)}
                      {(f.raza || campos.has("raza")) && (
                        <>
                          <span className="text-subtle">·</span>
                          {dato(campos.has("raza"), f.raza)}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-muted">
                      {dato(identErr, ids.length ? ids.map((k) => f[k]).join(" · ") : "Sin identificación")}
                      {(f.fecha_nacimiento || campos.has("fecha_nacimiento")) && <span>· Nac. {dato(campos.has("fecha_nacimiento"), f.fecha_nacimiento ? fechaCorta(f.fecha_nacimiento) : "")}</span>}
                      {(f.lote || f.potrero || campos.has("lote") || campos.has("potrero")) && (
                        <span>· {dato(campos.has("lote") || campos.has("potrero"), [f.lote, f.potrero].filter(Boolean).join(" · "))}</span>
                      )}
                    </p>
                    {conDetalle && <div className="mt-2">{mensajes(v)}</div>}
                    {errorFila?.numero === numero && !abierta && (
                      <p role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-danger">
                        <IconAlert size={14} /> {errorFila.msg}
                      </p>
                    )}
                    {abierta && <div className="-mx-4 mt-3 border-t border-border bg-base px-4 py-4">{editor(v)}</div>}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {filtradas.length > visibles && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-[13px] text-muted">
            <span>
              Mostrando <span className="tabular-nums text-ink">{visibles}</span> de <span className="tabular-nums text-ink">{filtradas.length}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setVisibles((v) => v + PAGINA)}>
              Mostrar {Math.min(PAGINA, filtradas.length - visibles)} más
            </Button>
          </div>
        )}

        {/* Barra de confirmación: siempre a mano mientras se revisa. */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-[var(--radius-card)] border-t border-border bg-surface px-5 py-3">
          <p className="text-[14px] text-ink">
            {aImportar > 0 ? (
              <>
                Se van a cargar <span className="font-semibold tabular-nums">{aImportar}</span> {aImportar === 1 ? "animal" : "animales"}
                {conteo.error > 0 && (
                  <span className="text-danger">
                    {" "}
                    · <span className="font-semibold tabular-nums">{conteo.error}</span> {conteo.error === 1 ? "fila con errores queda afuera" : "filas con errores quedan afuera"}
                  </span>
                )}
              </>
            ) : (
              <span className="text-danger">Ninguna fila está lista: corregí o descartá las que tienen errores.</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setDialogo("cancelar")} disabled={enviando}>
              Cancelar importación
            </Button>
            <Button onClick={() => setDialogo("confirmar")} disabled={aImportar === 0 || enviando || ocupada !== null} icon={<IconUpload size={18} />}>
              Importar {aImportar} {aImportar === 1 ? "animal" : "animales"}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog
        open={dialogo === "confirmar"}
        onClose={() => setDialogo(null)}
        title={`Importar ${aImportar} ${aImportar === 1 ? "animal" : "animales"}`}
        description="Cada fila lista se registra como un ingreso a la hacienda, con fecha de hoy y vos como autor."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogo(null)} disabled={enviando}>
              Seguir revisando
            </Button>
            <Button
              disabled={enviando}
              icon={enviando ? <Spinner /> : undefined}
              onClick={() =>
                startEnvio(async () => {
                  setErrorGlobal(null);
                  const r = await confirmarImportacionAction(importacion.id);
                  if (r?.error) setErrorGlobal(r.error);
                })
              }
            >
              {enviando ? "Importando…" : "Importar"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 px-5 py-4 text-[14.5px]">
          <ul className="divide-y divide-border rounded-[10px] border border-border">
            <Linea label="Listas" valor={conteo.lista} />
            {conteo.advertencia > 0 && <Linea label="Con aviso (entran igual)" valor={conteo.advertencia} />}
            {conteo.error > 0 && <Linea label="Con errores (no se importan)" valor={conteo.error} danger />}
            {conteo.descartada > 0 && <Linea label="Descartadas" valor={conteo.descartada} />}
          </ul>
          {conteo.error > 0 && (
            <Notice tone="warning" title="Las filas con errores no se pueden importar después desde esta planilla">
              Si las querés, corregilas antes de confirmar o subilas en otra planilla más adelante.
            </Notice>
          )}
          <p className="text-[13px] text-muted">Una vez importados, los animales se corrigen desde su ficha: nada se borra, queda la historia.</p>
          {errorGlobal && <Notice tone="danger" title={errorGlobal} />}
        </div>
      </Dialog>

      <Dialog
        open={dialogo === "cancelar"}
        onClose={() => setDialogo(null)}
        size="sm"
        title="¿Cancelar la importación?"
        description="No se carga ningún animal y se pierden las correcciones que hiciste acá."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogo(null)} disabled={enviando}>
              Volver
            </Button>
            <Button
              variant="danger"
              disabled={enviando}
              icon={enviando ? <Spinner /> : undefined}
              onClick={() =>
                startEnvio(async () => {
                  setErrorGlobal(null);
                  const r = await cancelarImportacionAction(importacion.id);
                  if (r?.error) setErrorGlobal(r.error);
                })
              }
            >
              Cancelar importación
            </Button>
          </>
        }
      >
        {errorGlobal ? (
          <div className="px-5 py-4">
            <Notice tone="danger" title={errorGlobal} />
          </div>
        ) : (
          <p className="px-5 py-4 text-[14px] text-muted">Podés volver a subir la planilla cuando quieras.</p>
        )}
      </Dialog>

      <p className="mt-4 text-[13px] text-muted">
        ¿Muchos errores? Puede ser más rápido corregir en tu planilla y{" "}
        <Link href="/hacienda/importar" className="font-medium text-campo hover:underline">
          subirla de nuevo
        </Link>
        .
      </p>
    </>
  );
}

/** «Sexo: Sexo: M o H» → «Sexo: M o H» (la API a veces repite el nombre de la columna). */
function sinEco(label: string, msg: string) {
  return label && msg.toLowerCase().startsWith(`${label.toLowerCase()}:`) ? msg.slice(label.length + 1).trim() : msg;
}

const sexoDe = (s?: string) => (s === "H" ? "Hembra" : s === "M" ? "Macho" : s);

function fechaCorta(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function Linea({ label, valor, danger }: { label: string; valor: number; danger?: boolean }) {
  return (
    <li className={cx("flex items-center justify-between px-4 py-2.5", danger && "text-danger")}>
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{valor}</span>
    </li>
  );
}

/** Celda de la tabla: si la columna tiene error, se marca (ícono + color) y muestra lo que vino o «Falta». */
function Celda({ err, borde, vacio = "—", children }: { err: boolean; borde: string; vacio?: string; children: React.ReactNode }) {
  const vacia = children == null || children === "" || children === false || (Array.isArray(children) && children.every((c) => c == null || c === "" || c === false));
  return (
    <td className={cx("px-3 py-3", borde)}>
      {err ? (
        <span className="inline-flex max-w-[220px] items-center gap-1 rounded-[6px] border border-danger-border bg-surface px-1.5 py-0.5 font-medium text-danger">
          <IconAlert size={13} className="shrink-0" />
          <span className="truncate">{vacia ? "Falta" : children}</span>
        </span>
      ) : vacia ? (
        <span className="text-subtle">{vacio}</span>
      ) : (
        children
      )}
    </td>
  );
}

function EditorFila({
  numero,
  inicial,
  errores,
  categorias,
  razas,
  lotes,
  potreros,
  ocupada,
  error,
  onCancel,
  onDescartar,
  onSave,
}: {
  numero: number;
  inicial: FilaPlanilla;
  errores: Record<string, string>;
  categorias: Opcion[];
  razas: Opcion[];
  lotes: Opcion[];
  potreros: Array<{ codigo: string; nombre: string }>;
  ocupada: boolean;
  error: string | null;
  onCancel: () => void;
  onDescartar: () => void;
  onSave: (datos: FilaPlanilla) => void;
}) {
  const [v, setV] = useState<FilaPlanilla>(inicial);
  const set = (k: Columna) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const id = (k: string) => `f${numero}-${k}`;
  const especie = v.especie === "BOV" || v.especie === "BUB" ? v.especie : "";
  const igual = (a?: string, b?: string) => (a ?? "").toLowerCase() === (b ?? "").toLowerCase();

  /** Select de catálogo: si lo escrito no existe, aparece como opción marcada para que se vea qué hay que cambiar. */
  function opciones(lista: Array<{ nombre: string }>, actual?: string) {
    const existe = !actual || lista.some((o) => igual(o.nombre, actual));
    return (
      <>
        <option value="">—</option>
        {!existe && <option value={actual}>«{actual}» (no existe)</option>}
        {lista.map((o) => (
          <option key={o.nombre} value={o.nombre}>
            {o.nombre}
          </option>
        ))}
      </>
    );
  }
  const valorSelect = (lista: Array<{ nombre: string }>, actual?: string) => lista.find((o) => igual(o.nombre, actual))?.nombre ?? actual ?? "";

  const cats = categorias.filter((c) => !especie || c.especie === especie);
  const rzs = razas.filter((r) => !especie || r.especie === especie);
  const lts = lotes.filter((l) => !especie || l.especie === especie);

  const campo = (k: Columna, control: React.ReactNode, hint?: string) => (
    <Field label={COLUMNA_LABEL[k]} htmlFor={id(k)} error={errores[k]} hint={hint}>
      {control}
    </Field>
  );
  const aria = (k: string) => ({ id: id(k), "aria-invalid": errores[k] ? true : undefined, className: "h-10 text-[14px]" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
      className="space-y-4"
    >
      <p className="text-[13px] font-semibold text-ink">Corregir fila {numero}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {campo(
          "especie",
          <Select {...aria("especie")} value={especie || v.especie || ""} onChange={set("especie")}>
            <option value="">—</option>
            {!especie && v.especie && <option value={v.especie}>«{v.especie}» (no existe)</option>}
            <option value="BUB">Bubalino</option>
            <option value="BOV">Bovino</option>
          </Select>,
        )}
        {campo(
          "sexo",
          <Select {...aria("sexo")} value={v.sexo === "H" || v.sexo === "M" ? v.sexo : ""} onChange={set("sexo")}>
            <option value="">—</option>
            <option value="H">Hembra</option>
            <option value="M">Macho</option>
          </Select>,
        )}
        {campo(
          "categoria",
          <Select {...aria("categoria")} value={valorSelect(cats, v.categoria)} onChange={set("categoria")}>
            {opciones(cats, v.categoria)}
          </Select>,
        )}
        {campo(
          "raza",
          <Select {...aria("raza")} value={valorSelect(rzs, v.raza)} onChange={set("raza")}>
            {opciones(rzs, v.raza)}
          </Select>,
        )}
        {campo("fecha_nacimiento", <Input {...aria("fecha_nacimiento")} value={v.fecha_nacimiento ?? ""} onChange={set("fecha_nacimiento")} placeholder="AAAA-MM-DD" inputMode="numeric" />)}
        {campo(
          "nacimiento_estimado",
          <Select {...aria("nacimiento_estimado")} value={v.nacimiento_estimado === "si" ? "si" : v.nacimiento_estimado ? "no" : ""} onChange={set("nacimiento_estimado")}>
            <option value="">—</option>
            <option value="si">Sí, estimada</option>
            <option value="no">No, exacta</option>
          </Select>,
        )}
        {campo("caravana", <Input {...aria("caravana")} value={v.caravana ?? ""} onChange={set("caravana")} />)}
        {campo("caravana_oficial", <Input {...aria("caravana_oficial")} value={v.caravana_oficial ?? ""} onChange={set("caravana_oficial")} />)}
        {campo("rfid", <Input {...aria("rfid")} value={v.rfid ?? ""} onChange={set("rfid")} inputMode="numeric" maxLength={20} />, v.rfid ? `${v.rfid.replace(/\D/g, "").length}/15 dígitos` : undefined)}
        {campo("tatuaje", <Input {...aria("tatuaje")} value={v.tatuaje ?? ""} onChange={set("tatuaje")} />)}
        {campo("marca", <Input {...aria("marca")} value={v.marca ?? ""} onChange={set("marca")} />)}
        {campo(
          "denticion",
          <Select {...aria("denticion")} value={["leche", "2", "4", "6+"].includes(v.denticion ?? "") ? v.denticion : ""} onChange={set("denticion")}>
            <option value="">—</option>
            <option value="leche">Leche</option>
            <option value="2">2 dientes</option>
            <option value="4">4 dientes</option>
            <option value="6+">6 o más</option>
          </Select>,
        )}
        {campo(
          "castrado",
          <Select {...aria("castrado")} value={v.castrado === "si" ? "si" : v.castrado ? "no" : ""} onChange={set("castrado")}>
            <option value="">—</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </Select>,
        )}
        {campo(
          "lote",
          <Select {...aria("lote")} value={valorSelect(lts, v.lote)} onChange={set("lote")}>
            {opciones(lts, v.lote)}
          </Select>,
        )}
        {campo(
          "potrero",
          <Select {...aria("potrero")} value={valorSelect(potreros, v.potrero)} onChange={set("potrero")}>
            {opciones(potreros, v.potrero)}
          </Select>,
        )}
        <div className="col-span-2 md:col-span-3 xl:col-span-3">{campo("senas", <Input {...aria("senas")} value={v.senas ?? ""} onChange={set("senas")} maxLength={2000} />)}</div>
      </div>
      {errores.fila && <Notice tone="danger" title={errores.fila} />}
      {error && <Notice tone="danger" title={error} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={ocupada} icon={ocupada ? <Spinner /> : undefined}>
          {ocupada ? "Revisando…" : "Guardar y revisar"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={ocupada}>
          Cancelar
        </Button>
        <span className="text-[12.5px] text-muted">Lote y potrero tienen que existir en TROPILLA y ser de la misma especie.</span>
        <Button variant="ghost" size="sm" onClick={onDescartar} disabled={ocupada} className="ml-auto text-muted">
          <IconClose size={16} /> Descartar fila
        </Button>
      </div>
    </form>
  );
}
