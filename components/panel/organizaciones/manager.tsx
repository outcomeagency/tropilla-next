"use client";

import { useState } from "react";
import type { S } from "@/lib/schemas";
import { Button, Card, CardBody, CardHeader, Notice } from "@/components/ui";
import { IconCheckCircle, IconClock, IconInfo } from "@/components/icons";
import { adherirAction, consentimientoAction, revocarAction, miembroAction, cambiarRolMiembroAction, quitarMiembroAction } from "@/app/(panel)/organizaciones/actions";

const CAMPOS: Array<{ key: keyof S<"Alcances">; label: string; detail: string }> = [
  { key: "existencias_agregadas", label: "Existencias agregadas", detail: "Totales por categoría, sin identificar animales." },
  { key: "cobertura_sanitaria", label: "Cobertura sanitaria", detail: "Indicadores generales de sanidad del establecimiento." },
  { key: "lotes_postulados", label: "Lotes postulados", detail: "Datos de los lotes que elijas postular." },
  { key: "precios_agregados", label: "Precios agregados", detail: "Valores agrupados y sin atribución individual." },
];

function ConsentFields({ defaults = {} }: { defaults?: Partial<S<"Alcances">> }) {
  return <div className="grid gap-3 sm:grid-cols-2">{CAMPOS.map((item) => (
    <label key={item.key} className="flex gap-3 rounded-[10px] border border-border p-3">
      <input type="checkbox" name={item.key} defaultChecked={defaults[item.key] ?? false} className="mt-1 accent-monte" />
      <span><span className="block text-sm font-semibold text-ink">{item.label}</span><span className="mt-0.5 block text-xs text-muted">{item.detail}</span></span>
    </label>
  ))}</div>;
}

export function OrganizacionesManager({
  organizaciones,
  adhesiones,
  puedeAdherir,
  puedeGestionar,
  integrantes,
  esStaff,
}: {
  organizaciones: S<"Organizacion">[];
  adhesiones: S<"Adhesion">[];
  puedeAdherir: boolean;
  puedeGestionar: boolean;
  integrantes: { id?: string; nombre?: string; rol?: "admin" | "operador"; miembros: { usuario: { id: string; nombre: string; email: string }; rol: "admin" | "operador" }[] }[];
  esStaff: boolean;
}) {
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const adheridas = new Set(adhesiones.filter((a) => a.estado === "activa").map((a) => a.organizacion?.id));
  return <div className="space-y-6">
    {(integrantes.length > 0 || esStaff) && <section className="space-y-3"><h2 className="text-lg font-semibold text-ink">Administrar integrantes</h2>
      {integrantes.map((org) => <Card key={org.id}><CardHeader title={org.nombre ?? "Organización"} description="Administradores y operadores" /><CardBody className="space-y-4">
        {org.miembros.map((m) => <div key={m.usuario.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-sm">
          <span>{m.usuario.nombre} · {m.usuario.email}</span><div className="flex gap-2">
            <form action={cambiarRolMiembroAction} className="flex items-center gap-2"><input type="hidden" name="organizacion_id" value={org.id} /><input type="hidden" name="usuario_id" value={m.usuario.id} /><select name="rol" defaultValue={m.rol} className="h-9 rounded border border-border px-2"><option value="admin">Admin</option><option value="operador">Operador</option></select><Button type="submit" variant="outline" size="sm">Guardar rol</Button></form>
            <form action={quitarMiembroAction}><input type="hidden" name="organizacion_id" value={org.id} /><input type="hidden" name="usuario_id" value={m.usuario.id} /><Button type="submit" variant="danger" size="sm">Dar de baja</Button></form>
          </div></div>)}
        <form action={miembroAction} className="flex flex-wrap items-end gap-3"><input type="hidden" name="organizacion_id" value={org.id} /><label className="text-xs text-muted">Email<input required type="email" name="email" className="mt-1 block h-9 rounded border border-border px-2 text-sm" /></label><label className="text-xs text-muted">Rol<select name="rol" className="mt-1 block h-9 rounded border border-border px-2 text-sm"><option value="operador">Operador</option><option value="admin">Admin</option></select></label><Button type="submit" size="sm">Agregar integrante</Button></form>
      </CardBody></Card>)}
      {esStaff && integrantes.length === 0 && <p className="text-sm text-muted">Tu cuenta es de staff; para administrar integrantes, accedé desde una organización donde tengas rol admin.</p>}
    </section>}
    <Notice tone="info" title="Vos decidís qué compartir.">Cada cambio registra una nueva versión y su huella. La adhesión no publica datos en el directorio.</Notice>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Organizaciones disponibles</h2>
      {organizaciones.length ? organizaciones.map((org) => <Card key={org.id}>
        <CardHeader title={org.nombre ?? "Organización"} description={[org.tipo, org.especies?.join(" · ")].filter(Boolean).join(" · ")} />
        <CardBody>
          {org.descripcion && <p className="mb-4 text-sm text-muted">{org.descripcion}</p>}
          {adheridas.has(org.id) ? <p className="flex items-center gap-2 text-sm font-medium text-monte"><IconCheckCircle size={17} />Ya adherís a esta organización</p> : puedeAdherir ? <form action={adherirAction} className="space-y-4">
            <input type="hidden" name="organizacion_id" value={org.id} />
            <p className="text-sm font-semibold text-ink">Elegí qué autorizás compartir</p>
            <ConsentFields />
            <Button type="submit">Adherirme con este consentimiento</Button>
          </form> : <p className="text-sm text-muted">Tu rol no permite gestionar adhesiones.</p>}
        </CardBody>
      </Card>) : <Card><CardBody><p className="text-sm text-muted">No hay organizaciones disponibles para tu perfil.</p></CardBody></Card>}
    </section>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Historial de adhesiones</h2>
      {adhesiones.length ? adhesiones.map((adhesion) => <Card key={adhesion.id}>
        <CardHeader title={adhesion.organizacion?.nombre ?? "Organización"} description={adhesion.estado === "activa" ? "Adhesión activa" : "Adhesión revocada"} />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><IconClock size={14} />Consentimiento v{adhesion.consentimiento?.version ?? 1}</span>
            {adhesion.consentimiento?.huella && <span className="inline-flex items-center gap-1"><IconInfo size={14} />Integridad registrada · {adhesion.consentimiento.huella.slice(0, 12)}…</span>}
            {adhesion.historial?.length ? <span>{adhesion.historial.length} versiones registradas</span> : null}
          </div>
          {adhesion.estado === "activa" && puedeGestionar && <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <form action={consentimientoAction} className="space-y-3">
              <input type="hidden" name="adhesion_id" value={adhesion.id} />
              <ConsentFields defaults={adhesion.consentimiento?.alcances} />
              <Button type="submit" variant="outline" size="sm">Guardar nueva versión</Button>
            </form>
            <div className="space-y-2">
              {confirmar === adhesion.id ? <form action={revocarAction} className="space-y-2">
                <input type="hidden" name="adhesion_id" value={adhesion.id} />
                <label className="block text-xs text-muted">Motivo <input name="motivo" required defaultValue="Decisión del productor" className="mt-1 h-9 w-full rounded border border-border px-2 text-sm" /></label>
                <div className="flex gap-2"><Button type="submit" variant="danger" size="sm">Confirmar revocación</Button><Button type="button" variant="ghost" size="sm" onClick={() => setConfirmar(null)}>Cancelar</Button></div>
              </form> : <Button type="button" variant="danger" size="sm" onClick={() => adhesion.id && setConfirmar(adhesion.id)}>Revocar adhesión</Button>}
            </div>
          </div>}
        </CardBody>
      </Card>) : <Card><CardBody><p className="text-sm text-muted">Todavía no tenés adhesiones registradas.</p></CardBody></Card>}
    </section>
  </div>;
}
