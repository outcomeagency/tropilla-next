import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Card, CardHeader, Notice, PageHeader, SpeciesChip, Table, Td, Th, Tr, cx } from "@/components/ui";
import { IconAlert, IconShieldCheck } from "@/components/icons";
import { SanidadTabs } from "@/components/panel/sanidad/tabs";
import { AgregarPlantillas, ArchivarItem, EditarItem, EstadoItem, NuevoItem, PlantillasInline, type PlantillaVista } from "@/components/panel/sanidad/plan";
import { requireContexto } from "@/lib/establecimiento";
import { getPlan, listProductos } from "@/lib/data/sanidad";
import { getCatalogos } from "@/lib/data/catalogos";
import { getEstablecimiento } from "@/lib/data/establecimientos";
import { MESES_CORTOS, aQuienes, condicionTexto, cuando, repite, segmentosAnio, type Alcance, type Condicion, type Disparador, type Repeticion } from "@/lib/plan-sanitario";
import { fechaLarga, hoyAR } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Plan sanitario" };

const TIPO_EVENTO: Record<string, string> = {
  "sanidad.vacunacion": "Vacunación",
  "sanidad.desparasitacion": "Desparasitación",
  "sanidad.tratamiento": "Tratamiento",
  "sanidad.prueba_diagnostica": "Prueba diagnóstica",
  "sanidad.analisis_laboratorio": "Análisis",
};

function Aviso({ aviso, aceptadoEn, aceptadoPor }: { aviso: string; aceptadoEn?: string | null; aceptadoPor?: string | null }) {
  return (
    <div className="mb-4 flex gap-3 rounded-[var(--radius-card)] border border-warning-border bg-warning-bg px-5 py-4 text-warning">
      <IconAlert size={22} className="mt-0.5 shrink-0" />
      <div className="text-[14px]">
        <p className="text-[15px] font-semibold">Validá este plan con tu veterinario</p>
        <p className="mt-0.5 text-ink/80">{aviso.replace(/^Validá este plan con tu veterinario\.\s*/, "")} Todo es editable: las plantillas son sugerencias, nunca dosis prescriptas.</p>
        {aceptadoEn && (
          <p className="mt-1.5 text-[12.5px] text-muted">
            Aviso aceptado{aceptadoPor ? ` por ${aceptadoPor}` : ""} el {fechaLarga(aceptadoEn)}.
          </p>
        )}
      </div>
    </div>
  );
}

async function Contenido() {
  const ctx = await requireContexto();
  await connection();
  const est = ctx.activa.establecimiento_id;
  const [plan, cat, productos, establecimiento] = await Promise.all([getPlan(est), getCatalogos(), listProductos(est).catch(() => []), getEstablecimiento(est).catch(() => null)]);
  const puedeEditar = ctx.can("plan.editar");
  const enfermedades = cat.items.enfermedades ?? [];
  const enfNombre = new Map(enfermedades.map((e) => [e.codigo, e.nombre]));
  const catNombre = new Map(cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo]));
  const prodOpts = productos.filter((p) => !p.archivado_en && p.id).map((p) => ({ id: p.id ?? "", nombre: p.nombre_comercial ?? "" }));
  const prodNombre = new Map(prodOpts.map((p) => [p.id, p.nombre]));
  const especiesEst = ((establecimiento as { especies?: string[] } | null)?.especies ?? []) as string[];

  const plantillas: PlantillaVista[] = (cat.plantillas as Array<Record<string, unknown>>)
    .filter((p) => p.activa !== false && p.codigo !== "plantilla_libre")
    .map((p) => ({
      codigo: String(p.codigo),
      nombre: String(p.nombre ?? p.codigo),
      especie: (p.especie as string | null) ?? null,
      enfermedad: (p.enfermedad as string | null) ?? null,
      disparador: (p.disparador ?? {}) as Disparador,
      repeticion: (p.repeticion ?? null) as Repeticion,
      condicion: (p.condicion ?? null) as Condicion,
      nota: (p.nota as string | null) ?? null,
      fuente: (p.fuente as string | null) ?? null,
    }));
  const items = (plan.items ?? []).filter((i) => !i.archivado_en);
  const aplicadas = items.map((i) => i.plantilla_codigo ?? "").filter(Boolean);
  const preseleccion = plantillas.filter((p) => !p.especie || especiesEst.includes(p.especie) || !especiesEst.length).map((p) => p.codigo);
  const aceptadoPor = (plan.aviso_aceptado_por as { nombre?: string } | null)?.nombre ?? null;
  const hoy = hoyAR(new Date());
  const [, hm, hd] = hoy.split("-").map(Number);
  const hoyFrac = (Date.UTC(2025, hm - 1, hd) - Date.UTC(2025, 0, 1)) / 86_400_000 / 365;
  const sinFecha = items.filter((i) => i.activo && i.requiere_configuracion);
  const enGrilla = items.filter((i) => segmentosAnio(i.disparador as Disparador).length);

  if (!items.length) {
    return (
      <>
        <SanidadTabs activo="plan" />
        <Aviso aviso={plan.aviso ?? ""} />
        <Card>
          <CardHeader
            title="Armá el plan sanitario desde plantillas"
            description="Elegimos las que corresponden a las especies de tu campo. Las condicionadas por zona (rabia, fasciola, garrapata) sólo generan tareas si tu zona sanitaria lo indica."
          />
          {puedeEditar ? (
            <PlantillasInline plantillas={plantillas} preseleccion={preseleccion} enfermedades={enfermedades} />
          ) : (
            <p className="px-5 py-6 text-[14px] text-muted">El plan lo arma el dueño, un administrador o el veterinario del establecimiento.</p>
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      <SanidadTabs activo="plan">
        {puedeEditar && (
          <div className="flex flex-wrap gap-2">
            <NuevoItem productos={prodOpts} enfermedades={enfermedades} />
            <AgregarPlantillas plantillas={plantillas} aplicadas={aplicadas} enfermedades={enfermedades} />
          </div>
        )}
      </SanidadTabs>
      <Aviso aviso={plan.aviso ?? ""} aceptadoEn={plan.aviso_aceptado_en} aceptadoPor={aceptadoPor} />
      {sinFecha.length > 0 && (
        <div className="mb-4">
          <Notice tone="info" title={`${sinFecha.length} ${sinFecha.length === 1 ? "ítem necesita" : "ítems necesitan"} la fecha de tu zona: ${sinFecha.map((i) => i.nombre).join(", ")}`}>
            Las campañas cambian por provincia y año: tocá «Editar» y cargá la ventana que fijó tu fundación o tu veterinario. Hasta entonces no generan tareas.
          </Notice>
        </div>
      )}

      {enGrilla.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <CardHeader title="Año sanitario" description="Ventanas y fechas fijas del plan. La línea marca hoy." />
          <div className="overflow-x-auto">
            <div className="min-w-[760px] px-5 py-4">
              <div className="grid grid-cols-[220px_minmax(0,1fr)] items-end gap-3 pb-2">
                <span />
                <div className="grid grid-cols-12 text-center text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">
                  {MESES_CORTOS.map((m, i) => (
                    <span key={m} className={cx(i + 1 === hm && "text-monte")}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <ul className="space-y-1.5">
                {enGrilla.map((i) => {
                  const segs = segmentosAnio(i.disparador as Disparador);
                  const apagado = !i.activo || i.aplica === false;
                  return (
                    <li key={i.id} className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-3">
                      <span className="truncate text-[13.5px] font-medium text-ink" title={i.nombre}>
                        {i.nombre}
                      </span>
                      <div className="relative h-7 rounded-[6px] bg-surface-2">
                        <div className="absolute inset-0 grid grid-cols-12" aria-hidden="true">
                          {MESES_CORTOS.map((m, k) => (
                            <span key={m} className={cx("h-full", k > 0 && "border-l border-surface")} />
                          ))}
                        </div>
                        {segs.map((s, k) =>
                          s.punto ? (
                            <span
                              key={k}
                              className={cx("absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface", apagado ? "bg-subtle" : "bg-tierra")}
                              style={{ left: `${s.desde * 100}%` }}
                            />
                          ) : (
                            <span
                              key={k}
                              className={cx("absolute top-1 bottom-1 rounded-[4px]", apagado ? "bg-crema-300" : "bg-chart-2")}
                              style={{ left: `${s.desde * 100}%`, width: `${Math.max(0.6, (s.hasta - s.desde) * 100)}%` }}
                            />
                          ),
                        )}
                        <span className="absolute -top-1 -bottom-1 w-0.5 bg-monte" style={{ left: `${hoyFrac * 100}%` }} aria-hidden="true" />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-[3px] bg-chart-2" /> Ventana
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-tierra" /> Fecha fija
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-[3px] bg-crema-300" /> Apagado o no aplica a tu zona
                </span>
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Ítems del plan" description="Cada ítem genera las tareas del calendario. Editá fechas y productos con lo que indique tu veterinario." />
        <Table minWidth={1040}>
          <thead>
            <tr>
              <Th>Qué</Th>
              <Th>Cuándo</Th>
              <Th>A quiénes</Th>
              <Th>Producto</Th>
              <Th>Estado</Th>
              {puedeEditar && (
                <Th>
                  <span className="sr-only">Acciones</span>
                </Th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const cond = condicionTexto(i.condicion as Condicion);
              const rep = repite(i.repeticion as Repeticion);
              return (
                <Tr key={i.id}>
                  <Td className="min-w-[220px]">
                    <span className="block font-semibold text-ink">{i.nombre}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
                      {TIPO_EVENTO[i.tipo_evento ?? ""] ?? i.tipo_evento}
                      {i.enfermedad && <> · {enfNombre.get(i.enfermedad) ?? i.enfermedad}</>}
                      {i.especie && <SpeciesChip especie={especieDe(i.especie)} />}
                      {i.editado && <Badge tone="neutral">Editado</Badge>}
                    </span>
                    {i.nota && <span className="mt-1 block max-w-[320px] text-[12px] text-warning">{i.nota}</span>}
                  </Td>
                  <Td className="text-[13.5px]">
                    {cuando(i.disparador as Disparador)}
                    {rep && <span className="block text-[12.5px] text-muted">{rep}</span>}
                    {cond && <span className="block text-[12.5px] text-muted">Sólo si: {cond}</span>}
                  </Td>
                  <Td className="max-w-[220px] text-[13.5px]">{aQuienes(i.alcance as Alcance, (c) => catNombre.get(c) ?? c)}</Td>
                  <Td className="text-[13.5px]">{i.producto_id ? (prodNombre.get(i.producto_id) ?? "Producto archivado") : <span className="text-subtle">Sin definir</span>}</Td>
                  <Td>
                    <EstadoItem activo={!!i.activo} aplica={i.aplica !== false} requiereConfig={!!i.requiere_configuracion} condicion={cond} />
                  </Td>
                  {puedeEditar && (
                    <Td className="whitespace-nowrap text-right">
                      <EditarItem
                        item={{ id: i.id ?? "", nombre: i.nombre ?? "", disparador: (i.disparador ?? {}) as Disparador, productoId: i.producto_id ?? null, activo: !!i.activo, rowVersion: i.row_version ?? 1, tipoEvento: i.tipo_evento ?? "" }}
                        productos={prodOpts}
                      />
                      <ArchivarItem id={i.id ?? ""} nombre={i.nombre ?? ""} />
                    </Td>
                  )}
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-[12.5px] text-muted">
          <IconShieldCheck size={15} className="shrink-0 text-campo" /> Las tareas que genera el plan aparecen en el resumen de Sanidad y se cierran al registrar la aplicación.
        </p>
      </Card>
    </>
  );
}

/** Plan sanitario desde plantillas, con aviso de validación veterinaria (TPA-33). */
export default function PlanPage() {
  return (
    <>
      <PageHeader title="Sanidad" subtitle="Plan sanitario del establecimiento: qué se hace, cuándo y a quiénes." />
      <Suspense fallback={<div className="h-[560px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
