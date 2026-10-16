"use client";

import Link from "next/link";
import { useState, type ComponentType, type ReactNode } from "react";
import { archivarLoteAction, eventoLoteAction, guardarLoteAction, individualizarAction } from "@/lib/lote-actions";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useDialogForm } from "@/components/panel/form-state";
import { ChoiceChip, SwitchRow } from "@/components/choice";
import { ConteoInputs } from "@/components/panel/lotes/conteo";
import { Button, Field, Input, Notice, Select, Spinner, Textarea, cx, fieldAria } from "@/components/ui";
import { IconArrowDown, IconChart, IconChevronRight, IconClose, IconMap, IconPlus, IconScale, IconSyringe, IconTag, type IconProps } from "@/components/icons";
import { PROPOSITOS, type CategoriaOpcion } from "@/lib/lotes";
import { uuidv7 } from "@/lib/uuid";

type Opt = { codigo: string; nombre: string };

export interface LoteManejo {
  id: string;
  nombre: string;
  especie: "BOV" | "BUB";
  anonimo: boolean;
  potreroId: string | null;
  conteo: Record<string, number>;
  total: number;
}

const nf = new Intl.NumberFormat("es-AR");

/* ───────────── Fila de acción (abre un diálogo o navega) ───────────── */

function FilaAccion({
  icon: Icon,
  titulo,
  ayuda,
  onClick,
  href,
  disabled,
  children,
}: {
  icon: ComponentType<IconProps>;
  titulo: string;
  ayuda: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  /** Diálogo asociado (queda dentro del <li>). */
  children?: ReactNode;
}) {
  const cls = cx(
    "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
    disabled ? "cursor-not-allowed opacity-55" : "hover:bg-surface-2",
  );
  const body = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-campo-50 text-monte">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-ink">{titulo}</span>
        <span className="block text-[12.5px] leading-snug text-muted">{ayuda}</span>
      </span>
      <IconChevronRight size={18} className="shrink-0 text-subtle" />
    </>
  );
  return (
    <li className="border-b border-border last:border-b-0">
      {href && !disabled ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className={cls}>
          {body}
        </button>
      )}
      {children}
    </li>
  );
}

/* ───────────── Evento grupal genérico sobre el lote ───────────── */

function EventoDialog({
  op,
  lote,
  hoy,
  icon,
  titulo,
  ayuda,
  dialogTitulo,
  dialogAyuda,
  submit,
  disabled,
  children,
}: {
  op: "traslado" | "alta" | "pesaje" | "baja";
  lote: LoteManejo;
  hoy: string;
  icon: ComponentType<IconProps>;
  titulo: string;
  ayuda: string;
  dialogTitulo: string;
  dialogAyuda: string;
  submit: string;
  disabled?: boolean;
  children: (f: Record<string, string>) => ReactNode;
}) {
  const { state, formAction, pending, f, idem, open, abrir, cerrar } = useDialogForm(eventoLoteAction);
  return (
    <FilaAccion icon={icon} titulo={titulo} ayuda={ayuda} onClick={abrir} disabled={disabled}>
      <Dialog open={open} onClose={cerrar} title={dialogTitulo} description={dialogAyuda}>
        <form action={formAction} noValidate>
          <input type="hidden" name="op" value={op} />
          <input type="hidden" name="lote_id" value={lote.id} />
          <input type="hidden" name="idem" value={idem} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            {children(f)}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Fecha" htmlFor={`fecha_${op}`} error={f.ocurrido_en}>
                <Input id={`fecha_${op}`} name="ocurrido_en" type="date" defaultValue={hoy} max={hoy} {...fieldAria(`fecha_${op}`, f.ocurrido_en)} />
              </Field>
              <Field label="Observaciones" htmlFor={`obs_${op}`} optional>
                <Input id={`obs_${op}`} name="observaciones" maxLength={500} />
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              {submit}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </FilaAccion>
  );
}

/* ───────────── Baja (muerte o salida) ───────────── */

function BajaCampos({ f, causas }: { f: Record<string, string>; causas: Opt[] }) {
  const [tipo, setTipo] = useState<"muerte" | "salida">("muerte");
  const [causa, setCausa] = useState("");
  return (
    <>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">¿Qué pasó?</legend>
        <div className="flex flex-wrap gap-2">
          <ChoiceChip type="radio" name="baja" value="muerte" label="Muerte" checked={tipo === "muerte"} onChange={() => setTipo("muerte")} />
          <ChoiceChip type="radio" name="baja" value="salida" label="Venta o salida del campo" checked={tipo === "salida"} onChange={() => setTipo("salida")} />
        </div>
      </fieldset>
      {tipo === "muerte" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Causa" htmlFor="causa" error={f.causa}>
            <Select id="causa" name="causa" value={causa} onChange={(e) => setCausa(e.target.value)} {...fieldAria("causa", f.causa)}>
              <option value="">
                Elegí la causa
              </option>
              {causas.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          {causa === "otra" && (
            <Field label="¿Cuál?" htmlFor="causa_otra" optional>
              <Input id="causa_otra" name="causa_otra" maxLength={120} />
            </Field>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Motivo" htmlFor="motivo" error={f.motivo}>
            <Select id="motivo" name="motivo" defaultValue="venta" {...fieldAria("motivo", f.motivo)}>
              <option value="venta">Venta</option>
              <option value="traslado_externo">Traslado a otro campo</option>
              <option value="otro">Otro</option>
            </Select>
          </Field>
          <Field label="Comprador o destino" htmlFor="comprador" optional>
            <Input id="comprador" name="comprador" maxLength={120} placeholder="Ej. Frigorífico Goya" />
          </Field>
        </div>
      )}
    </>
  );
}

/* ───────────── Individualizar ───────────── */

function Individualizar({ lote, categorias, razas, hoy }: { lote: LoteManejo; categorias: CategoriaOpcion[]; razas: Opt[]; hoy: string }) {
  const { state, formAction, pending, f, idem, open, abrir, cerrar } = useDialogForm(individualizarAction);
  const conCabezas = categorias.filter((c) => (lote.conteo[c.codigo] ?? 0) > 0);
  const [categoria, setCategoria] = useState(conCabezas[0]?.codigo ?? "");
  const [filas, setFilas] = useState<string[]>(() => [uuidv7()]);
  const cat = categorias.find((c) => c.codigo === categoria);
  const disponibles = lote.conteo[categoria] ?? 0;
  const tope = Math.min(disponibles, 50);

  function cantidad(n: number) {
    const k = Math.max(1, Math.min(tope || 1, n));
    setFilas((s) => (k > s.length ? [...s, ...Array.from({ length: k - s.length }, () => uuidv7())] : s.slice(0, k)));
  }

  return (
    <FilaAccion
      icon={IconTag}
      titulo="Individualizar animales"
      ayuda={conCabezas.length ? "Caravaneás cabezas del conteo: nacen del lote y heredan su historia." : "No quedan cabezas por cantidades para caravanear."}
      onClick={abrir}
      disabled={!conCabezas.length}
    >
      <Dialog
        open={open}
        onClose={cerrar}
        size="lg"
        title={`Individualizar desde ${lote.nombre}`}
        description="Cada animal sale del conteo de su categoría, recibe ficha propia y hereda la historia grupal del lote (vacunas, pesajes, traslados)."
      >
        <form action={formAction} noValidate>
          <input type="hidden" name="lote_id" value={lote.id} />
          <input type="hidden" name="especie" value={lote.especie} />
          <input type="hidden" name="idem" value={idem} />
          <input type="hidden" name="disponibles" value={disponibles} />
          {filas.map((aid, i) => (
            <input key={aid} type="hidden" name={`aid_${i}`} value={aid} />
          ))}
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Categoría" htmlFor="ind_categoria" hint={`Hay ${nf.format(disponibles)} en el conteo.`} error={f.categoria}>
                <Select id="ind_categoria" name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {conCabezas.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.nombre} ({nf.format(lote.conteo[c.codigo] ?? 0)})
                    </option>
                  ))}
                </Select>
              </Field>
              {cat?.sexo ? (
                <>
                  <input type="hidden" name="sexo" value={cat.sexo} />
                  <Field label="Sexo" htmlFor="ind_sexo_fijo" hint="Lo define la categoría.">
                    <Input id="ind_sexo_fijo" value={cat.sexo === "H" ? "Hembra" : "Macho"} readOnly disabled className="bg-surface-2 text-muted" />
                  </Field>
                </>
              ) : (
                <Field label="Sexo" htmlFor="ind_sexo" error={f.sexo}>
                  <Select id="ind_sexo" name="sexo" defaultValue="">
                    <option value="">
                      Elegí
                    </option>
                    <option value="H">Hembra</option>
                    <option value="M">Macho</option>
                  </Select>
                </Field>
              )}
              <Field label="Raza" htmlFor="ind_raza" optional>
                <Select id="ind_raza" name="raza" defaultValue="">
                  <option value="">Sin dato</option>
                  {razas.map((r) => (
                    <option key={r.codigo} value={r.codigo}>
                      {r.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <fieldset aria-describedby={f.caravanas ? "caravanas-error" : "caravanas-hint"}>
              <legend className="mb-1.5 flex w-full flex-wrap items-baseline justify-between gap-2 text-[13px] font-semibold text-ink">
                <span>
                  Animales a individualizar <span className="font-normal tabular-nums text-muted">· {filas.length}</span>
                </span>
                <span className="flex items-center gap-2 text-[12.5px] font-normal text-muted">
                  <label htmlFor="ind_cant">Cantidad</label>
                  <input
                    id="ind_cant"
                    type="number"
                    min={1}
                    max={tope || 1}
                    value={filas.length}
                    onChange={(e) => cantidad(Number(e.target.value) || 1)}
                    className="h-8 w-20 rounded-[8px] border border-border-strong bg-surface px-2 text-right text-[14px] tabular-nums text-ink"
                  />
                </span>
              </legend>
              <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filas.map((aid, i) => (
                  <li key={aid} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-right text-[12.5px] tabular-nums text-muted">{i + 1}</span>
                    <input
                      name="caravana"
                      aria-label={`Caravana del animal ${i + 1}`}
                      placeholder="Caravana visual (opcional)"
                      maxLength={64}
                      className="h-10 w-full min-w-0 rounded-[var(--radius-control)] border border-border-strong bg-surface px-3 text-[14.5px] tabular-nums text-ink placeholder:text-subtle focus:border-campo focus:outline-none"
                    />
                    {filas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFilas((s) => s.filter((x) => x !== aid))}
                        aria-label={`Quitar animal ${i + 1}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-muted hover:bg-surface-2"
                      >
                        <IconClose size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              {f.caravanas ? (
                <p id="caravanas-error" className="mt-1.5 text-[12.5px] font-medium text-danger">
                  {f.caravanas}
                </p>
              ) : (
                <p id="caravanas-hint" className="mt-1.5 text-[12.5px] text-muted">
                  Si todavía no tiene caravana, dejala vacía: el animal se crea igual y la cargás después en su ficha. Hasta 50 por vez.
                </p>
              )}
              {filas.length < tope && (
                <button type="button" onClick={() => cantidad(filas.length + 1)} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-campo hover:underline">
                  <IconPlus size={16} /> Agregar otro animal
                </button>
              )}
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Fecha" htmlFor="ind_fecha" error={f.ocurrido_en}>
                <Input id="ind_fecha" name="ocurrido_en" type="date" defaultValue={hoy} max={hoy} />
              </Field>
              <Field label="Observaciones" htmlFor="ind_obs" optional>
                <Input id="ind_obs" name="observaciones" maxLength={500} placeholder="Ej. caravaneadas en la manga" />
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !disponibles} icon={pending ? <Spinner /> : undefined}>
              Individualizar {filas.length} {filas.length === 1 ? "animal" : "animales"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </FilaAccion>
  );
}

/* ───────────── Panel «Manejo del lote» ───────────── */

/** Acciones de manejo sobre el lote completo (eventos grupales, TPA-20). */
export function ManejoLote({
  lote,
  categorias,
  potreros,
  razas,
  causas,
  hoy,
  puedeOfertar,
}: {
  lote: LoteManejo;
  categorias: CategoriaOpcion[];
  potreros: Opt[];
  razas: Opt[];
  causas: Opt[];
  hoy: string;
  puedeOfertar: boolean;
}) {
  const otros = potreros.filter((p) => p.codigo !== lote.potreroId);
  const anonimas = Object.values(lote.conteo).reduce((s, n) => s + n, 0);
  return (
    <ul>
      <EventoDialog
        op="traslado"
        lote={lote}
        hoy={hoy}
        icon={IconMap}
        titulo="Mover a otro potrero"
        ayuda={otros.length ? "Traslado del lote completo." : "No hay otro potrero cargado."}
        disabled={!otros.length}
        dialogTitulo={`Mover ${lote.nombre}`}
        dialogAyuda="Se registra un traslado para todo el lote; los animales identificados del lote lo acompañan."
        submit="Registrar traslado"
      >
        {(f) => (
          <>
            {lote.potreroId && <input type="hidden" name="potrero_origen_id" value={lote.potreroId} />}
            <Field label="Potrero de destino" htmlFor="potrero_destino_id" error={f.potrero_destino_id}>
              <Select id="potrero_destino_id" name="potrero_destino_id" defaultValue="" {...fieldAria("potrero_destino_id", f.potrero_destino_id)}>
                <option value="">
                  Elegí el potrero
                </option>
                {otros.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </EventoDialog>

      {lote.anonimo && (
        <EventoDialog
          op="alta"
          lote={lote}
          hoy={hoy}
          icon={IconPlus}
          titulo="Sumar cabezas"
          ayuda="Alta por cantidades: recuento, compra sin caravana o pariciones."
          dialogTitulo={`Sumar cabezas a ${lote.nombre}`}
          dialogAyuda="Se suman al conteo de cada categoría y queda como alta en la historia del lote."
          submit="Sumar al lote"
        >
          {(f) => <ConteoInputs legend="Cabezas que se suman" categorias={categorias} error={f.conteo} />}
        </EventoDialog>
      )}

      <EventoDialog
        op="pesaje"
        lote={lote}
        hoy={hoy}
        icon={IconScale}
        titulo="Pesaje promedio"
        ayuda="Peso promedio del lote; calcula la ganancia diaria."
        disabled={!lote.total}
        dialogTitulo={`Pesaje promedio de ${lote.nombre}`}
        dialogAyuda="Con dos pesajes promedio se calcula la ganancia diaria (GDP) del lote."
        submit="Registrar pesaje"
      >
        {(f) => (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Peso promedio (kg)" htmlFor="peso_kg" error={f.peso_kg}>
                <Input id="peso_kg" name="peso_kg" inputMode="decimal" placeholder="412,5" className="tabular-nums" {...fieldAria("peso_kg", f.peso_kg)} />
              </Field>
              <Field label="Cabezas pesadas" htmlFor="cantidad" error={f.cantidad}>
                <Input id="cantidad" name="cantidad" inputMode="numeric" defaultValue={lote.total || ""} className="tabular-nums" {...fieldAria("cantidad", f.cantidad)} />
              </Field>
              <Field label="Cómo se pesó" htmlFor="metodo" error={f.metodo}>
                <Select id="metodo" name="metodo" defaultValue="balanza">
                  <option value="balanza">Balanza</option>
                  <option value="cinta">Cinta</option>
                  <option value="estimado">Estimado a ojo</option>
                </Select>
              </Field>
            </div>
            <div className="border-y border-border">
              <SwitchRow name="desbaste" label="Con desbaste" description="Marcalo si la hacienda se pesó después de un ayuno (sin comida ni agua)." />
            </div>
          </>
        )}
      </EventoDialog>

      {lote.anonimo && (
        <EventoDialog
          op="baja"
          lote={lote}
          hoy={hoy}
          icon={IconArrowDown}
          titulo="Registrar baja"
          ayuda={anonimas ? "Muerte, venta o salida de cabezas del conteo." : "No hay cabezas por cantidades."}
          disabled={!anonimas}
          dialogTitulo={`Baja en ${lote.nombre}`}
          dialogAyuda="Se descuentan del conteo de cada categoría. Para animales identificados, registralo desde su ficha."
          submit="Registrar baja"
        >
          {(f) => (
            <>
              <BajaCampos f={f} causas={causas} />
              <ConteoInputs legend="Cabezas que salen" categorias={categorias} disponibles={lote.conteo} error={f.conteo} />
            </>
          )}
        </EventoDialog>
      )}

      {lote.anonimo && <Individualizar lote={lote} categorias={categorias} razas={razas} hoy={hoy} />}

      <FilaAccion icon={IconSyringe} titulo="Vacunar o tratar" ayuda="Desde Sanidad, aplicándolo al lote completo." href="/sanidad" />
      {puedeOfertar && (
        <FilaAccion
          icon={IconChart}
          titulo="Ofertar este lote"
          ayuda={lote.total ? "Borrador de oferta precargado con los datos del lote." : "Sumá hacienda antes de ofertar."}
          href="/comercializacion/ofertas/nueva"
          disabled={!lote.total}
        />
      )}
    </ul>
  );
}

/* ───────────── Editar y archivar ───────────── */

export function EditarLote({
  lote,
}: {
  lote: { id: string; nombre: string; proposito: string; anonimo: boolean; notas: string; row_version: string; individuales: number; anonimas: number };
}) {
  const { state, formAction, pending, f, idem, open, abrir, cerrar } = useDialogForm(guardarLoteAction);
  const [anonimo, setAnonimo] = useState(lote.anonimo);
  return (
    <>
      <Button variant="outline" size="sm" onClick={abrir}>
        Editar lote
      </Button>
      <Dialog open={open} onClose={cerrar} title={`Editar ${lote.nombre}`} description="La especie no se cambia: un lote no mezcla especies.">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={lote.id} />
          <input type="hidden" name="idem" value={idem} />
          <input type="hidden" name="row_version" value={lote.row_version} />
          <input type="hidden" name="anonimo" value={anonimo ? "1" : "0"} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Field label="Nombre" htmlFor="ed_nombre" error={f.nombre}>
              <Input id="ed_nombre" name="nombre" defaultValue={lote.nombre} maxLength={80} {...fieldAria("ed_nombre", f.nombre)} />
            </Field>
            <Field label="Propósito" htmlFor="ed_proposito" optional>
              <Select id="ed_proposito" name="proposito" defaultValue={lote.proposito}>
                <option value="">Sin definir</option>
                {PROPOSITOS.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="border-y border-border">
              <SwitchRow
                label="Lleva hacienda por cantidades"
                description={
                  lote.anonimas > 0 && !anonimo
                    ? `Todavía tiene ${nf.format(lote.anonimas)} cabezas sin caravana: individualizalas o dalas de baja antes.`
                    : "Permite cargar cabezas por categoría sin identificarlas."
                }
                checked={anonimo}
                onChange={(e) => setAnonimo(e.target.checked)}
              />
            </div>
            <Field label="Notas" htmlFor="ed_notas" optional>
              <Textarea id="ed_notas" name="notas" rows={3} className="min-h-[80px]" defaultValue={lote.notas} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || (lote.anonimas > 0 && !anonimo)} icon={pending ? <Spinner /> : undefined}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

/** Archivar con motivo: sólo sin cabezas (la API lo exige); nada se borra. */
export function ArchivarLote({ id, nombre, cabezas }: { id: string; nombre: string; cabezas: number }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(archivarLoteAction);
  return (
    <>
      <Button variant="danger" size="sm" onClick={abrir}>
        Archivar
      </Button>
      <Dialog open={open} onClose={cerrar} title={`Archivar ${nombre}`} description="Deja de ofrecerse para movimientos; su historia y sus eventos quedan." size="sm">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            {cabezas > 0 ? (
              <Notice tone="warning" title={`Todavía tiene ${nf.format(cabezas)} cabezas`}>
                Pasá los animales a otro lote o registrá su baja; un lote se archiva vacío.
              </Notice>
            ) : (
              <Field label="Motivo" htmlFor="motivo_arch" error={f.motivo}>
                <Textarea id="motivo_arch" name="motivo" rows={3} maxLength={500} className="min-h-[80px]" placeholder="Se vendió completo en la feria de octubre." {...fieldAria("motivo_arch", f.motivo)} />
              </Field>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={pending || cabezas > 0} icon={pending ? <Spinner /> : undefined}>
              Archivar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
