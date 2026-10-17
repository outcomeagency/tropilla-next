"use client";

import { useState, useTransition } from "react";
import { leerPlanillaFaenaAction, registrarResultadoFaenaAction, type FaenaState, type ResFila } from "@/lib/faena-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { Button, Card, CardBody, CardHeader, Field, Input, Notice, Select, Spinner, Textarea, cx, fieldAria } from "@/components/ui";
import { IconFile, IconPlus, IconTrash, IconUpload } from "@/components/icons";

export type VentaOpcion = { id: string; etiqueta: string };

const VACIA: ResFila = { garron: "" };
const COLS: Array<{ k: keyof ResFila; l: string; w: string; num?: boolean; ph?: string }> = [
  { k: "garron", l: "Garrón", w: "w-[84px]", ph: "101" },
  { k: "identificacion", l: "RFID / caravana", w: "w-[170px]", ph: "032…" },
  { k: "media_a_kg", l: "Media A", w: "w-[84px]", num: true },
  { k: "media_b_kg", l: "Media B", w: "w-[84px]", num: true },
  { k: "peso_kg", l: "Res (kg)", w: "w-[92px]", num: true },
  { k: "categoria", l: "Categoría", w: "w-[110px]" },
  { k: "tipificacion", l: "Tipificación", w: "w-[100px]" },
  { k: "decomiso", l: "Decomiso", w: "w-[120px]" },
];

const n = (v?: string) => Number((v ?? "").replace(/\./g, "").replace(",", ".")) || 0;
const kgFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/**
 * Carga del romaneo / resultado de faena (TPA-67): datos de la tropa, una fila por res (a mano o leídas de la
 * planilla digital del frigorífico) y la venta con la que se concilia. Todo controlado: el reintento con
 * advertencias no pierde lo cargado; el original se sube una sola vez.
 */
export function RomaneoForm({ ventas, ventaInicial }: { ventas: VentaOpcion[]; ventaInicial?: string }) {
  const { state, formAction, pending, f, idem } = useActionForm<FaenaState>(registrarResultadoFaenaAction);
  const [v, setV] = useState<Record<string, string>>({ operacion_id: ventaInicial ?? "" });
  const [reses, setReses] = useState<ResFila[]>([{ ...VACIA }, { ...VACIA }, { ...VACIA }]);
  const [origen, setOrigen] = useState<"declarado" | "importado">("declarado");
  const [archivo, setArchivo] = useState<string>("");
  const [lectura, setLectura] = useState<{ error?: string; errores?: Array<{ fila: number; mensaje: string }>; ok?: string }>({});
  const [leyendo, startLeer] = useTransition();

  const campo = (k: string) => ({
    id: k,
    name: k,
    value: v[k] ?? "",
    onChange: (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value })),
    ...fieldAria(k, f[k]),
  });
  const setCelda = (i: number, k: keyof ResFila, val: string) => setReses((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
  const peso = (r: ResFila) => (r.peso_kg ? n(r.peso_kg) : r.media_a_kg && r.media_b_kg ? n(r.media_a_kg) + n(r.media_b_kg) : 0);
  const cargadas = reses.filter((r) => r.garron.trim() || r.peso_kg || r.media_a_kg);
  const totalKg = cargadas.reduce((s, r) => s + peso(r), 0);
  const errFila = (i: number) => Object.entries(f).find(([k]) => k.startsWith(`reses.${i}.`))?.[1];

  function onArchivo(file: File | null) {
    setArchivo(file?.name ?? "");
    setLectura({});
    if (!file || !/\.(csv|txt|xlsx)$/i.test(file.name)) {
      setOrigen("declarado");
      return;
    }
    const fd = new FormData();
    fd.set("archivo", file);
    startLeer(async () => {
      const r = await leerPlanillaFaenaAction(fd);
      if (r.error || !r.reses) return setLectura({ error: r.error ?? "No pudimos leer la planilla." });
      setReses(r.reses.length ? r.reses : [{ ...VACIA }]);
      setOrigen("importado");
      setLectura({ errores: r.errores, ok: `Leímos ${r.reses.length} reses de la planilla. Revisalas antes de registrar.` });
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={idem} />
      <input type="hidden" name="origen" value={origen} />
      <input type="hidden" name="reses" value={JSON.stringify(cargadas)} />
      {state.documento_id && <input type="hidden" name="documento_id" value={state.documento_id} />}

      <Card>
        <CardHeader title="Original del frigorífico" description="Adjuntá el romaneo o resultado de faena que te mandaron. Si es la planilla digital (CSV o Excel), leemos las reses por vos." />
        <CardBody className="space-y-3">
          <Field
            label="Romaneo, planilla o foto"
            htmlFor="archivo"
            optional={origen !== "importado"}
            error={f.archivo}
            hint="PDF, foto (JPG, PNG) o planilla CSV/XLSX, hasta 10 MB. Queda en Documentos como comercial privado."
          >
            <label
              htmlFor="archivo"
              className={cx(
                "flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-dashed border-border-strong bg-surface px-4 py-3 text-[14px] text-muted hover:border-campo",
                f.archivo && "border-danger",
              )}
            >
              {leyendo ? <Spinner size={18} /> : archivo ? <IconFile size={20} className="shrink-0 text-campo" /> : <IconUpload size={20} className="shrink-0" />}
              <span className="min-w-0 truncate">{leyendo ? "Leyendo la planilla…" : archivo || "Elegí el archivo"}</span>
              {state.documento_id && <span className="ml-auto shrink-0 text-[12.5px] text-success">Ya subido</span>}
            </label>
            <input
              id="archivo"
              name="archivo"
              type="file"
              className="sr-only"
              accept=".pdf,.csv,.txt,.xlsx,image/jpeg,image/png,image/webp,image/heic"
              onChange={(e) => onArchivo(e.target.files?.[0] ?? null)}
            />
          </Field>
          {lectura.error && <Notice tone="danger" title={lectura.error} />}
          {lectura.ok && (
            <Notice tone={lectura.errores?.length ? "warning" : "success"} title={lectura.ok}>
              {!!lectura.errores?.length && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {lectura.errores.slice(0, 8).map((e, i) => (
                    <li key={i}>
                      Fila {e.fila} de la planilla: {e.mensaje}
                    </li>
                  ))}
                </ul>
              )}
            </Notice>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Datos de la tropa" description="Tal como figuran en el romaneo. El número de tropa y el DT-e ayudan a encontrarlo después." />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Frigorífico" htmlFor="frigorifico" error={f.frigorifico}>
            <Input {...campo("frigorifico")} maxLength={200} required placeholder="Frigorífico del Litoral S.A." />
          </Field>
          <Field label="CUIT del frigorífico" htmlFor="frigorifico_cuit" optional error={f.frigorifico_cuit}>
            <Input {...campo("frigorifico_cuit")} maxLength={20} inputMode="numeric" />
          </Field>
          <Field label="Fecha de faena" htmlFor="fecha_faena" error={f.fecha_faena}>
            <Input {...campo("fecha_faena")} type="date" required />
          </Field>
          <Field label="N.º de tropa" htmlFor="tropa_numero" optional error={f.tropa_numero}>
            <Input {...campo("tropa_numero")} maxLength={40} />
          </Field>
          <Field label="N.º de romaneo" htmlFor="romaneo_numero" optional error={f.romaneo_numero}>
            <Input {...campo("romaneo_numero")} maxLength={40} />
          </Field>
          <Field label="N.º de DT-e" htmlFor="dte_numero" optional error={f.dte_numero}>
            <Input {...campo("dte_numero")} maxLength={40} />
          </Field>
          <Field label="Cabezas de la tropa" htmlFor="cabezas_declaradas" optional error={f.cabezas_declaradas}>
            <Input {...campo("cabezas_declaradas")} type="number" min={1} max={5000} inputMode="numeric" />
          </Field>
          <Field label="N.º de establecimiento faenador" htmlFor="faenador_numero" optional error={f.faenador_numero}>
            <Input {...campo("faenador_numero")} maxLength={40} />
          </Field>
          <Field label="Tipificador" htmlFor="tipificador" optional error={f.tipificador}>
            <Input {...campo("tipificador")} maxLength={200} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Reses"
          description="Una fila por res. Si el romaneo trae las dos medias, el peso de la res se calcula solo. Con la caravana o el RFID, TROPILLA la asocia al animal."
          action={
            <span className="text-[13px] tabular-nums text-muted">
              {cargadas.length} reses · {kgFmt.format(totalKg)} kg
            </span>
          }
        />
        {f.reses && (
          <div className="px-5 pt-3">
            <Notice tone="danger" title={f.reses} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-[14px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] font-medium text-muted">
                <th className="w-10 px-3 py-2 font-medium">#</th>
                {COLS.map((c) => (
                  <th key={c.k} className={cx("px-1.5 py-2 font-medium", c.num && "text-right")}>
                    {c.l}
                  </th>
                ))}
                <th className="w-10 px-2 py-2">
                  <span className="sr-only">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {reses.map((r, i) => {
                const err = errFila(i);
                const calc = !r.peso_kg && r.media_a_kg && r.media_b_kg ? kgFmt.format(peso(r)) : "";
                return (
                  <tr key={i} className={cx("border-b border-border align-top", err && "bg-danger-bg")}>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-muted">{i + 1}</td>
                    {COLS.map((c) => (
                      <td key={c.k} className={cx("px-1.5 py-1.5", c.w)}>
                        <input
                          aria-label={`${c.l}, fila ${i + 1}`}
                          value={r[c.k] ?? ""}
                          onChange={(e) => setCelda(i, c.k, e.target.value)}
                          inputMode={c.num ? "decimal" : undefined}
                          placeholder={c.k === "peso_kg" && calc ? calc : i === 0 ? c.ph : undefined}
                          className={cx(
                            "h-9 w-full rounded-[7px] border border-border-strong bg-surface px-2 text-[14px] text-ink placeholder:text-subtle focus:border-campo focus:outline-none",
                            c.num && "text-right tabular-nums",
                          )}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        aria-label={`Quitar fila ${i + 1}`}
                        onClick={() => setReses((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ ...VACIA }]))}
                        className="grid h-9 w-9 place-items-center rounded-[7px] text-subtle hover:bg-surface-2 hover:text-danger"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {Object.entries(f).some(([k]) => k.startsWith("reses.")) && (
          <ul className="space-y-1 px-5 pt-3 text-[13px] text-danger">
            {Object.entries(f)
              .filter(([k]) => k.startsWith("reses."))
              .map(([k, m]) => (
                <li key={k}>
                  Fila {Number(k.split(".")[1]) + 1}: {m}
                </li>
              ))}
          </ul>
        )}
        <div className="px-5 py-3">
          <Button type="button" variant="outline" size="sm" icon={<IconPlus size={16} />} onClick={() => setReses((rs) => [...rs, { ...VACIA }])}>
            Agregar res
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Conciliación" description="Elegí la venta de esta tropa para comparar los animales que mandaste con las reses que te pagan. La podés vincular después." />
        <CardBody className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Venta" htmlFor="operacion_id" optional error={f.operacion_id} hint={ventas.length ? undefined : "No hay ventas registradas. Podés registrar el romaneo igual y vincularla más tarde."}>
            <Select {...campo("operacion_id")}>
              <option value="">Sin vincular por ahora</option>
              {ventas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.etiqueta}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observaciones" htmlFor="observaciones" optional error={f.observaciones}>
            <Textarea {...campo("observaciones")} rows={2} maxLength={2000} className="min-h-[44px]" />
          </Field>
        </CardBody>
      </Card>

      <FormAlerts state={state} pending={pending} confirmLabel="Registrar igual" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || leyendo} icon={pending ? <Spinner /> : undefined}>
          Registrar resultado de faena
        </Button>
        <span className="text-[13px] text-muted">Las reses quedan como las informó el frigorífico: no se editan; si hay un error se anula y se vuelve a cargar.</span>
      </div>
    </form>
  );
}
