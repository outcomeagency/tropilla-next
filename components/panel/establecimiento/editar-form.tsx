"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { guardarEstablecimientoAction } from "@/lib/establecimiento-datos-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { CampoMap, type LatLon } from "@/components/map/campo-map";
import { ChoiceCard, ChoiceChip, SwitchRow } from "@/components/choice";
import { Button, Card, CardHeader, Field, Input, Select, Spinner, Textarea, buttonClass, fieldAria } from "@/components/ui";
import { IconBuffalo, IconCow, IconLock, IconPin } from "@/components/icons";

type Opt = { codigo: string; nombre: string };
type Dep = Opt & { provincia_codigo: string; garrapata_sugerida?: string | null };

export interface EditarEstablecimientoProps {
  e: {
    nombre: string;
    provincia_codigo: string;
    departamento_codigo: string;
    localidad: string;
    superficie_ha: string;
    renspa: string;
    especies: string[];
    actividades: string[];
    instalaciones: string[];
    historia: string;
    aftosa_zona: string;
    garrapata: string;
    rabia_endemica: boolean;
    fasciola_endemica: boolean;
    lat: string;
    lon: string;
    row_version: string;
  };
  productor: null | { id: string; tipo: string; nombre: string; cuit: string; email: string; telefono: string; whatsapp: string; row_version: string };
  privados: boolean;
  provincias: Opt[];
  departamentos: Dep[];
  actividades: Opt[];
  instalaciones: Opt[];
}

const GARRAPATA = [
  { v: "erradicacion", t: "Erradicación", d: "Tratamientos obligatorios y movimientos con baño." },
  { v: "control", t: "Control", d: "Presencia de garrapata con control sanitario." },
  { v: "libre", t: "Libre", d: "Sin garrapata: cuidá los ingresos de hacienda." },
];
const AFTOSA = [
  { v: "libre_con_vacunacion", t: "Libre con vacunación" },
  { v: "libre_sin_vacunacion", t: "Libre sin vacunación" },
];

function Seccion({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div id={id} className="scroll-mt-6" />
      <CardHeader title={title} description={description} />
      <div className="space-y-5 px-5 py-5">{children}</div>
    </Card>
  );
}

/** Edición de datos, zonas sanitarias y ubicación (TPA-13). */
export function EditarEstablecimientoForm({ e, productor, privados, provincias, departamentos, actividades, instalaciones }: EditarEstablecimientoProps) {
  const { state, formAction, pending, f } = useActionForm(guardarEstablecimientoAction);
  const [prov, setProv] = useState(e.provincia_codigo);
  const [dep, setDep] = useState(e.departamento_codigo);
  const [garrapata, setGarrapata] = useState(e.garrapata);
  const [lat, setLat] = useState(e.lat);
  const [lon, setLon] = useState(e.lon);
  const nLat = Number(lat.replace(",", "."));
  const nLon = Number(lon.replace(",", "."));
  const punto: LatLon | null = lat && lon && Number.isFinite(nLat) && Number.isFinite(nLon) ? { lat: nLat, lon: nLon } : null;
  const setPunto = (p: LatLon | null) => {
    setLat(p ? String(p.lat) : "");
    setLon(p ? String(p.lon) : "");
  };
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [historia, setHistoria] = useState(e.historia);

  const deps = departamentos.filter((d) => d.provincia_codigo === prov);
  const sugerida = deps.find((d) => d.codigo === dep)?.garrapata_sugerida ?? null;
  const provsNea = provincias.filter((p) => departamentos.some((d) => d.provincia_codigo === p.codigo));
  const aftosaOpts = e.aftosa_zona && !AFTOSA.some((a) => a.v === e.aftosa_zona) ? [...AFTOSA, { v: e.aftosa_zona, t: e.aftosa_zona }] : AFTOSA;

  function usarMiUbicacion() {
    if (!navigator.geolocation) return setGeoMsg("Este navegador no comparte la ubicación.");
    setGeoMsg("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPunto({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lon: Math.round(p.coords.longitude * 1e6) / 1e6 });
        setGeoMsg("Listo: ajustá el punto si hace falta.");
      },
      () => setGeoMsg("No pudimos obtener tu ubicación. Marcala en el mapa."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4 pb-24">
      <input type="hidden" name="row_version" value={e.row_version} />
      {productor && (
        <>
          <input type="hidden" name="productor_id" value={productor.id} />
          <input type="hidden" name="productor_row_version" value={productor.row_version} />
        </>
      )}
      <FormAlerts state={state} pending={pending} />

      <Seccion id="datos" title="Datos generales">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nombre del establecimiento" htmlFor="nombre" error={f.nombre}>
            <Input id="nombre" name="nombre" defaultValue={e.nombre} maxLength={120} required {...fieldAria("nombre", f.nombre)} />
          </Field>
          <Field label="Superficie total" htmlFor="superficie_ha" error={f.superficie_ha} hint="En hectáreas. La suma de potreros puede ser menor.">
            <div className="relative">
              <Input id="superficie_ha" name="superficie_ha" inputMode="decimal" defaultValue={e.superficie_ha} className="pr-12 tabular-nums" {...fieldAria("superficie_ha", f.superficie_ha, true)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">ha</span>
            </div>
          </Field>
          <Field label="Provincia" htmlFor="provincia_codigo" error={f.provincia_codigo}>
            <Select
              id="provincia_codigo"
              name="provincia_codigo"
              value={prov}
              onChange={(ev) => {
                setProv(ev.target.value);
                setDep("");
              }}
              {...fieldAria("provincia_codigo", f.provincia_codigo)}
            >
              {provsNea.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Departamento" htmlFor="departamento_codigo" error={f.departamento_codigo}>
            <Select id="departamento_codigo" name="departamento_codigo" value={dep} onChange={(ev) => setDep(ev.target.value)} {...fieldAria("departamento_codigo", f.departamento_codigo)}>
              <option value="">Elegí…</option>
              {deps.map((d) => (
                <option key={d.codigo} value={d.codigo}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Localidad o paraje" htmlFor="localidad" optional>
            <Input id="localidad" name="localidad" defaultValue={e.localidad} maxLength={120} placeholder="Caá Catí, Paraje Yahapé…" />
          </Field>
          {privados && (
            <Field label="RENSPA" htmlFor="renspa" optional hint={<span className="inline-flex items-center gap-1"><IconLock size={13} /> Privado siempre: nunca se publica.</span>}>
              <Input id="renspa" name="renspa" defaultValue={e.renspa} placeholder="18.063.0.00421/00" className="tabular-nums" {...fieldAria("renspa", f.renspa, true)} />
            </Field>
          )}
        </div>
      </Seccion>

      {productor && (
        <Seccion id="productor" title={productor.tipo === "sociedad" ? "Sociedad productora" : "Productor"} description="Sólo lo ven el dueño y la administración.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={productor.tipo === "sociedad" ? "Razón social" : "Nombre y apellido"} htmlFor="productor_nombre" error={f.productor_nombre}>
              <Input id="productor_nombre" name="productor_nombre" defaultValue={productor.nombre} maxLength={200} {...fieldAria("productor_nombre", f.productor_nombre)} />
            </Field>
            <Field label="CUIT" htmlFor="cuit" optional error={f.cuit} hint={<span className="inline-flex items-center gap-1"><IconLock size={13} /> Privado siempre.</span>}>
              <Input id="cuit" name="cuit" inputMode="numeric" defaultValue={productor.cuit} placeholder="30-71234567-1" className="tabular-nums" {...fieldAria("cuit", f.cuit, true)} />
            </Field>
            <Field label="Email de contacto" htmlFor="contacto_email" optional>
              <Input id="contacto_email" name="contacto_email" type="email" defaultValue={productor.email} />
            </Field>
            <Field label="Teléfono" htmlFor="contacto_telefono" optional>
              <Input id="contacto_telefono" name="contacto_telefono" type="tel" defaultValue={productor.telefono} placeholder="+54 9 379 400-0142" />
            </Field>
            <Field label="WhatsApp" htmlFor="contacto_whatsapp" optional hint="Para responder consultas de compradores.">
              <Input id="contacto_whatsapp" name="contacto_whatsapp" type="tel" defaultValue={productor.whatsapp} />
            </Field>
          </div>
        </Seccion>
      )}

      <Seccion id="produccion" title="Producción e instalaciones">
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink">Especies</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard type="checkbox" name="especies" value="BOV" title="Bovinos" description="Categorías, gestación y faena de bovinos." icon={<IconCow size={22} />} defaultChecked={e.especies.includes("BOV")} />
            <ChoiceCard type="checkbox" name="especies" value="BUB" title="Búfalos" description="Reglas bubalinas: dentición, gestación por raza." icon={<IconBuffalo size={22} />} defaultChecked={e.especies.includes("BUB")} />
          </div>
          {f.especies && <p className="mt-2 text-[12.5px] font-medium text-danger">{f.especies}</p>}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink">Actividades</legend>
          <div className="flex flex-wrap gap-2">
            {actividades.map((a) => (
              <ChoiceChip key={a.codigo} name="actividades" value={a.codigo} label={a.nombre} defaultChecked={e.actividades.includes(a.codigo)} />
            ))}
          </div>
          {f.actividades && <p className="mt-2 text-[12.5px] font-medium text-danger">{f.actividades}</p>}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink">Instalaciones</legend>
          <div className="flex flex-wrap gap-2">
            {instalaciones.map((a) => (
              <ChoiceChip key={a.codigo} name="instalaciones" value={a.codigo} label={a.nombre} defaultChecked={e.instalaciones.includes(a.codigo)} />
            ))}
          </div>
        </fieldset>
      </Seccion>

      <Seccion id="zonas" title="Zonas sanitarias" description="Declaradas por vos. El plan sanitario sugerido se arma con esto: validalo con tu veterinario.">
        <Field label="Fiebre aftosa" htmlFor="aftosa_zona">
          <Select id="aftosa_zona" name="aftosa_zona" defaultValue={e.aftosa_zona || "libre_con_vacunacion"}>
            {aftosaOpts.map((a) => (
              <option key={a.v} value={a.v}>
                {a.t}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[13px] font-semibold text-ink">
            Garrapata
            {sugerida && (
              <span className="text-[12.5px] font-normal text-muted">
                Sugerida para {deps.find((d) => d.codigo === dep)?.nombre}: <strong className="font-semibold text-ink">{GARRAPATA.find((g) => g.v === sugerida)?.t ?? sugerida}</strong>
                {garrapata !== sugerida && (
                  <button type="button" onClick={() => setGarrapata(sugerida)} className="ml-2 font-medium text-campo hover:underline">
                    Usar la sugerida
                  </button>
                )}
              </span>
            )}
          </legend>
          <div className="grid gap-2 md:grid-cols-3">
            {GARRAPATA.map((g) => (
              <ChoiceCard key={g.v} name="garrapata" value={g.v} title={g.t} description={g.d} checked={garrapata === g.v} onChange={() => setGarrapata(g.v)} />
            ))}
          </div>
          {f.garrapata && <p className="mt-2 text-[12.5px] font-medium text-danger">{f.garrapata}</p>}
        </fieldset>
        <div className="divide-y divide-border rounded-[12px] border border-border px-4">
          <SwitchRow name="rabia_endemica" label="Rabia paresiante endémica" description="Suma la vacunación antirrábica al plan sugerido." defaultChecked={e.rabia_endemica} />
          <SwitchRow name="fasciola_endemica" label="Fasciola hepática endémica" description="Habitual en bajos y esteros; suma su control al plan." defaultChecked={e.fasciola_endemica} />
        </div>
        <p className="text-[12.5px] text-muted">La interdicción se registra desde la ficha del establecimiento: queda como evento con fecha y autor.</p>
      </Seccion>

      {privados && (
        <Seccion
          id="ubicacion"
          title="Ubicación"
          description={
            <span className="inline-flex items-center gap-1">
              <IconLock size={13} /> Privada por defecto. En lo público sólo se ve departamento y provincia.
            </span>
          }
        >
          <CampoMap center={punto} point={punto} onPoint={setPunto} zoom={punto ? 13 : 9} height={380} ariaLabel="Marcá la ubicación del casco o la tranquera" />
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Latitud" htmlFor="lat" error={f.lat}>
              <Input id="lat" name="lat" inputMode="decimal" value={lat} onChange={(ev) => setLat(ev.target.value)} placeholder="-27,7512" className="w-44 tabular-nums" {...fieldAria("lat", f.lat)} />
            </Field>
            <Field label="Longitud" htmlFor="lon">
              <Input id="lon" name="lon" inputMode="decimal" value={lon} onChange={(ev) => setLon(ev.target.value)} placeholder="-57,6213" className="w-44 tabular-nums" />
            </Field>
            <Button variant="outline" icon={<IconPin size={18} />} onClick={usarMiUbicacion}>
              Usar mi ubicación
            </Button>
            {punto && (
              <Button variant="ghost" onClick={() => setPunto(null)}>
                Quitar punto
              </Button>
            )}
          </div>
          <p className="text-[12.5px] text-muted" aria-live="polite">
            {geoMsg ?? "Tocá el mapa para marcar el casco o la tranquera; podés arrastrar el punto."}
          </p>
        </Seccion>
      )}

      <Seccion id="historia" title="Historia" description="Texto libre para tu perfil público (si activás la sección).">
        <Field label="Contá la historia del campo" htmlFor="historia_txt" optional hint={`${historia.length}/2000`}>
          <Textarea id="historia_txt" name="historia" value={historia} onChange={(ev) => setHistoria(ev.target.value.slice(0, 2000))} rows={6} placeholder="Campo familiar desde 1968. Cría bovina y búfalos Murrah desde 2009…" />
        </Field>
      </Seccion>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface lg:left-[264px]">
        <div className="mx-auto flex max-w-[1360px] items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/establecimiento" className={buttonClass("ghost")}>
            Cancelar
          </Link>
          <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </form>
  );
}
