"use client";

import { useState, type ReactNode } from "react";
import {
  aplicarPlantillasAction,
  archivarItemPlanAction,
  guardarItemPlanAction,
  omitirTareaAction,
  reprogramarTareaAction,
} from "@/lib/sanidad-actions";
import { MESES_CORTOS, cuando, condicionTexto, mmddADdmm, repite, type Condicion, type Disparador, type Repeticion } from "@/lib/plan-sanitario";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useDialogForm, useActionForm } from "@/components/panel/form-state";
import { ChoiceChip, SwitchRow } from "@/components/choice";
import { Badge, Button, Field, Input, Notice, Select, Spinner, Textarea, cx, fieldAria } from "@/components/ui";
import { IconAlert, IconCheck, IconCheckCircle, IconInfo, IconPlus } from "@/components/icons";

type Opt = { codigo: string; nombre: string };

export type PlantillaVista = {
  codigo: string;
  nombre: string;
  especie: string | null;
  enfermedad: string | null;
  disparador: Disparador;
  repeticion: Repeticion;
  condicion: Condicion;
  nota: string | null;
  fuente: string | null;
};

function PlantillaCard({ p, checked, aplicada, enfermedad }: { p: PlantillaVista; checked: boolean; aplicada: boolean; enfermedad?: string }) {
  const cond = condicionTexto(p.condicion);
  const rep = repite(p.repeticion);
  return (
    <label
      className={cx(
        "group relative flex gap-3 rounded-[12px] border bg-surface p-4 transition-colors",
        aplicada ? "cursor-default border-border bg-base" : "cursor-pointer border-border-strong hover:border-campo has-checked:border-campo has-checked:bg-campo-50",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-campo",
      )}
    >
      {!aplicada && <input type="checkbox" name="plantillas" value={p.codigo} defaultChecked={checked} className="sr-only" />}
      <span
        aria-hidden="true"
        className={cx(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border",
          aplicada ? "border-campo bg-campo text-blanco" : "border-border-strong bg-surface text-transparent group-has-checked:border-monte group-has-checked:bg-monte group-has-checked:text-blanco",
        )}
      >
        <IconCheck size={13} strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold text-ink">{p.nombre}</span>
          {p.especie === "BUB" && <Badge tone="primary">Bubalinos</Badge>}
          {aplicada && <Badge tone="success">Ya está en el plan</Badge>}
        </span>
        <span className="mt-1 block text-[13px] text-ink">
          {cuando(p.disparador)}
          {rep && <span className="text-muted"> · {rep}</span>}
        </span>
        {enfermedad && <span className="block text-[12.5px] text-muted">{enfermedad}</span>}
        {cond && <span className="mt-1 block text-[12.5px] text-muted">Sólo si: {cond}</span>}
        {p.nota && (
          <span className="mt-1.5 flex gap-1.5 text-[12.5px] text-warning">
            <IconInfo size={14} className="mt-px shrink-0" />
            {p.nota}
          </span>
        )}
        {p.fuente && <span className="mt-1 block text-[11.5px] text-subtle">Fuente: {p.fuente}</span>}
      </span>
    </label>
  );
}

/** Elegir plantillas y aceptar el aviso veterinario (obligatorio en la API). */
function FormPlantillas({ plantillas, preseleccion, aplicadas, enfermedades, footer }: { plantillas: PlantillaVista[]; preseleccion: string[]; aplicadas: string[]; enfermedades: Opt[]; footer: (pending: boolean) => ReactNode }) {
  const { state, formAction, pending, f } = useActionForm(aplicarPlantillasAction);
  const enf = new Map(enfermedades.map((e) => [e.codigo, e.nombre]));
  const generales = plantillas.filter((p) => !p.especie || p.especie === "BOV");
  const bub = plantillas.filter((p) => p.especie === "BUB");
  return (
    <form action={formAction} noValidate>
      <div className="space-y-5 px-5 py-5">
        <FormAlerts state={state} pending={pending} />
        {state.ok && <Notice tone="success" title={state.ok.mensaje} />}
        {[
          { t: "Generales", xs: generales },
          { t: "Específicas de búfalos (NEA)", xs: bub },
        ]
          .filter((g) => g.xs.length)
          .map((g) => (
            <section key={g.t}>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{g.t}</h3>
              <div className="grid gap-2.5 lg:grid-cols-2">
                {g.xs.map((p) => (
                  <PlantillaCard key={p.codigo} p={p} checked={preseleccion.includes(p.codigo)} aplicada={aplicadas.includes(p.codigo)} enfermedad={p.enfermedad ? enf.get(p.enfermedad) : undefined} />
                ))}
              </div>
            </section>
          ))}
        <label className={cx("flex cursor-pointer gap-3 rounded-[12px] border px-4 py-3.5", f.aviso_aceptado ? "border-danger-border bg-danger-bg" : "border-warning-border bg-warning-bg")}>
          <input type="checkbox" name="aviso_aceptado" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-monte" />
          <span className="text-[14px] text-ink">
            <span className="block font-semibold">Validá este plan con tu veterinario</span>
            <span className="text-[13px] text-muted">Son sugerencias editables: TROPILLA no prescribe productos ni dosis. Los productos, dosis y fechas definitivos los decide un profesional.</span>
          </span>
        </label>
      </div>
      {footer(pending)}
    </form>
  );
}

export function PlantillasInline(props: { plantillas: PlantillaVista[]; preseleccion: string[]; enfermedades: Opt[] }) {
  return (
    <FormPlantillas
      {...props}
      aplicadas={[]}
      footer={(pending) => (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-base px-5 py-3.5">
          <p className="text-[13px] text-muted">Después podés cambiar fechas, productos o sacar lo que no corresponda.</p>
          <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
            Armar el plan
          </Button>
        </div>
      )}
    />
  );
}

export function AgregarPlantillas(props: { plantillas: PlantillaVista[]; aplicadas: string[]; enfermedades: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0);
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setN((x) => x + 1);
          setOpen(true);
        }}
      >
        Agregar plantillas
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg" title="Agregar plantillas al plan" description="Las que ya están en el plan aparecen marcadas.">
        <div className="max-h-[70vh] overflow-y-auto">
          <FormPlantillas
            key={n}
            {...props}
            preseleccion={[]}
            footer={(pending) => (
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cerrar
                </Button>
                <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
                  Agregar al plan
                </Button>
              </DialogFooter>
            )}
          />
        </div>
      </Dialog>
    </>
  );
}

/** Campos del disparador según su tipo. Guarda el original para no perder datos que la web no edita (evento, semanas). */
function DisparadorCampos({ d, f }: { d: Disparador; f: Record<string, string> }) {
  const [tipo, setTipo] = useState(d.tipo ?? "fecha_fija");
  const [modo, setModo] = useState(d.meses?.length ? "meses" : "fechas");
  return (
    <div className="space-y-4 rounded-[10px] border border-border bg-base p-4">
      <input type="hidden" name="disparador_previo" value={JSON.stringify(d)} />
      <Field label="Cuándo se hace" htmlFor="disparador_tipo" error={f.disparador_tipo}>
        <Select id="disparador_tipo" name="disparador_tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="fecha_fija">Un día fijo del año</option>
          <option value="ventana">En una ventana del año</option>
          {d.tipo === "relativo" && <option value="relativo">Después del nacimiento</option>}
          <option value="periodico">Cada cierta cantidad de días</option>
          <option value="manual">Cuando lo programe</option>
        </Select>
      </Field>
      {tipo === "fecha_fija" && (
        <Field label="Día" htmlFor="fecha" error={f.fecha} hint="Día/mes. Ej.: 15/04">
          <Input id="fecha" name="fecha" defaultValue={mmddADdmm(d.fecha)} placeholder="15/04" maxLength={5} className="max-w-[140px] tabular-nums" {...fieldAria("fecha", f.fecha, true)} />
        </Field>
      )}
      {tipo === "ventana" && (
        <>
          <input type="hidden" name="ventana_modo" value={modo} />
          <div className="flex gap-2">
            <ChoiceChip type="radio" name="_vm" label="Entre dos fechas" checked={modo === "fechas"} onChange={() => setModo("fechas")} className="h-9 px-3.5 text-[13.5px]" />
            <ChoiceChip type="radio" name="_vm" label="Por meses" checked={modo === "meses"} onChange={() => setModo("meses")} className="h-9 px-3.5 text-[13.5px]" />
          </div>
          {modo === "fechas" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde" htmlFor="desde" error={f.desde} hint="Día/mes">
                <Input id="desde" name="desde" defaultValue={mmddADdmm(d.desde)} placeholder="01/03" maxLength={5} className="tabular-nums" {...fieldAria("desde", f.desde, true)} />
              </Field>
              <Field label="Hasta" htmlFor="hasta" error={f.hasta} hint="Día/mes">
                <Input id="hasta" name="hasta" defaultValue={mmddADdmm(d.hasta)} placeholder="30/04" maxLength={5} className="tabular-nums" {...fieldAria("hasta", f.hasta, true)} />
              </Field>
            </div>
          ) : (
            <fieldset>
              <legend className="sr-only">Meses</legend>
              <div className="grid grid-cols-6 gap-1.5">
                {MESES_CORTOS.map((m, i) => (
                  <ChoiceChip key={m} name="meses" value={String(i + 1)} label={m} defaultChecked={d.meses?.includes(i + 1)} className="h-9 justify-center px-0 text-[13px]" />
                ))}
              </div>
              {f.meses && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{f.meses}</p>}
            </fieldset>
          )}
        </>
      )}
      {tipo === "relativo" && !d.semanas && (
        <Field label="Días después del nacimiento" htmlFor="dias" error={f.dias}>
          <Input id="dias" name="dias" inputMode="numeric" defaultValue={d.dias ?? ""} maxLength={4} className="max-w-[140px] tabular-nums" {...fieldAria("dias", f.dias)} />
        </Field>
      )}
      {tipo === "relativo" && d.semanas && <p className="text-[13px] text-muted">{cuando(d)}. Para cambiarlo, archivá el ítem y creá uno manual.</p>}
      {tipo === "periodico" && (
        <Field label="Cada cuántos días" htmlFor="cada_dias" error={f.cada_dias}>
          <Input id="cada_dias" name="cada_dias" inputMode="numeric" defaultValue={d.cada_dias ?? ""} maxLength={4} className="max-w-[140px] tabular-nums" {...fieldAria("cada_dias", f.cada_dias)} />
        </Field>
      )}
      {tipo === "manual" && <p className="text-[13px] text-muted">No genera tareas solas: las programás vos cuando corresponda.</p>}
    </div>
  );
}

export type ItemVista = {
  id: string;
  nombre: string;
  disparador: Disparador;
  productoId: string | null;
  activo: boolean;
  rowVersion: number;
  tipoEvento: string;
};

function ProductoSelect({ productos, valor }: { productos: Array<{ id: string; nombre: string }>; valor?: string | null }) {
  return (
    <Field label="Producto" htmlFor="producto_id" optional hint="Lo propone al registrar la tarea. Lo define tu veterinario.">
      <Select id="producto_id" name="producto_id" defaultValue={valor ?? ""}>
        <option value="">Sin producto definido</option>
        {productos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function EditarItem({ item, productos }: { item: ItemVista; productos: Array<{ id: string; nombre: string }> }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(guardarItemPlanAction);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={abrir}>
        Editar
      </Button>
      <Dialog open={open} onClose={cerrar} title={`Editar «${item.nombre}»`} description="Las tareas pendientes se recalculan con lo nuevo; las hechas no cambian.">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="row_version" value={item.rowVersion} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Field label="Nombre" htmlFor="nombre" error={f.nombre}>
              <Input id="nombre" name="nombre" defaultValue={item.nombre} maxLength={200} {...fieldAria("nombre", f.nombre)} />
            </Field>
            <DisparadorCampos d={item.disparador} f={f} />
            <ProductoSelect productos={productos} valor={item.productoId} />
            <div className="border-t border-border">
              <SwitchRow name="activo" label="Activo" description="Apagalo para que deje de generar tareas sin sacarlo del plan." defaultChecked={item.activo} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

export function NuevoItem({ productos, enfermedades }: { productos: Array<{ id: string; nombre: string }>; enfermedades: Opt[] }) {
  const { state, formAction, pending, f, idem, open, abrir, cerrar } = useDialogForm(guardarItemPlanAction);
  return (
    <>
      <Button variant="outline" icon={<IconPlus size={16} />} onClick={abrir}>
        Ítem propio
      </Button>
      <Dialog open={open} onClose={cerrar} title="Agregar un ítem propio" description="Algo que tu veterinario indicó y no está en las plantillas.">
        <form action={formAction} noValidate>
          <input type="hidden" name="idem" value={idem} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Field label="Nombre" htmlFor="nombre_n" error={f.nombre}>
              <Input id="nombre_n" name="nombre" maxLength={200} placeholder="Ej. Carbunclo a toda la hacienda" {...fieldAria("nombre_n", f.nombre)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Qué se hace" htmlFor="tipo_evento" error={f.tipo_evento}>
                <Select id="tipo_evento" name="tipo_evento" defaultValue="sanidad.vacunacion">
                  <option value="sanidad.vacunacion">Vacunación</option>
                  <option value="sanidad.desparasitacion">Desparasitación</option>
                  <option value="sanidad.tratamiento">Tratamiento</option>
                  <option value="sanidad.prueba_diagnostica">Prueba diagnóstica</option>
                  <option value="sanidad.analisis_laboratorio">Análisis de laboratorio</option>
                </Select>
              </Field>
              <Field label="Enfermedad" htmlFor="enfermedad_n" optional>
                <Select id="enfermedad_n" name="enfermedad" defaultValue="">
                  <option value="">Sin indicar</option>
                  {enfermedades.map((e) => (
                    <option key={e.codigo} value={e.codigo}>
                      {e.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Especie" htmlFor="especie_n">
                <Select id="especie_n" name="especie" defaultValue="">
                  <option value="">Ambas</option>
                  <option value="BOV">Bovinos</option>
                  <option value="BUB">Bubalinos</option>
                </Select>
              </Field>
            </div>
            <DisparadorCampos d={{ tipo: "fecha_fija" }} f={f} />
            <ProductoSelect productos={productos} />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Agregar al plan
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

export function ArchivarItem({ id, nombre }: { id: string; nombre: string }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(archivarItemPlanAction);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={abrir} className="text-muted">
        Sacar
      </Button>
      <Dialog open={open} onClose={cerrar} size="sm" title={`Sacar «${nombre}» del plan`} description="Deja de generar tareas. Lo ya registrado queda en la historia.">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Field label="Motivo" htmlFor="motivo_item" error={f.motivo}>
              <Textarea id="motivo_item" name="motivo" rows={3} className="min-h-[80px]" placeholder="El veterinario indicó que no corresponde en este campo." {...fieldAria("motivo_item", f.motivo)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Sacar del plan
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

export function OmitirTarea({ id, titulo }: { id: string; titulo: string }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(omitirTareaAction);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={abrir} className="text-muted">
        Omitir
      </Button>
      <Dialog open={open} onClose={cerrar} size="sm" title={`Omitir «${titulo}»`} description="Queda registrado que no se hizo y por qué.">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Field label="Motivo" htmlFor="motivo_tarea" error={f.motivo}>
              <Textarea id="motivo_tarea" name="motivo" rows={3} className="min-h-[80px]" placeholder="La hizo el vacunador de la fundación; el acta está en Documentos." {...fieldAria("motivo_tarea", f.motivo)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Omitir tarea
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

export function ReprogramarTarea({ id, titulo, desde, vence, rowVersion }: { id: string; titulo: string; desde: string | null; vence: string; rowVersion: number }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(reprogramarTareaAction);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={abrir}>
        Reprogramar
      </Button>
      <Dialog open={open} onClose={cerrar} size="sm" title={`Reprogramar «${titulo}»`} description="Las fechas que pongas a mano ya no las cambia el plan.">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="row_version" value={rowVersion} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde" htmlFor="fecha_desde" optional error={f.fecha_desde}>
                <Input id="fecha_desde" name="fecha_desde" type="date" defaultValue={desde ?? ""} {...fieldAria("fecha_desde", f.fecha_desde)} />
              </Field>
              <Field label="Hasta" htmlFor="vence_en" error={f.vence_en}>
                <Input id="vence_en" name="vence_en" type="date" defaultValue={vence} {...fieldAria("vence_en", f.vence_en)} />
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

/** Estado de un ítem: activo y aplica, no aplica por la zona, falta configurar o apagado. */
export function EstadoItem({ activo, aplica, requiereConfig, condicion }: { activo: boolean; aplica: boolean; requiereConfig: boolean; condicion: string }) {
  if (!activo) return <Badge tone="neutral">Apagado</Badge>;
  if (requiereConfig)
    return (
      <Badge tone="warning" icon={<IconAlert size={14} />}>
        Falta la fecha
      </Badge>
    );
  if (!aplica)
    return (
      <span title={condicion ? `Sólo si: ${condicion}` : undefined}>
        <Badge tone="neutral" icon={<IconInfo size={14} />}>
          No aplica a tu zona
        </Badge>
      </span>
    );
  return (
    <Badge tone="success" icon={<IconCheckCircle size={14} />}>
      Genera tareas
    </Badge>
  );
}
