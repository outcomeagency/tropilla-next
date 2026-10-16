"use client";

import { useMemo, useState } from "react";
import { archivarProductoAction, guardarProductoAction } from "@/lib/sanidad-actions";
import { TIPOS_PRODUCTO, VIAS, tipoProductoNombre } from "@/lib/sanidad";
import { Dialog, DialogBody, DialogFooter } from "@/components/dialog";
import { FormAlerts, useDialogForm } from "@/components/panel/form-state";
import { ChoiceChip } from "@/components/choice";
import { Badge, Button, Field, Input, Notice, Select, Spinner, Textarea, cx, fieldAria, inputClass } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconInfo, IconPlus, IconSearch } from "@/components/icons";

type Opt = { codigo: string; nombre: string };
export type ProductoForm = {
  id?: string | null;
  codigo?: string | null;
  nombre_comercial?: string;
  principio_activo?: string | null;
  tipo?: string;
  via?: string | null;
  dosis_declarada?: string | null;
  retiro_carne_dias?: number | null;
  retiro_leche_dias?: number | null;
  especies?: string[];
  enfermedades?: string[];
  notas?: string | null;
  row_version?: number;
};

/** Campos del producto. La dosis es lo que indicó el veterinario o el marbete: TROPILLA no sugiere ninguna. */
function Campos({ p, f, enfermedades, principios }: { p: ProductoForm; f: Record<string, string>; enfermedades: Opt[]; principios: Opt[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Nombre comercial" htmlFor="nombre_comercial" error={f.nombre_comercial} hint="Como figura en el envase.">
          <Input id="nombre_comercial" name="nombre_comercial" defaultValue={p.nombre_comercial ?? ""} maxLength={120} {...fieldAria("nombre_comercial", f.nombre_comercial, true)} />
        </Field>
      </div>
      <Field label="Tipo" htmlFor="tipo" error={f.tipo}>
        <Select id="tipo" name="tipo" defaultValue={p.tipo ?? ""} {...fieldAria("tipo", f.tipo)}>
          <option value="">Elegí</option>
          {TIPOS_PRODUCTO.map(([c, n]) => (
            <option key={c} value={c}>
              {n}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Principio activo" htmlFor="principio_activo" optional>
        <Input id="principio_activo" name="principio_activo" list="principios" defaultValue={p.principio_activo ?? ""} maxLength={120} placeholder="Ej. ivermectina" />
        <datalist id="principios">
          {principios.map((x) => (
            <option key={x.codigo} value={x.codigo}>
              {x.nombre}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label="Vía" htmlFor="via" optional error={f.via}>
        <Select id="via" name="via" defaultValue={p.via ?? ""}>
          <option value="">Sin indicar</option>
          {VIAS.map(([c, n]) => (
            <option key={c} value={c}>
              {n}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Dosis declarada" htmlFor="dosis_declarada" optional hint="La que indicó tu veterinario o el marbete.">
        <Input id="dosis_declarada" name="dosis_declarada" defaultValue={p.dosis_declarada ?? ""} maxLength={200} placeholder="Ej. 1 ml cada 50 kg" />
      </Field>

      <fieldset className="sm:col-span-2 rounded-[10px] border border-border bg-base p-4">
        <legend className="px-1 text-[13px] font-semibold text-ink">Período de retiro (del marbete)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Carne" htmlFor="retiro_carne_dias" error={f.retiro_carne_dias} hint="0 si no tiene retiro.">
            <div className="relative">
              <Input id="retiro_carne_dias" name="retiro_carne_dias" inputMode="numeric" maxLength={3} defaultValue={p.retiro_carne_dias ?? ""} className="pr-14 tabular-nums" {...fieldAria("retiro_carne_dias", f.retiro_carne_dias, true)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">días</span>
            </div>
          </Field>
          <Field label="Leche" htmlFor="retiro_leche_dias" optional error={f.retiro_leche_dias}>
            <div className="relative">
              <Input id="retiro_leche_dias" name="retiro_leche_dias" inputMode="numeric" maxLength={3} defaultValue={p.retiro_leche_dias ?? ""} className="pr-14 tabular-nums" {...fieldAria("retiro_leche_dias", f.retiro_leche_dias)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">días</span>
            </div>
          </Field>
        </div>
        <p className="mt-3 flex gap-2 text-[12.5px] text-muted">
          <IconInfo size={15} className="mt-px shrink-0" /> Con el retiro cargado, TROPILLA avisa antes de vender u ofertar un animal tratado.
        </p>
      </fieldset>

      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink">Especies</legend>
        <div className="flex flex-wrap gap-2">
          <ChoiceChip name="especies" value="BOV" label="Bovinos" defaultChecked={p.especies?.includes("BOV") ?? true} />
          <ChoiceChip name="especies" value="BUB" label="Bubalinos" defaultChecked={p.especies?.includes("BUB") ?? true} />
        </div>
        {f.especies && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{f.especies}</p>}
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink">Para qué se usa</legend>
        <div className="flex flex-wrap gap-2">
          {enfermedades.map((e) => (
            <ChoiceChip key={e.codigo} name="enfermedades" value={e.codigo} label={e.nombre} defaultChecked={p.enfermedades?.includes(e.codigo)} className="h-9 px-3.5 text-[13.5px]" />
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <Field label="Notas" htmlFor="notas" optional>
          <Textarea id="notas" name="notas" rows={2} maxLength={2000} defaultValue={p.notas ?? ""} className="min-h-[64px]" placeholder="Dónde se compra, conservación, cuidados." />
        </Field>
      </div>
    </div>
  );
}

/** «Agregar producto»: desde la base sugerida (genéricos sin dosis ni retiro) o uno propio. */
export function NuevoProducto({ sugeridos, enfermedades, principios, existentes }: { sugeridos: ProductoForm[]; enfermedades: Opt[]; principios: Opt[]; existentes: string[] }) {
  const { state, formAction, pending, f, idem, open, abrir, cerrar, ok } = useDialogForm(guardarProductoAction);
  const [elegido, setElegido] = useState<ProductoForm | null>(null);
  const [busca, setBusca] = useState("");
  const yaTiene = useMemo(() => new Set(existentes), [existentes]);
  const grupos = TIPOS_PRODUCTO.map(([t, n]) => ({
    t,
    n,
    items: sugeridos.filter((s) => s.tipo === t && (!busca || `${s.nombre_comercial} ${s.principio_activo ?? ""}`.toLowerCase().includes(busca.toLowerCase()))),
  })).filter((g) => g.items.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {ok && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
            <IconCheckCircle size={16} /> {ok.mensaje}
          </span>
        )}
        <Button
          icon={<IconPlus size={18} />}
          onClick={() => {
            setElegido(null);
            setBusca("");
            abrir();
          }}
        >
          Agregar producto
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={cerrar}
        size="lg"
        title={elegido ? (elegido.codigo ? `Agregar ${elegido.nombre_comercial}` : "Producto propio") : "Agregar producto"}
        description={elegido ? "Completá la dosis y el retiro con lo que indica tu veterinario o el marbete." : "Partí de un genérico de la base o cargá el que usás con su nombre comercial."}
      >
        {!elegido ? (
          <div className="px-5 py-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative min-w-[220px] flex-1">
                <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar: ivermectina, aftosa…" aria-label="Buscar en la base sugerida" className={cx(inputClass, "pl-10 text-[14px]")} />
              </div>
              <Button variant="outline" onClick={() => setElegido({ especies: ["BOV", "BUB"] })}>
                Cargar uno propio
              </Button>
            </div>
            <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
              {grupos.map((g) => (
                <section key={g.t}>
                  <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{g.n}</h3>
                  <ul className="divide-y divide-border rounded-[10px] border border-border">
                    {g.items.map((s) => {
                      const tiene = (!!s.principio_activo && yaTiene.has(s.principio_activo.toLowerCase())) || yaTiene.has((s.nombre_comercial ?? "").toLowerCase());
                      return (
                        <li key={s.codigo}>
                          <button type="button" onClick={() => setElegido(s)} className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-base">
                            <span className="min-w-0">
                              <span className="block text-[14.5px] font-semibold text-ink">{s.nombre_comercial}</span>
                              <span className="block truncate text-[12.5px] text-muted">
                                {[s.principio_activo, s.via && VIAS.find(([c]) => c === s.via)?.[1], (s.especies ?? []).length === 1 ? (s.especies?.[0] === "BOV" ? "sólo bovinos" : "sólo bubalinos") : null].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                            {tiene ? (
                              <Badge tone="success" icon={<IconCheckCircle size={14} />}>
                                Ya lo tenés
                              </Badge>
                            ) : (
                              <IconPlus size={16} className="shrink-0 text-subtle" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              {!grupos.length && <p className="py-6 text-center text-[14px] text-muted">Nada coincide. Cargalo como producto propio.</p>}
            </div>
          </div>
        ) : (
          <form action={formAction} noValidate>
            <input type="hidden" name="idem" value={idem} />
            <input type="hidden" name="sugerido_codigo" value={elegido.codigo ?? ""} />
            <DialogBody>
              <FormAlerts state={state} pending={pending} />
              {elegido.codigo && (
                <Notice tone="info" title="Genérico de la base sugerida">
                  Cambiá el nombre por la marca que compraste y cargá el retiro del marbete: la base no trae dosis ni retiro a propósito.
                </Notice>
              )}
              <Campos p={elegido} f={f} enfermedades={enfermedades} principios={principios} />
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setElegido(null)} icon={<IconArrowLeft size={16} />}>
                Volver
              </Button>
              <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
                Guardar en el catálogo
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function EditarProducto({ producto, enfermedades, principios }: { producto: ProductoForm; enfermedades: Opt[]; principios: Opt[] }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(guardarProductoAction);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={abrir}>
        Editar
      </Button>
      <Dialog open={open} onClose={cerrar} size="lg" title={`Editar ${producto.nombre_comercial}`} description={`${tipoProductoNombre(producto.tipo)}. Lo ya aplicado no cambia: queda con los datos de ese día.`}>
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={producto.id ?? ""} />
          <input type="hidden" name="row_version" value={producto.row_version ?? 1} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Campos p={producto} f={f} enfermedades={enfermedades} principios={principios} />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

export function ArchivarProducto({ id, nombre }: { id: string; nombre: string }) {
  const { state, formAction, pending, f, open, abrir, cerrar } = useDialogForm(archivarProductoAction);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={abrir} className="text-muted">
        Archivar
      </Button>
      <Dialog open={open} onClose={cerrar} size="sm" title={`Archivar ${nombre}`} description="Deja de ofrecerse al registrar aplicaciones. Lo ya aplicado sigue en la historia.">
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <FormAlerts state={state} pending={pending} />
            <Field label="Motivo" htmlFor="motivo_prod" error={f.motivo}>
              <Textarea id="motivo_prod" name="motivo" rows={3} className="min-h-[80px]" placeholder="Se cambió por otra marca." {...fieldAria("motivo_prod", f.motivo)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Archivar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
