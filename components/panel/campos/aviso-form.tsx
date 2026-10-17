"use client";

import { useActionState, useState } from "react";
import { Button, Card, CardBody, CardHeader, Field, Input, Notice, Select, Spinner, Textarea, fieldAria } from "@/components/ui";
import { guardarAvisoAction } from "@/lib/campos-actions";
import type { EventoActionState } from "@/lib/eventos-api";
import { PROVINCIAS } from "@/lib/geo";
import type { CampoAviso, CondicionesCampos } from "@/lib/data/campos";

type Categoria = { codigo: string; especie?: string; nombre?: string };
const ESPECIES = [
  { codigo: "BOV", nombre: "Bovinos" },
  { codigo: "BUB", nombre: "Búfalos" },
];

function Casillas({ name, opciones, elegidas, onChange }: { name: string; opciones: Array<{ codigo: string; nombre: string }>; elegidas?: string[]; onChange?: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {opciones.map((o) => (
        <label key={o.codigo} className="flex items-center gap-2 text-[14px] text-ink">
          <input
            type="checkbox"
            name={name}
            value={o.codigo}
            defaultChecked={elegidas?.includes(o.codigo)}
            onChange={onChange ? (e) => {
              const form = e.currentTarget.form;
              if (form) onChange(new FormData(form).getAll(name).map(String));
            } : undefined}
            className="h-4 w-4 accent-monte"
          />
          {o.nombre}
        </label>
      ))}
    </div>
  );
}

/** Alta y edición del aviso de campo (TPA-74). Zona solo en provincias del piloto; la ubicación exacta nunca se publica. */
export function AvisoForm({
  cond,
  categorias,
  aviso,
  zonaDefecto,
}: {
  cond: CondicionesCampos;
  categorias: Categoria[];
  aviso?: CampoAviso;
  zonaDefecto: { provincia: string; departamento: string; localidad?: string | null };
}) {
  const [st, action, pending] = useActionState(guardarAvisoAction, {} as EventoActionState);
  const f = st.fields ?? {};
  const piloto = cond.provincias_piloto.map((p) => p.codigo);
  const provIni = aviso?.zona?.provincia_codigo ?? (piloto.includes(zonaDefecto.provincia) ? zonaDefecto.provincia : piloto[0]);
  const [provincia, setProvincia] = useState(provIni);
  const [especies, setEspecies] = useState<string[]>(aviso?.especies ?? ["BOV"]);
  const [unidad, setUnidad] = useState<string>(aviso?.precio?.unidad ?? "por_cabeza_mes");
  const deptos = PROVINCIAS.find((p) => p.codigo === provincia)?.departamentos ?? [];
  const deptoIni = aviso?.zona?.departamento_codigo ?? (provincia === zonaDefecto.provincia ? zonaDefecto.departamento : deptos[0]?.codigo);
  const cats = categorias.filter((c) => c.especie && especies.includes(c.especie));
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      {aviso && <input type="hidden" name="id" value={aviso.id} />}
      {aviso && <input type="hidden" name="row_version" value={aviso.row_version} />}

      <Card>
        <CardHeader title="El campo" description="Lo que publiques es tu declaración: TROPILLA no inspecciona el campo." />
        <CardBody className="space-y-5">
          <Field label="Título" htmlFor="titulo" error={f.titulo} hint="Ej.: Pastaje en bajos de Mercedes, apto búfalos.">
            <Input id="titulo" name="titulo" required minLength={5} maxLength={120} defaultValue={aviso?.titulo} {...fieldAria("titulo", f.titulo, true)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Modalidad" htmlFor="modalidad">
              <Select id="modalidad" name="modalidad" defaultValue={aviso?.modalidad ?? "pastaje"}>
                {cond.modalidades.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Capacidad (cabezas)" htmlFor="capacidad_cabezas" error={f.capacidad_cabezas} hint="Receptividad que declarás para la temporada.">
              <Input id="capacidad_cabezas" name="capacidad_cabezas" type="number" min={1} inputMode="numeric" required defaultValue={aviso?.capacidad_cabezas} {...fieldAria("capacidad_cabezas", f.capacidad_cabezas, true)} />
            </Field>
            <Field label="Superficie (ha)" htmlFor="superficie_ha" error={f.superficie_ha} optional>
              <Input id="superficie_ha" name="superficie_ha" inputMode="decimal" defaultValue={aviso?.superficie_ha ?? ""} {...fieldAria("superficie_ha", f.superficie_ha)} />
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-ink">Especies que recibe</legend>
            <Casillas name="especies" opciones={ESPECIES} elegidas={especies} onChange={setEspecies} />
            {f.especies && <p className="text-[12.5px] font-medium text-danger">{f.especies}</p>}
          </fieldset>
          {cats.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-ink">
                Categorías <span className="font-normal text-muted">(si no marcás ninguna, recibe cualquiera)</span>
              </legend>
              <Casillas key={especies.join(",")} name="categorias" opciones={cats.map((c) => ({ codigo: c.codigo, nombre: c.nombre ?? c.codigo }))} elegidas={aviso?.categorias} />
              {f.categorias && <p className="text-[12.5px] font-medium text-danger">{f.categorias}</p>}
            </fieldset>
          )}
          <Field label="Descripción" htmlFor="descripcion" optional hint="Pasturas, ambientes, manejo que pedís, sanidad exigida al ingreso.">
            <Textarea id="descripcion" name="descripcion" maxLength={3000} defaultValue={aviso?.descripcion ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Temporada y condiciones" />
        <CardBody className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Disponible desde" htmlFor="temporada_desde">
              <Input id="temporada_desde" name="temporada_desde" type="date" required defaultValue={aviso?.temporada_desde ?? hoy} />
            </Field>
            <Field label="Hasta" htmlFor="temporada_hasta" error={f.temporada_hasta} optional hint="Vacío: sin fecha de fin.">
              <Input id="temporada_hasta" name="temporada_hasta" type="date" defaultValue={aviso?.temporada_hasta ?? ""} {...fieldAria("temporada_hasta", f.temporada_hasta, true)} />
            </Field>
            <Field label="Plazo mínimo (meses)" htmlFor="plazo_minimo_meses" optional>
              <Input id="plazo_minimo_meses" name="plazo_minimo_meses" type="number" min={1} max={120} defaultValue={aviso?.plazo_minimo_meses ?? ""} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
            <Field label="Precio" htmlFor="precio_unidad">
              <Select id="precio_unidad" name="precio_unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                {cond.precio_unidades.map((u) => (
                  <option key={u.codigo} value={u.codigo}>
                    {u.codigo === "a_convenir" ? "A convenir" : `Valor ${u.nombre}`}
                  </option>
                ))}
              </Select>
            </Field>
            {unidad !== "a_convenir" && (
              <Field label={unidad === "porcentaje_ganancia" ? "Porcentaje" : unidad === "kg_carne_ha_anio" ? "Kilos" : "Pesos"} htmlFor="precio_valor" error={f.precio_valor}>
                <Input id="precio_valor" name="precio_valor" inputMode="decimal" required defaultValue={aviso?.precio?.valor ?? ""} {...fieldAria("precio_valor", f.precio_valor)} />
              </Field>
            )}
          </div>
          <Field label="Otras condiciones" htmlFor="condiciones" optional hint="Forma de pago, sanidad, mortandad, suplementación, quién recorre.">
            <Textarea id="condiciones" name="condiciones" maxLength={2000} className="min-h-[88px]" defaultValue={aviso?.condiciones ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Agua, alambrado e instalaciones" />
        <CardBody className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-ink">Agua</legend>
            <Casillas name="agua" opciones={cond.agua} elegidas={aviso?.agua} />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-ink">Instalaciones</legend>
            <Casillas name="instalaciones" opciones={cond.instalaciones} elegidas={aviso?.instalaciones} />
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <Field label="Alambrado" htmlFor="alambrado" optional>
              <Select id="alambrado" name="alambrado" defaultValue={aviso?.alambrado ?? ""}>
                <option value="">Sin indicar</option>
                {cond.alambrado.map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Accesos" htmlFor="accesos" optional hint="Rutas y transitabilidad con lluvia.">
              <Input id="accesos" name="accesos" maxLength={500} defaultValue={aviso?.accesos ?? ""} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Zona" description="En el mercado se ve el departamento y la provincia. Nunca mostramos coordenadas ni el lindero." />
        <CardBody className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Provincia" htmlFor="provincia_codigo" error={f.provincia_codigo} hint="Piloto: Corrientes, Chaco, Formosa y Misiones.">
              <Select id="provincia_codigo" name="provincia_codigo" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
                {cond.provincias_piloto.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Departamento" htmlFor="departamento_codigo" error={f.departamento_codigo}>
              <Select key={provincia} id="departamento_codigo" name="departamento_codigo" defaultValue={deptoIni}>
                {deptos.map((d) => (
                  <option key={d.codigo} value={d.codigo}>
                    {d.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Localidad o paraje" htmlFor="localidad" optional>
              <Input id="localidad" name="localidad" maxLength={120} defaultValue={aviso?.zona?.localidad ?? zonaDefecto.localidad ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[14px] text-ink">
            <input type="checkbox" name="mostrar_localidad" value="1" defaultChecked={aviso?.mostrar_localidad ?? false} className="h-4 w-4 accent-monte" />
            Mostrar la localidad en el aviso
          </label>
        </CardBody>
      </Card>

      {st.error && <Notice tone="danger" title={st.error} />}
      {st.ok && <Notice tone="success" title={st.ok.mensaje} />}
      <div className="flex flex-wrap gap-2">
        {aviso ? (
          <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
            Guardar cambios
          </Button>
        ) : (
          <>
            <Button type="submit" name="despues" value="publicar" disabled={pending} icon={pending ? <Spinner /> : undefined}>
              Guardar y publicar
            </Button>
            <Button type="submit" variant="outline" disabled={pending}>
              Guardar borrador
            </Button>
          </>
        )}
        <Button href={aviso ? `/campos/mis-avisos/${aviso.id}` : "/campos/mis-avisos"} variant="ghost">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
