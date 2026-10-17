"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, Notice, Select, Spinner, Textarea, fieldAria } from "@/components/ui";
import { IconAlert, IconSend } from "@/components/icons";
import type { EventoActionState } from "@/lib/eventos-api";
import {
  avanzarConsultaAction,
  consultarCampoAction,
  descargoAction,
  estadoAvisoAction,
  reportarCampoAction,
  resolverDisputaAction,
  verificarAvisoAction,
} from "@/lib/campos-actions";

type Opcion = { codigo: string; nombre: string };
const INICIAL: EventoActionState = {};

function Resultado({ st }: { st: EventoActionState }) {
  if (st.ok) return <Notice tone="success" title={st.ok.mensaje} />;
  if (st.error) return <Notice tone="danger" title={st.error} />;
  return null;
}

/** Consulta por un campo: rodeo, fechas y consentimiento explícito para compartir el contacto. */
export function ConsultaForm({ aviso, especies, cabezasSugeridas, especieSugerida }: { aviso: string; especies: Opcion[]; cabezasSugeridas?: number; especieSugerida?: string }) {
  const [st, action, pending] = useActionState(consultarCampoAction, INICIAL);
  const f = st.fields ?? {};
  if (st.ok) return <Resultado st={st} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="aviso" value={aviso} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Especie" htmlFor="c-especie">
          <Select id="c-especie" name="especie" defaultValue={especieSugerida ?? especies[0]?.codigo}>
            {especies.map((e) => (
              <option key={e.codigo} value={e.codigo}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cabezas" htmlFor="c-cabezas" error={f.cabezas}>
          <Input id="c-cabezas" name="cabezas" type="number" min={1} inputMode="numeric" defaultValue={cabezasSugeridas || undefined} required {...fieldAria("c-cabezas", f.cabezas)} />
        </Field>
        <Field label="Desde" htmlFor="c-desde" optional>
          <Input id="c-desde" name="desde" type="date" />
        </Field>
      </div>
      <Field label="Mensaje" htmlFor="c-mensaje" error={f.mensaje} hint="Categorías, estado sanitario, fecha estimada de ingreso y cualquier duda sobre el campo.">
        <Textarea id="c-mensaje" name="mensaje" required minLength={10} maxLength={2000} {...fieldAria("c-mensaje", f.mensaje, true)} />
      </Field>
      <label className="flex items-start gap-3 rounded-[10px] border border-border bg-surface-2 px-4 py-3 text-[13.5px] text-ink">
        <input type="checkbox" name="consentimiento" value="1" className="mt-1 h-4 w-4 accent-monte" required />
        <span>
          Acepto compartir mi nombre, email y teléfono con quien publicó este aviso para que me responda. TROPILLA no los muestra a nadie más.
          {f.consentimiento && <span className="mt-1 block font-medium text-danger">{f.consentimiento}</span>}
        </span>
      </label>
      {st.error && !st.fields && <Resultado st={st} />}
      <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : <IconSend size={18} />}>
        Enviar consulta
      </Button>
    </form>
  );
}

/** Reporte (inicio de disputa). La identidad no se muestra al anunciante. */
export function ReporteForm({ aviso, motivos, consultaId }: { aviso: string; motivos: Opcion[]; consultaId?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [st, action, pending] = useActionState(reportarCampoAction, INICIAL);
  const f = st.fields ?? {};
  if (st.ok) return <Resultado st={st} />;
  if (!abierto)
    return (
      <Button variant="ghost" size="sm" icon={<IconAlert size={16} />} onClick={() => setAbierto(true)}>
        Reportar un problema con este aviso
      </Button>
    );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="aviso" value={aviso} />
      {consultaId && <input type="hidden" name="consulta_id" value={consultaId} />}
      <Field label="Motivo" htmlFor="r-motivo">
        <Select id="r-motivo" name="motivo" defaultValue={motivos[0]?.codigo}>
          {motivos.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Qué pasó" htmlFor="r-detalle" error={f.detalle} hint="Quien publicó recibe el reporte sin tu nombre y puede dar su versión. El equipo de TROPILLA revisa y resuelve.">
        <Textarea id="r-detalle" name="detalle" required minLength={20} maxLength={3000} {...fieldAria("r-detalle", f.detalle, true)} />
      </Field>
      {st.error && !st.fields && <Resultado st={st} />}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending} icon={pending ? <Spinner /> : undefined}>
          Enviar reporte
        </Button>
        <Button variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Publicar, pausar o cerrar (cerrar pide motivo: sirve para medir el piloto). */
export function EstadoAvisoForm({ id, estado, motivosCierre }: { id: string; estado: string; motivosCierre: Opcion[] }) {
  const [st, action, pending] = useActionState(estadoAvisoAction, INICIAL);
  const [cerrando, setCerrando] = useState(false);
  if (estado === "cerrado") return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(estado === "borrador" || estado === "pausado") && (
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="accion" value="publicar" />
            <Button type="submit" disabled={pending}>
              {estado === "borrador" ? "Publicar en el mercado" : "Volver a publicar"}
            </Button>
          </form>
        )}
        {estado === "publicado" && (
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="accion" value="pausar" />
            <Button type="submit" variant="outline" disabled={pending}>
              Pausar
            </Button>
          </form>
        )}
        {!cerrando && (
          <Button variant="ghost" onClick={() => setCerrando(true)}>
            Cerrar aviso
          </Button>
        )}
      </div>
      {cerrando && (
        <form action={action} className="flex flex-wrap items-end gap-2 rounded-[10px] border border-border bg-surface-2 p-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="accion" value="cerrar" />
          <div className="min-w-[260px] flex-1">
            <Field label="¿Por qué lo cerrás?" htmlFor="cierre">
              <Select id="cierre" name="motivo" defaultValue={motivosCierre[0]?.codigo}>
                {motivosCierre.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="danger" disabled={pending}>
            Cerrar definitivamente
          </Button>
          <Button variant="ghost" onClick={() => setCerrando(false)}>
            Cancelar
          </Button>
        </form>
      )}
      <Resultado st={st} />
    </div>
  );
}

const SIGUIENTES: Record<"recibidas" | "enviadas", Record<string, Array<{ estado: string; label: string; variant?: "outline" | "ghost" | "danger" }>>> = {
  recibidas: {
    enviada: [{ estado: "descartada", label: "Descartar", variant: "ghost" }],
    respondida: [
      { estado: "visita_coordinada", label: "Visita coordinada", variant: "outline" },
      { estado: "acuerdo", label: "Hubo acuerdo", variant: "outline" },
      { estado: "sin_acuerdo", label: "Sin acuerdo", variant: "ghost" },
    ],
    visita_coordinada: [
      { estado: "acuerdo", label: "Hubo acuerdo", variant: "outline" },
      { estado: "sin_acuerdo", label: "Sin acuerdo", variant: "ghost" },
    ],
  },
  enviadas: {
    enviada: [{ estado: "retirada", label: "Retirar consulta", variant: "ghost" }],
    respondida: [
      { estado: "visita_coordinada", label: "Visita coordinada", variant: "outline" },
      { estado: "acuerdo", label: "Hubo acuerdo", variant: "outline" },
      { estado: "sin_acuerdo", label: "Sin acuerdo", variant: "ghost" },
      { estado: "retirada", label: "Retirar", variant: "ghost" },
    ],
    visita_coordinada: [
      { estado: "acuerdo", label: "Hubo acuerdo", variant: "outline" },
      { estado: "sin_acuerdo", label: "Sin acuerdo", variant: "ghost" },
      { estado: "retirada", label: "Retirar", variant: "ghost" },
    ],
  },
};

/** Respuesta del anunciante y registro del resultado (visita, acuerdo) por cualquiera de las partes. */
export function ConsultaAcciones({ id, lado, estado }: { id: string; lado: "recibidas" | "enviadas"; estado: string }) {
  const [st, action, pending] = useActionState(avanzarConsultaAction, INICIAL);
  const siguientes = SIGUIENTES[lado][estado] ?? [];
  const responder = lado === "recibidas" && estado === "enviada";
  if (!siguientes.length && !responder) return null;
  return (
    <div className="space-y-3">
      {responder && (
        <form action={action} className="space-y-2">
          <input type="hidden" name="lado" value={lado} />
          <input type="hidden" name="consulta" value={id} />
          <input type="hidden" name="estado" value="respondida" />
          <Field label="Tu respuesta" htmlFor={`resp-${id}`} error={st.fields?.respuesta} hint="Al responder, quien consultó ve tu nombre, email y teléfono.">
            <Textarea id={`resp-${id}`} name="respuesta" required maxLength={2000} className="min-h-[88px]" {...fieldAria(`resp-${id}`, st.fields?.respuesta, true)} />
          </Field>
          <Button type="submit" size="sm" disabled={pending} icon={<IconSend size={16} />}>
            Responder y compartir mi contacto
          </Button>
        </form>
      )}
      {siguientes.length > 0 && (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="lado" value={lado} />
          <input type="hidden" name="consulta" value={id} />
          <div className="min-w-[220px] flex-1">
            <label htmlFor={`nota-${id}`} className="sr-only">
              Nota
            </label>
            <Input id={`nota-${id}`} name="nota" placeholder="Nota opcional (p. ej., fecha de ingreso)" maxLength={500} className="h-9 text-[13.5px]" />
          </div>
          {siguientes.map((s) => (
            <Button key={s.estado} type="submit" name="estado" value={s.estado} size="sm" variant={s.variant ?? "outline"} disabled={pending}>
              {s.label}
            </Button>
          ))}
        </form>
      )}
      <Resultado st={st} />
    </div>
  );
}

export function DescargoForm({ aviso, disputa }: { aviso: string; disputa: string }) {
  const [st, action, pending] = useActionState(descargoAction, INICIAL);
  if (st.ok) return <Resultado st={st} />;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="aviso" value={aviso} />
      <input type="hidden" name="disputa" value={disputa} />
      <Field label="Tu descargo" htmlFor={`desc-${disputa}`} error={st.fields?.descargo} hint="Lo lee el equipo de TROPILLA antes de resolver.">
        <Textarea id={`desc-${disputa}`} name="descargo" required minLength={10} maxLength={3000} className="min-h-[88px]" {...fieldAria(`desc-${disputa}`, st.fields?.descargo, true)} />
      </Field>
      {st.error && !st.fields && <Resultado st={st} />}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Enviar descargo
      </Button>
    </form>
  );
}

const ACCIONES_MOD: Opcion[] = [
  { codigo: "ninguna", nombre: "Sin cambios en el aviso" },
  { codigo: "aviso_pausado", nombre: "Pausar el aviso" },
  { codigo: "aviso_cerrado", nombre: "Cerrar el aviso" },
  { codigo: "verificacion_retirada", nombre: "Retirar la verificación" },
];

/** Moderación (staff): tomar o resolver una disputa con acción sobre el aviso. */
export function ResolverForm({ disputa, estado }: { disputa: string; estado: string }) {
  const [st, action, pending] = useActionState(resolverDisputaAction, INICIAL);
  if (st.ok) return <Resultado st={st} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="disputa" value={disputa} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Resultado" htmlFor={`est-${disputa}`}>
          <Select id={`est-${disputa}`} name="estado" defaultValue="resuelta">
            {estado === "abierta" && <option value="en_revision">Tomar el caso (en revisión)</option>}
            <option value="resuelta">Resuelta</option>
            <option value="desestimada">Desestimada</option>
          </Select>
        </Field>
        <Field label="Acción sobre el aviso" htmlFor={`acc-${disputa}`}>
          <Select id={`acc-${disputa}`} name="accion" defaultValue="ninguna">
            {ACCIONES_MOD.map((a) => (
              <option key={a.codigo} value={a.codigo}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Resolución" htmlFor={`res-${disputa}`} error={st.fields?.resolucion} hint="Se comunica a quien reportó y a quien publicó.">
        <Textarea id={`res-${disputa}`} name="resolucion" maxLength={3000} className="min-h-[80px]" {...fieldAria(`res-${disputa}`, st.fields?.resolucion, true)} />
      </Field>
      {st.error && <Resultado st={st} />}
      <Button type="submit" size="sm" disabled={pending}>
        Registrar
      </Button>
    </form>
  );
}

export function VerificarForm({ aviso, niveles, actual }: { aviso: string; niveles: Opcion[]; actual: string }) {
  const [st, action, pending] = useActionState(verificarAvisoAction, INICIAL);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="aviso" value={aviso} />
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <Field label="Nivel de comprobación" htmlFor={`niv-${aviso}`}>
          <Select id={`niv-${aviso}`} name="nivel" defaultValue={actual}>
            {niveles.map((n) => (
              <option key={n.codigo} value={n.codigo}>
                {n.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Qué se comprobó" htmlFor={`nota-v-${aviso}`} error={st.fields?.nota}>
          <Input id={`nota-v-${aviso}`} name="nota" required minLength={10} maxLength={1000} placeholder="Ej.: llamada al anunciante el 17/10, confirmó disponibilidad." />
        </Field>
      </div>
      <Resultado st={st} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Guardar verificación
      </Button>
    </form>
  );
}
