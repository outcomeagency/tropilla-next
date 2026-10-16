import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Button, Card, CardHeader, EmptyState, KpiCard, PageHeader, Table, Td, Th, Tr, TrustInline } from "@/components/ui";
import { IconAlert, IconArrowRight, IconChevronRight, IconClock, IconList, IconHeart, IconPlus, IconShield, IconShieldCheck, IconSyringe } from "@/components/icons";
import { SanidadTabs } from "@/components/panel/sanidad/tabs";
import { requireContexto } from "@/lib/establecimiento";
import { listProductos, listReactores, listRetiros } from "@/lib/data/sanidad";
import { listEventos } from "@/lib/data/eventos";
import { fecha, hoyAR, nf } from "@/lib/format";
import { ROL_LABEL } from "@/lib/auth";

export const metadata: Metadata = { title: "Sanidad" };

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const ATAJOS = [
  { tipo: "sanidad.vacunacion", titulo: "Vacunar", bajada: "Un lote, un potrero o animales sueltos", Icon: IconSyringe },
  { tipo: "sanidad.desparasitacion", titulo: "Desparasitar", bajada: "Con el producto y cómo se dosificó", Icon: IconShieldCheck },
  { tipo: "sanidad.tratamiento", titulo: "Tratar un animal", bajada: "Diagnóstico, producto y días", Icon: IconHeart },
];

async function Contenido() {
  const ctx = await requireContexto();
  await connection();
  const est = ctx.activa.establecimiento_id;
  const hoy = hoyAR(new Date());
  const [eventos, retiros, reactores, productos] = await Promise.all([
    listEventos(est, { modulo: "sanidad", desde: sumarDias(hoy, -90) }, undefined, 12),
    listRetiros(est).catch(() => ({ data: [], lotes: [] })),
    listReactores(est).catch(() => []),
    listProductos(est).catch(() => []),
  ]);
  const enRetiro = retiros.data.length + (retiros.lotes ?? []).reduce((s, l) => s + (l.cabezas ?? 0), 0);
  const aplicaciones30 = eventos.data.filter((e) => !e.anulado && (e.ocurrido_en ?? "") >= sumarDias(hoy, -30)).length;
  const puedeRegistrar = ctx.can("sanidad.crear");

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="registros sanitarios en 30 días" value={nf.format(aplicaciones30)} icon={<IconSyringe size={22} />} href="/hacienda/eventos?modulo=sanidad" />
        <KpiCard label="cabezas con retiro vigente" value={nf.format(enRetiro)} icon={<IconClock size={22} />} href="/hacienda?sanidad=retiro" />
        <KpiCard label="reactores (privado)" value={nf.format(reactores.length)} icon={<IconAlert size={22} />} />
        <KpiCard label="productos en el catálogo" value={nf.format(productos.filter((p) => !p.archivado_en).length)} icon={<IconList size={22} />} href="/sanidad/productos" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Últimos registros"
            description="Vacunas, desparasitaciones, tratamientos y pruebas de los últimos 90 días."
            action={
              <Link href="/hacienda/eventos?modulo=sanidad" className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
                Ver todo <IconArrowRight size={14} />
              </Link>
            }
          />
          {eventos.data.length ? (
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Registro</Th>
                  <Th>Cargado por</Th>
                  <Th>Confianza</Th>
                  <Th>
                    <span className="sr-only">Abrir</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {eventos.data.map((e) => (
                  <Tr key={e.id}>
                    <Td className="whitespace-nowrap tabular-nums text-[13.5px]">{fecha(e.ocurrido_en)}</Td>
                    <Td>
                      <Link href={`/hacienda/eventos/${e.id}`} className={`font-semibold hover:text-campo hover:underline ${e.anulado ? "text-muted line-through" : "text-ink"}`}>
                        {e.tipo_nombre ?? e.tipo}
                      </Link>
                      {e.resumen && <span className="block max-w-[420px] truncate text-[12.5px] text-muted">{e.resumen}</span>}
                    </Td>
                    <Td className="text-[13.5px]">
                      {e.autor?.nombre}
                      {e.autor?.rol && <span className="block text-[12px] text-muted">{ROL_LABEL[e.autor.rol as keyof typeof ROL_LABEL] ?? e.autor.rol}</span>}
                    </Td>
                    <Td>
                      <TrustInline nivel={e.confianza ?? "declarado"} />
                    </Td>
                    <Td className="w-10">
                      <Link href={`/hacienda/eventos/${e.id}`} aria-label="Abrir" className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-surface-2">
                        <IconChevronRight size={18} />
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={<IconShield size={24} />}
              title="Todavía no hay registros sanitarios"
              description="Cargá la última vacunación de aftosa o la desparasitación del otoño: con un lote o un potrero alcanza para toda la hacienda que estaba ahí. Si el producto tiene retiro, TROPILLA lo calcula y avisa antes de vender."
              action={
                puedeRegistrar ? (
                  <Button href="/sanidad/registrar?tipo=sanidad.vacunacion" icon={<IconPlus size={18} />}>
                    Registrar una vacunación
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>

        {puedeRegistrar && (
          <Card className="self-start">
            <CardHeader title="Registrar" description="A un animal, un lote o un potrero completo." />
            <ul className="divide-y divide-border">
              {ATAJOS.map((a) => (
                <li key={a.tipo}>
                  <Link href={`/sanidad/registrar?tipo=${a.tipo}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">
                      <a.Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-ink">{a.titulo}</span>
                      <span className="block text-[12.5px] text-muted">{a.bajada}</span>
                    </span>
                    <IconChevronRight size={18} className="text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

/** Resumen de Sanidad: indicadores, últimos registros y atajos (TPA-32; tareas y retiros se suman en TPA-33/35). */
export default function SanidadPage() {
  return (
    <>
      <PageHeader
        title="Sanidad"
        subtitle="Vacunas, desparasitaciones y tratamientos del establecimiento, con sus retiros."
        actions={
          <Suspense fallback={null}>
            <Accion />
          </Suspense>
        }
      />
      <SanidadTabs activo="resumen" />
      <Suspense fallback={<div className="h-[560px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Accion() {
  const ctx = await requireContexto();
  if (!ctx.can("sanidad.crear")) return null;
  return (
    <Button href="/sanidad/registrar" icon={<IconPlus size={18} />}>
      Registrar aplicación
    </Button>
  );
}
