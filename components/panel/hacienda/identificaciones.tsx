"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { identificacionAction, type IdentificacionState } from "@/lib/identificacion-actions";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useDialogForm } from "@/components/panel/form-state";
import { ChoiceCard } from "@/components/choice";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, Notice, Select, Spinner, Textarea, buttonClass, cx, fieldAria } from "@/components/ui";
import { IconAlert, IconArrowRight, IconClock, IconPlus, IconTag } from "@/components/icons";
import { fecha } from "@/lib/format";
import {
  ENTIDADES_REGISTRO,
  MOTIVOS_RETIRO,
  TIPOS_IDENTIFICACION,
  TIPOS_REGISTRO,
  esUnicaPorAnimal,
  normalizarIdent,
  tipoIdentLabel,
  type TipoIdentificacion,
} from "@/lib/identificaciones";
import type { Identificacion, MovimientoIdentificacion } from "@/lib/data/hacienda";

type Modo = { k: "agregar"; tipo?: TipoIdentificacion } | { k: "reponer"; ident: Identificacion } | { k: "retirar"; ident: Identificacion };

const VALOR_LABEL: Record<string, string> = {
  caravana_visual: "Número de caravana",
  caravana_oficial: "Número de caravana oficial",
  rfid: "Número RFID",
  tatuaje: "Tatuaje",
  marca_senal: "Marca o señal",
  registro_genealogico: "Número de registro",
};

/**
 * Identificaciones del animal (TPA-19): vigentes con reponer/retirar, historial
 * con motivo y autor, y alta por tipo. Todo es un evento `hacienda.identificacion`:
 * nada se borra, la anterior queda no vigente.
 */
export function IdentificacionesPanel({
  animalId,
  identificaciones,
  movimientos,
  puedeEditar,
  prefijoTatuaje,
  razaNombre,
  hoy,
}: {
  animalId: string;
  identificaciones: Identificacion[];
  movimientos: MovimientoIdentificacion[];
  puedeEditar: boolean;
  prefijoTatuaje?: string | null;
  razaNombre?: string | null;
  hoy: string;
}) {
  const [modo, setModo] = useState<Modo>({ k: "agregar" });
  const form = useDialogForm<IdentificacionState>(identificacionAction);
  const abrir = (m: Modo) => {
    setModo(m);
    form.abrir();
  };

  const vigentes = identificaciones.filter((i) => i.vigente !== false);
  const retiradas = identificaciones.filter((i) => i.vigente === false);
  const faltan = TIPOS_IDENTIFICACION.filter((t) => !vigentes.some((v) => v.tipo === t.k));

  /** Motivo, autor y reemplazo de cada retirada, cruzado con sus eventos. */
  const salida = (i: Identificacion) => {
    const k = `${i.tipo}|${normalizarIdent(i.valor)}`;
    const ev = [...movimientos]
      .filter((m) => !m.anulado)
      .reverse()
      .find((m) =>
        m.accion === "retiro"
          ? `${m.identificacion.tipo}|${normalizarIdent(m.identificacion.valor)}` === k
          : m.reemplaza
            ? `${m.reemplaza.tipo}|${normalizarIdent(m.reemplaza.valor)}` === k
            : m.identificacion.tipo === i.tipo && m.ocurrido_en === i.retirada_en && normalizarIdent(m.identificacion.valor) !== normalizarIdent(i.valor),
      );
    return {
      motivo: ev?.observaciones?.replace(/^Motivo: /, "").replace(/\.$/, "") ?? null,
      autor: ev?.autor ?? null,
      reemplazo: ev && ev.accion !== "retiro" ? ev.identificacion.valor : null,
    };
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {form.ok && <Notice tone="success" title={form.ok.mensaje} />}
        <Card>
          <CardHeader
            title="Identificaciones vigentes"
            description="Una vigente por tipo dentro del establecimiento. Al reponer, la anterior pasa al historial."
            action={
              puedeEditar && (
                <Button size="sm" icon={<IconPlus size={16} />} onClick={() => abrir({ k: "agregar" })}>
                  Agregar
                </Button>
              )
            }
          />
          {vigentes.length ? (
            <ul className="divide-y divide-border">
              {vigentes.map((i) => (
                <li key={`${i.tipo}${i.valor}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-crema text-monte">
                    <IconTag size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-muted">
                      {tipoIdentLabel(i.tipo)}
                      {i.entidad && ` · ${i.entidad}`}
                      {i.tipo_registro && ` ${i.tipo_registro}`}
                    </p>
                    <p className="break-all text-[17px] font-semibold tabular-nums text-ink">{i.valor}</p>
                  </div>
                  <div className="flex w-full items-center gap-3 pl-14 sm:w-auto sm:pl-0">
                    {i.en_conflicto && (
                      <Badge tone="warning" icon={<IconAlert size={14} />}>
                        En conflicto
                      </Badge>
                    )}
                    {i.colocada_en && <span className="text-[13px] tabular-nums text-muted">Desde {fecha(i.colocada_en)}</span>}
                  </div>
                  {puedeEditar && (
                    <div className="flex w-full justify-end gap-1 sm:w-auto">
                      <Button size="sm" variant="ghost" onClick={() => abrir({ k: "reponer", ident: i })}>
                        Reponer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => abrir({ k: "retirar", ident: i })}>
                        Retirar
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<IconTag size={24} />}
              title="Sin identificaciones vigentes"
              description="Cargá la caravana, el RFID o el tatuaje para encontrar este animal en la búsqueda y en la manga."
              action={
                puedeEditar && (
                  <Button size="md" icon={<IconPlus size={16} />} onClick={() => abrir({ k: "agregar" })}>
                    Agregar identificación
                  </Button>
                )
              }
            />
          )}
          {vigentes.some((i) => i.en_conflicto) && (
            <div className="border-t border-border px-5 py-3">
              <p className="flex gap-2 text-[13px] text-warning">
                <IconAlert size={16} className="mt-0.5 shrink-0" />
                Llegó desde el campo la misma identificación vigente en otro animal. Quedó abierta una revisión: retirala del animal que no corresponde.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Historial" description="Las identificaciones retiradas o repuestas no se borran: quedan con su fecha, motivo y quién lo registró." />
          {retiradas.length ? (
            <ul className="divide-y divide-border">
              {retiradas.map((i, n) => {
                const s = salida(i);
                return (
                  <li key={`${i.tipo}${i.valor}${n}`} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-border text-subtle">
                      <IconClock size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-muted">
                        {tipoIdentLabel(i.tipo)}
                        {i.entidad && ` · ${i.entidad}`}
                        {i.tipo_registro && ` ${i.tipo_registro}`}
                      </p>
                      <p className="flex flex-wrap items-baseline gap-x-2 text-[15.5px] font-semibold tabular-nums text-muted">
                        {i.valor}
                        {s.reemplazo && (
                          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink">
                            <IconArrowRight size={14} className="text-muted" /> {s.reemplazo}
                          </span>
                        )}
                      </p>
                      {(s.motivo || s.autor) && (
                        <p className="mt-0.5 text-[13px] text-muted">
                          {s.motivo}
                          {s.motivo && s.autor && " · "}
                          {s.autor}
                        </p>
                      )}
                    </div>
                    <div className="flex w-full items-center gap-3 pl-14 sm:block sm:w-auto sm:pl-0 sm:text-right">
                      <Badge tone="neutral">{s.reemplazo ? "Repuesta" : "Retirada"}</Badge>
                      <p className="text-[12.5px] tabular-nums text-muted sm:mt-1">
                        {i.colocada_en ? fecha(i.colocada_en) : "—"} → {fecha(i.retirada_en) || "—"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <CardBody>
              <p className="text-[14px] text-muted">Todavía no se retiró ni se repuso ninguna identificación de este animal.</p>
            </CardBody>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {puedeEditar && faltan.length > 0 && (
          <Card>
            <CardHeader title="Agregar por tipo" />
            <ul className="divide-y divide-border">
              {faltan.map((t) => (
                <li key={t.k}>
                  <button
                    type="button"
                    onClick={() => abrir({ k: "agregar", tipo: t.k })}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">{t.l}</span>
                      <span className="block text-[12.5px] text-muted">{t.d}</span>
                    </span>
                    <IconPlus size={16} className="shrink-0 text-campo" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <CardHeader title="Cómo se busca" />
          <CardBody className="space-y-2 text-[13.5px] leading-relaxed text-muted">
            <p>En Hacienda podés buscar por cualquier identificación vigente: caravana, RFID, tatuaje o registro. Los ceros a la izquierda no hacen falta.</p>
            <p>Con el bastón RFID en modo teclado, tocá el campo del número y leé la caravana: se carga sola.</p>
          </CardBody>
        </Card>
      </div>

      <Dialog
        size={modo.k === "agregar" ? "lg" : "md"}
        open={form.open}
        onClose={form.cerrar}
        title={modo.k === "agregar" ? "Agregar identificación" : modo.k === "reponer" ? "Reponer identificación" : "Retirar identificación"}
        description={
          modo.k === "retirar"
            ? "Deja de estar vigente y queda en el historial con el motivo."
            : modo.k === "reponer"
              ? "La anterior queda en el historial; la nueva pasa a ser la vigente."
              : "Queda registrada como evento, con fecha y autor."
        }
      >
        {form.open && (
          <IdentForm
            key={`${modo.k}${"ident" in modo ? modo.ident.tipo + modo.ident.valor : (modo.tipo ?? "")}`}
            modo={modo}
            form={form}
            animalId={animalId}
            vigentes={vigentes}
            prefijoTatuaje={prefijoTatuaje}
            razaNombre={razaNombre}
            hoy={hoy}
          />
        )}
      </Dialog>
    </div>
  );
}

function IdentForm({
  modo,
  form,
  animalId,
  vigentes,
  prefijoTatuaje,
  razaNombre,
  hoy,
}: {
  modo: Modo;
  form: ReturnType<typeof useDialogForm<IdentificacionState>>;
  animalId: string;
  vigentes: Identificacion[];
  prefijoTatuaje?: string | null;
  razaNombre?: string | null;
  hoy: string;
}) {
  const { state, formAction, pending, f, idem, cerrar } = form;
  const [tipo, setTipo] = useState<string>(modo.k === "agregar" ? (modo.tipo ?? "caravana_visual") : modo.ident.tipo);
  const [motivo, setMotivo] = useState("");

  // Agregar un tipo que ya tiene vigente (y es único por animal) = reposición de esa.
  const previa = modo.k === "agregar" && esUnicaPorAnimal(tipo) ? vigentes.find((v) => v.tipo === tipo) : modo.k === "reponer" ? modo.ident : undefined;
  const accion = modo.k === "retirar" ? "retiro" : previa ? "reposicion" : "colocacion";
  const objetivo = "ident" in modo ? modo.ident : null;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="animal_id" value={animalId} />
      <input type="hidden" name="accion" value={accion} />
      {modo.k !== "agregar" && <input type="hidden" name="tipo" value={tipo} />}
      {modo.k === "retirar" && objetivo && <input type="hidden" name="valor" value={objetivo.valor} />}
      {previa && (
        <>
          <input type="hidden" name="reemplaza_tipo" value={previa.tipo} />
          <input type="hidden" name="reemplaza_valor" value={previa.valor} />
        </>
      )}
      <DialogBody>
        {state.duplicado ? (
          <div role="alert" className="rounded-[10px] border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            <p className="flex items-center gap-2 font-semibold">
              <IconAlert size={18} className="shrink-0" /> {state.error}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 pl-7">
              <span>
                La tiene <strong className="tabular-nums">{state.duplicado.nombre}</strong>
                {state.duplicado.categoria && ` · ${state.duplicado.categoria}`}. Revisá el número o retirala primero de ese animal.
              </span>
              <Link href={`/hacienda/${state.duplicado.id}?tab=identificaciones`} className={buttonClass("outline", "sm")}>
                Abrir ficha <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <FormAlerts state={state} pending={pending} />
        )}

        {objetivo && (
          <div className="flex items-center gap-3 rounded-[12px] border border-border bg-base px-4 py-3">
            <IconTag size={20} className="shrink-0 text-monte" />
            <div className="min-w-0">
              <p className="text-[12.5px] text-muted">{modo.k === "reponer" ? "Se reemplaza" : "Se retira"}</p>
              <p className="text-[15px] font-semibold tabular-nums text-ink">
                {tipoIdentLabel(objetivo.tipo)} {objetivo.valor}
              </p>
            </div>
          </div>
        )}

        {modo.k === "agregar" && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-ink">Tipo</legend>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {TIPOS_IDENTIFICACION.map((t) => (
                <ChoiceCard
                  key={t.k}
                  name="tipo"
                  value={t.k}
                  title={t.l}
                  description={t.d}
                  checked={tipo === t.k}
                  onChange={() => setTipo(t.k)}
                  className="p-3"
                />
              ))}
            </div>
            {f.tipo && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{f.tipo}</p>}
          </fieldset>
        )}

        {modo.k === "agregar" && previa && (
          <Notice tone="info" title={`Ya tiene ${tipoIdentLabel(previa.tipo).toLowerCase()} ${previa.valor} vigente`}>
            Al guardar, esa queda retirada en el historial y la nueva pasa a ser la vigente.
          </Notice>
        )}

        {modo.k !== "retirar" && (
          <>
            <ValorInput key={tipo} tipo={tipo} error={f.valor} prefijoTatuaje={prefijoTatuaje} razaNombre={razaNombre} />
            {tipo === "registro_genealogico" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Entidad" htmlFor="entidad" error={f.entidad} hint="AACB, SRA u otra.">
                  <Input
                    id="entidad"
                    name="entidad"
                    list="entidades-registro"
                    maxLength={60}
                    defaultValue={objetivo?.entidad ?? ""}
                    {...fieldAria("entidad", f.entidad, true)}
                  />
                  <datalist id="entidades-registro">
                    {ENTIDADES_REGISTRO.map((e) => (
                      <option key={e} value={e} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Tipo de registro" htmlFor="tipo_registro" optional error={f.tipo_registro}>
                  <Select id="tipo_registro" name="tipo_registro" defaultValue={objetivo?.tipo_registro ?? ""} {...fieldAria("tipo_registro", f.tipo_registro)}>
                    <option value="">Sin indicar</option>
                    {TIPOS_REGISTRO.map((t) => (
                      <option key={t} value={t}>
                        {t === "otro" ? "Otro" : t}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </>
        )}

        {accion !== "colocacion" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={modo.k === "retirar" ? "Motivo del retiro" : "Motivo del cambio"} htmlFor="motivo" error={f.motivo}>
              <Select id="motivo" name="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} {...fieldAria("motivo", f.motivo)}>
                <option value="" disabled>
                  Elegí el motivo
                </option>
                {MOTIVOS_RETIRO.map((m) => (
                  <option key={m.k} value={m.k}>
                    {m.l}
                  </option>
                ))}
              </Select>
            </Field>
            {motivo === "otro" && (
              <Field label="¿Cuál?" htmlFor="motivo_otro" error={f.motivo_otro}>
                <Input id="motivo_otro" name="motivo_otro" maxLength={120} {...fieldAria("motivo_otro", f.motivo_otro)} />
              </Field>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={modo.k === "retirar" ? "Fecha del retiro" : "Fecha de colocación"} htmlFor="fecha" error={f.fecha}>
            <Input id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} {...fieldAria("fecha", f.fecha)} />
          </Field>
        </div>
        <Field label="Observaciones" htmlFor="observaciones" optional>
          <Textarea id="observaciones" name="observaciones" rows={2} className="min-h-[64px]" maxLength={500} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={cerrar}>
          Cancelar
        </Button>
        <Button type="submit" variant={modo.k === "retirar" ? "outline" : "primary"} disabled={pending} icon={pending ? <Spinner /> : undefined}>
          {modo.k === "retirar" ? "Retirar" : accion === "reposicion" ? "Reponer" : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Campo del número según el tipo: RFID con contador de 15 dígitos (bastón en modo teclado), tatuaje con prefijo de raza. */
function ValorInput({ tipo, error, prefijoTatuaje, razaNombre }: { tipo: string; error?: string; prefijoTatuaje?: string | null; razaNombre?: string | null }) {
  const [v, setV] = useState(tipo === "tatuaje" && prefijoTatuaje ? `${prefijoTatuaje}-` : "");
  const digitos = v.replace(/\D/g, "").length;
  const rfid = tipo === "rfid";

  // El bastón en modo teclado «tipea» el número y manda Enter: no enviar hasta tener los 15 dígitos.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (rfid && e.key === "Enter" && digitos !== 15) e.preventDefault();
  };

  const hint = rfid ? (
    <span className={cx("tabular-nums", digitos === 15 && "font-medium text-success")}>
      {digitos} de 15 dígitos · con el bastón en modo teclado, tocá acá y leé la caravana.
    </span>
  ) : tipo === "tatuaje" && prefijoTatuaje ? (
    `${razaNombre ?? "Esta raza"}: el tatuaje empieza con ${prefijoTatuaje}.`
  ) : tipo === "caravana_visual" ? (
    "Tal como está en la caravana; los ceros a la izquierda se respetan."
  ) : undefined;

  return (
    <Field label={VALOR_LABEL[tipo] ?? "Valor"} htmlFor="valor" error={error} hint={hint}>
      <Input
        id="valor"
        name="valor"
        autoFocus
        autoComplete="off"
        value={v}
        onChange={(e) => setV(rfid ? e.target.value.replace(/[^\d ]/g, "") : e.target.value)}
        onKeyDown={onKeyDown}
        inputMode={rfid ? "numeric" : undefined}
        maxLength={rfid ? 19 : 64}
        placeholder={rfid ? "032 000123456789" : tipo === "tatuaje" ? `${prefijoTatuaje ?? ""}0142` : tipo === "marca_senal" ? "Ej.: DR" : undefined}
        className="tabular-nums"
        {...fieldAria("valor", error, !!hint)}
      />
    </Field>
  );
}
