import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Card, MockNotice, PageHeader, SpeciesChip, buttonClass } from "@/components/ui";
import { IconCheckCircle, IconMap, IconPin } from "@/components/icons";
import { getContexto } from "@/lib/establecimiento";
import { ROL_LABEL } from "@/lib/auth";
import { cambiarEstablecimientoAction } from "@/lib/establecimiento-actions";
import { getMisEstablecimientos } from "@/lib/data/establecimientos";
import { actividadNombre, ubicacionCorta } from "@/lib/geo";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Mis establecimientos" };

const nf = new Intl.NumberFormat("es-AR");

async function Lista() {
  const ctx = await getContexto();
  if (!ctx) return null;
  const lista = await getMisEstablecimientos().catch(() => null);
  const porId = new Map((lista?.data ?? []).map((e) => [e.id, e]));

  return (
    <>
      {lista?.source === "mock" && (
        <div className="mb-4">
          <MockNotice what="Las ubicaciones" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ctx.me.membresias.map((m) => {
          const e = porId.get(m.establecimiento_id);
          const activo = m.establecimiento_id === ctx.activa.establecimiento_id;
          return (
            <Card key={m.id} className={activo ? "ring-1 ring-campo" : undefined}>
              <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">
                  <IconMap size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[16px] font-semibold text-ink">{m.establecimiento_nombre ?? e?.nombre}</h2>
                  <p className="truncate text-[13px] text-muted">{m.productor_nombre}</p>
                </div>
                {activo && (
                  <Badge tone="success" icon={<IconCheckCircle size={14} />}>
                    Activo
                  </Badge>
                )}
              </div>
              <div className="space-y-3 px-5 py-4 text-[14px]">
                {e && (
                  <p className="flex items-center gap-1.5 text-ink">
                    <IconPin size={16} className="text-muted" />
                    {ubicacionCorta(e.provincia_codigo, e.departamento_codigo, e.localidad)}
                    {e.superficie_ha && <span className="text-muted">· {nf.format(Number(e.superficie_ha))} ha</span>}
                  </p>
                )}
                {e && (
                  <div className="flex flex-wrap gap-1.5">
                    {e.especies.map((esp) => (
                      <SpeciesChip key={esp} especie={especieDe(esp)} />
                    ))}
                    {(e.actividades ?? []).map((a) => (
                      <span key={a} className="rounded-[var(--radius-chip)] border border-border px-2 py-0.5 text-[12px] text-muted">
                        {actividadNombre(a)}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[13px] text-muted">
                  Tu rol: <span className="font-semibold text-ink">{ROL_LABEL[m.rol]}</span>
                </p>
              </div>
              {activo ? (
                <p className="flex h-[57px] items-center gap-1.5 border-t border-border px-5 text-[13px] text-muted">
                  <IconCheckCircle size={16} className="text-campo" /> Estás trabajando en este campo
                </p>
              ) : (
                <form action={cambiarEstablecimientoAction} className="border-t border-border px-5 py-3">
                  <input type="hidden" name="establecimiento_id" value={m.establecimiento_id} />
                  <input type="hidden" name="volver" value="/inicio" />
                  <button type="submit" className={buttonClass("outline", "sm")}>
                    Trabajar en este campo
                  </button>
                </form>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

export default function EstablecimientosPage() {
  return (
    <>
      <PageHeader title="Mis establecimientos" subtitle="Los campos donde tenés acceso y tu rol en cada uno. Lo que cargás queda en el campo activo." />
      <Suspense fallback={<div className="h-[220px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Lista />
      </Suspense>
    </>
  );
}
