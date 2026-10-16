import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Avatar, Badge, Card, CardHeader, EmptyState, Notice, PageHeader, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconClock, IconLock, IconMail, IconPhone } from "@/components/icons";
import { InvitarDialog } from "@/components/panel/usuarios/invitar";
import { MatrizPermisos } from "@/components/panel/usuarios/matriz";
import { requireContexto } from "@/lib/establecimiento";
import { ROL_LABEL } from "@/lib/auth";
import { api } from "@/lib/api";
import { cambiarRolAction, revocarInvitacionAction, revocarMembresiaAction } from "@/lib/usuarios-actions";
import { fecha } from "@/lib/format";
import type { Many, S } from "@/lib/schemas";

export const metadata: Metadata = { title: "Usuarios y roles" };

const MSG: Record<string, { tone: "success" | "danger"; title: string }> = {
  "ok:rol": { tone: "success", title: "Rol actualizado. El cambio quedó registrado en la auditoría." },
  "ok:revocada": { tone: "success", title: "Acceso revocado. Lo que cargó esa persona sigue en el historial." },
  "ok:invitacion": { tone: "success", title: "Invitación revocada: el enlace ya no sirve." },
  "error:permiso": { tone: "danger", title: "Tu rol no permite gestionar usuarios." },
  "error:rol": { tone: "danger", title: "No pudimos cambiar el rol. Probá de nuevo." },
  "error:revocar": { tone: "danger", title: "No pudimos revocar el acceso. Probá de nuevo." },
  "error:invitacion": { tone: "danger", title: "No pudimos revocar la invitación." },
};
const ROLES_EDITABLES = ["admin", "encargado", "asesor", "lectura"] as const;
const IDX: Record<string, number> = { dueno: 0, admin: 1, encargado: 2, asesor: 3, lectura: 4 };

async function Contenido({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  const msg = sp.ok ? MSG[`ok:${sp.ok}`] : sp.error ? MSG[`error:${sp.error}`] : undefined;
  const est = ctx.activa.establecimiento_id;
  const gestiona = ctx.can("usuarios.gestionar");

  if (!ctx.can("usuarios.ver")) {
    return (
      <>
        <PageHeader title="Usuarios y roles" subtitle={`Quiénes trabajan en ${ctx.activa.establecimiento_nombre} y qué puede hacer cada uno.`} />
        <Card>
          <EmptyState icon={<IconLock size={24} />} title="Esta sección es para el dueño y los administradores" description="Abajo podés ver qué permite tu rol. Si necesitás otro acceso, pedíselo al dueño del establecimiento." />
          <div className="border-t border-border">
            <MatrizPermisos destacar={IDX[ctx.activa.rol]} />
          </div>
        </Card>
      </>
    );
  }

  const [membresias, invitaciones] = await Promise.all([
    api<Many<S<"Membresia">>>(`/establecimientos/${est}/membresias?estado=activa`).then((r) => r.data),
    gestiona ? api<Many<S<"Invitacion">>>(`/establecimientos/${est}/invitaciones`).then((r) => r.data.filter((i) => !i.aceptada_en && !i.revocada_en)) : Promise.resolve([]),
  ]);
  const activas = membresias.filter((m) => m.estado !== "revocada");

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        subtitle={`Quiénes trabajan en ${ctx.activa.establecimiento_nombre} y qué puede hacer cada uno.`}
        actions={gestiona ? <InvitarDialog establecimiento={ctx.activa.establecimiento_nombre ?? "tu establecimiento"} /> : undefined}
      />
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone} title={msg.title} />
        </div>
      )}

      <Card>
        <CardHeader title="Equipo" description={`${activas.length} ${activas.length === 1 ? "persona con acceso" : "personas con acceso"}`} />
        <Table minWidth={760}>
          <thead>
            <tr>
              <Th>Persona</Th>
              <Th>Rol</Th>
              <Th>Desde</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {activas.map((m) => {
              const yo = m.usuario?.id === ctx.me.usuario.id;
              const editable = gestiona && !yo && m.rol !== "dueno";
              return (
                <Tr key={m.id}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={m.usuario?.nombre ?? "?"} size={34} />
                      <span>
                        <span className="block font-semibold text-ink">
                          {m.usuario?.nombre} {yo && <span className="font-normal text-muted">(vos)</span>}
                        </span>
                        <span className="block text-[12.5px] text-muted">{m.usuario?.email ?? m.usuario?.telefono}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    {editable ? (
                      <form action={cambiarRolAction} className="flex items-center gap-2">
                        <input type="hidden" name="membresia_id" value={m.id} />
                        <label htmlFor={`rol-${m.id}`} className="sr-only">
                          Rol de {m.usuario?.nombre}
                        </label>
                        <select id={`rol-${m.id}`} name="rol" defaultValue={m.rol} className="h-9 rounded-[var(--radius-control)] border border-border-strong bg-surface px-2 text-[13.5px]">
                          {ROLES_EDITABLES.map((r) => (
                            <option key={r} value={r}>
                              {ROL_LABEL[r]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className={buttonClass("ghost", "sm")}>
                          Cambiar
                        </button>
                      </form>
                    ) : (
                      <Badge tone={m.rol === "dueno" ? "primary" : "neutral"}>{ROL_LABEL[m.rol ?? "lectura"]}</Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{fecha(m.aceptada_en)}</Td>
                  <Td className="text-right">
                    {editable && (
                      <form action={revocarMembresiaAction}>
                        <input type="hidden" name="membresia_id" value={m.id} />
                        <button type="submit" className={buttonClass("danger", "sm")}>
                          Revocar acceso
                        </button>
                      </form>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {gestiona && (
        <Card className="mt-4">
          <CardHeader title="Invitaciones pendientes" description="Vencen a los 7 días. Revocar invalida el enlace." />
          {invitaciones.length ? (
            <ul className="divide-y divide-border">
              {invitaciones.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  {i.email ? <IconMail size={20} className="text-muted" /> : <IconPhone size={20} className="text-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{i.email ?? i.telefono}</span>
                    <span className="flex items-center gap-1 text-[12.5px] text-muted">
                      <IconClock size={13} /> Vence el {fecha(i.expira_en)}
                    </span>
                  </span>
                  <Badge>{ROL_LABEL[i.rol ?? "lectura"]}</Badge>
                  <form action={revocarInvitacionAction}>
                    <input type="hidden" name="invitacion_id" value={i.id} />
                    <button type="submit" className={buttonClass("ghost", "sm", "text-danger")}>
                      Revocar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-[14px] text-muted">No hay invitaciones pendientes. Invitá a tu encargado o a tu veterinario: cada uno ve sólo lo que necesita.</p>
          )}
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader title="Qué puede hacer cada rol" description="El encargado carga hacienda y sanidad, pero no ve precios ni datos fiscales." />
        <MatrizPermisos destacar={IDX[ctx.activa.rol]} />
      </Card>
    </>
  );
}

/** Usuarios y roles (TPA-11, flujo 16). */
export default function UsuariosPage(props: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  return (
    <>
      <Link href="/configuracion" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Configuración
      </Link>
      <Suspense fallback={<div className="h-[420px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
