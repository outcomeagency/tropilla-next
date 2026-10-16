"use client";

import Link from "next/link";
import { useState } from "react";
import { guardarPotreroAction } from "@/lib/potrero-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { CampoMap, areaHa, type LatLon, type MapPolygon, type Ring } from "@/components/map/campo-map";
import { SwitchRow } from "@/components/choice";
import { Button, Card, CardHeader, Field, Input, Select, Spinner, Textarea, buttonClass, fieldAria } from "@/components/ui";
import { IconArrowLeft, IconClose, IconMap } from "@/components/icons";

type Opt = { codigo: string; nombre: string };

export interface PotreroEditorProps {
  p: {
    id: string;
    nombre: string;
    superficie_ha: string;
    ambiente: string;
    recurso_forrajero: string;
    agua: boolean;
    revolcadero: boolean;
    notas: string;
    ring: Ring;
    row_version: string;
  } | null;
  otros: MapPolygon[];
  centro: LatLon | null;
  ambientes: Opt[];
  forrajes: Opt[];
}

const dec1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** Alta y edición de un potrero con dibujo del contorno sobre el satélite (TPA-14). */
export function PotreroEditor({ p, otros, centro, ambientes, forrajes }: PotreroEditorProps) {
  const { state, formAction, pending, f, idem } = useActionForm(guardarPotreroAction);
  const [ring, setRing] = useState<Ring>(p?.ring ?? []);
  const [dibujando, setDibujando] = useState(!p?.ring.length);
  const [sup, setSup] = useState(p?.superficie_ha ?? "");
  const [supManual, setSupManual] = useState(!!p?.superficie_ha && !p?.ring.length);
  const calc = ring.length >= 3 ? areaHa(ring) : 0;
  const supMostrada = supManual ? sup : calc ? String(Math.round(calc * 10) / 10).replace(".", ",") : sup;

  return (
    <form action={formAction} noValidate className="grid grid-cols-1 gap-4 xl:grid-cols-[400px_1fr]">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="row_version" value={p?.row_version ?? ""} />
      <input type="hidden" name="poligono" value={ring.length >= 3 ? JSON.stringify(ring) : ""} />

      <Card className="self-start overflow-hidden">
        <CardHeader title="Datos del potrero" />
        <div className="space-y-5 px-5 py-5">
          <FormAlerts state={state} pending={pending} />
          <Field label="Nombre" htmlFor="nombre" error={f.nombre}>
            <Input id="nombre" name="nombre" defaultValue={p?.nombre} maxLength={80} placeholder="Bañado Norte" autoFocus={!p} {...fieldAria("nombre", f.nombre)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ambiente" htmlFor="ambiente">
              <Select id="ambiente" name="ambiente" defaultValue={p?.ambiente ?? ""}>
                <option value="">Sin indicar</option>
                {ambientes.map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Recurso forrajero" htmlFor="recurso_forrajero">
              <Select id="recurso_forrajero" name="recurso_forrajero" defaultValue={p?.recurso_forrajero ?? ""}>
                <option value="">Sin indicar</option>
                {forrajes.map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Superficie"
            htmlFor="superficie_ha"
            error={f.superficie_ha}
            hint={
              calc && !supManual ? (
                <>Calculada del contorno. <button type="button" className="font-medium text-campo hover:underline" onClick={() => { setSup(supMostrada); setSupManual(true); }}>Escribir otra</button></>
              ) : calc && supManual ? (
                <>El contorno da {dec1.format(calc)} ha. <button type="button" className="font-medium text-campo hover:underline" onClick={() => setSupManual(false)}>Usar ese valor</button></>
              ) : (
                "En hectáreas. Si dibujás el contorno se calcula sola."
              )
            }
          >
            <div className="relative">
              <Input
                id="superficie_ha"
                name="superficie_ha"
                inputMode="decimal"
                value={supMostrada}
                onChange={(ev) => {
                  setSup(ev.target.value);
                  setSupManual(true);
                }}
                className="pr-12 tabular-nums"
                {...fieldAria("superficie_ha", f.superficie_ha, true)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">ha</span>
            </div>
          </Field>
          <div className="divide-y divide-border rounded-[12px] border border-border px-4">
            <SwitchRow name="agua" label="Tiene agua" description="Aguada, tajamar o bebedero." defaultChecked={p?.agua ?? true} />
            <SwitchRow name="revolcadero" label="Tiene revolcadero" description="Clave para búfalos en verano." defaultChecked={p?.revolcadero ?? false} />
          </div>
          <Field label="Notas" htmlFor="notas" optional>
            <Textarea id="notas" name="notas" defaultValue={p?.notas} rows={3} className="min-h-[80px]" placeholder="Se anega en otoño; alambrado nuevo del lado del monte." />
          </Field>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-base px-5 py-3">
          <Link href={p ? `/establecimiento/potreros/${p.id}` : "/establecimiento/potreros"} className={buttonClass("ghost")}>
            Cancelar
          </Link>
          <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
            {p ? "Guardar cambios" : "Crear potrero"}
          </Button>
        </footer>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Contorno"
          description={dibujando ? "Tocá el mapa en cada esquina del potrero. Con 3 puntos ya se cierra." : "Opcional, pero sirve para ver la ocupación en el mapa y calcular las hectáreas."}
          action={
            <div className="flex flex-wrap gap-2">
              {dibujando ? (
                <>
                  <Button size="sm" variant="outline" disabled={!ring.length} onClick={() => setRing((r) => r.slice(0, -1))}>
                    Deshacer punto
                  </Button>
                  <Button size="sm" variant="secondary" disabled={ring.length < 3} onClick={() => setDibujando(false)}>
                    Terminar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" icon={<IconMap size={16} />} onClick={() => setDibujando(true)}>
                  {ring.length ? "Seguir dibujando" : "Dibujar contorno"}
                </Button>
              )}
              {ring.length > 0 && (
                <Button size="sm" variant="ghost" icon={<IconClose size={16} />} onClick={() => { setRing([]); setDibujando(true); }}>
                  Borrar
                </Button>
              )}
            </div>
          }
        />
        <div className="p-3">
          <CampoMap
            center={ring[0] ? { lon: ring[0][0], lat: ring[0][1] } : centro}
            zoom={14}
            height={520}
            polygons={[...otros.map((o) => ({ ...o, muted: true })), ...(!dibujando && ring.length >= 3 ? [{ id: "este", nombre: "", ring, selected: true }] : [])]}
            drawing={dibujando ? ring : null}
            onDrawingChange={setRing}
            ariaLabel="Dibujá el contorno del potrero"
          />
          <p className="mt-2 flex flex-wrap justify-between gap-2 px-1 text-[12.5px] text-muted" aria-live="polite">
            <span>{ring.length ? `${ring.length} ${ring.length === 1 ? "punto" : "puntos"}${calc ? ` · ${dec1.format(calc)} ha aprox.` : ""}` : "Sin contorno todavía."}</span>
            <span>Los demás potreros se ven en gris como referencia.</span>
          </p>
          {f.poligono && <p className="px-1 text-[12.5px] font-medium text-danger">{f.poligono}</p>}
        </div>
      </Card>
      <Link href="/establecimiento/potreros" className="sr-only">
        <IconArrowLeft size={16} /> Volver a potreros
      </Link>
    </form>
  );
}
