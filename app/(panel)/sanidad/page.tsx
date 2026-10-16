import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Button, Card, CardHeader, EmptyState, KpiCard, PageHeader, Table, Td, Th, Tr, TrustInline } from "@/components/ui";
import { IconAlert, IconArrowRight, IconCalendar, IconChevronRight, IconClock, IconList, IconFile, IconHeart, IconLock, IconPlus, IconRuler, IconShield, IconShieldCheck, IconSyringe } from "@/components/icons";
import { SanidadTabs } from "@/components/panel/sanidad/tabs";
import { requireContexto } from "@/lib/establecimiento";
import { listProductos, listReactores, listRetiros, listTareas, type Tarea } from "@/lib/data/sanidad";
import { getCatalogos } from "@/lib/data/catalogos";
import { listLotes } from "@/lib/data/potreros";
import { MESES_CORTOS, aQuienes, type Alcance } from "@/lib/plan-sanitario";
import { OmitirTarea, ReprogramarTarea } from "@/components/panel/sanidad/plan";
import { listEventos } from "@/lib/data/eventos";
import { fecha, hoyAR, nf } from "@/lib/format";
import { ROL_LABEL } from "@/lib/auth";

export const metadata: Metadata = { title: "Sanidad" };

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const REACTOR: Record<string, string> = {
  tuberculina_anocaudal: "Tuberculina positiva",
  tuberculina_cervical_simple: "Tuberculina positiva",
  tuberculina_cervical_comparada: "Tuberculina positiva",
  brucelosis_bpa: "Brucelosis positiva",
  brucelosis_fpa: "Brucelosis positiva",
};

const ATAJOS = [
  { tipo: "sanidad.vacunacion", titulo: "Vacunar", bajada: "Un lote, un potrero o animales sueltos", Icon: IconSyringe },
  { tipo: "sanidad.desparasitacion", titulo: "Desparasitar", bajada: "Con el producto y cómo se dosificó", Icon: IconShieldCheck },
  { tipo: "sanidad.tratamiento", titulo: "Tratar un animal", bajada: "Diagnóstico, producto y días", Icon: IconHeart },
  { tipo: "tuberculina", href: "/sanidad/tuberculina", titulo: "Leer tuberculina", bajada: "0 h y 72 h, resultado calculado", Icon: IconRuler },
  { tipo: "sanidad.analisis_laboratorio", titulo: "Análisis de laboratorio", bajada: "Con el informe adjunto", Icon: IconFile },
];

async function Contenido() {
  const ctx = await requireContexto();
  await connection();
  const est = ctx.activa.establecimiento_id;
  const hoy = hoyAR(new Date());
  const [eventos, retiros, reactores, productos, tareasRes, cat, lotes] = await Promise.all([
    listEventos(est, { modulo: "sanidad", desde: sumarDias(hoy, -90) }, undefined, 12),
    listRetiros(est).catch(() => ({ data: [], lotes: [] })),
    listReactores(est).catch(() => []),
    listProductos(est).catch(() => []),
    listTareas(est, { estado: "abiertas", hasta: sumarDias(hoy, 60), limit: 100 }).catch(() => ({ data: [] as Tarea[] })),
    getCatalogos(),
    listLotes(est).catch(() => []),
  ]);
  const catNombre = new Map(cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo]));
  const loteNombre = new Map(lotes.map((l) => [l.id ?? "", l.nombre ?? ""]));
  const tareas = tareasRes.data.sort((a, b) => Number(b.estado === "vencida") - Number(a.estado === "vencida") || (a.vence_en ?? "").localeCompare(b.vence_en ?? ""));
  const vencidas = tareas.filter((t) => t.estado === "vencida").length;
  const gestiona = ctx.can("tareas.gestionar");
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

      {(enRetiro > 0 || reactores.length > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className={enRetiro ? "border-warning-border" : undefined}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <IconClock size={18} className="text-warning" /> Con retiro vigente
                </span>
              }
              description="No faenar ni vender para faena hasta la fecha. TROPILLA lo avisa al vender u ofertar."
            />
            {enRetiro ? (
              <ul className="divide-y divide-border">
                {(retiros.lotes ?? []).map((l) => (
                  <li key={l.id}>
                    <Link href={`/hacienda/lotes/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{l.nombre}</span>
                        <span className="block text-[12.5px] text-muted">
                          Lote por cantidades · {nf.format(l.cabezas ?? 0)} cab.
                        </span>
                      </span>
                      <Badge tone="warning" icon={<IconClock size={14} />}>
                        Hasta {fecha(l.retiro_carne_hasta ?? l.retiro_leche_hasta)}
                      </Badge>
                    </Link>
                  </li>
                ))}
                {retiros.data.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link href={`/hacienda/${a.id}?tab=sanidad`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block font-semibold tabular-nums text-ink">{a.identificacion_principal ?? "Sin caravana"}</span>
                        <span className="block text-[12.5px] text-muted">
                          {a.categoria_nombre}
                          {a.lote?.nombre ? ` · ${a.lote.nombre}` : ""}
                        </span>
                      </span>
                      <Badge tone="warning" icon={<IconClock size={14} />}>
                        Retiro vigente
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[14px] text-muted">Nadie tiene retiro vigente hoy.</p>
            )}
            {retiros.data.length > 8 && (
              <Link href="/hacienda?sanidad=retiro" className="block border-t border-border px-5 py-3 text-[13px] font-medium text-campo hover:underline">
                Ver los {nf.format(retiros.data.length)} animales con retiro
              </Link>
            )}
          </Card>
          <Card className={reactores.length ? "border-danger-border" : undefined}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <IconLock size={18} className="text-danger" /> Reactores
                </span>
              }
              description="Dato privado: nunca se publica en el perfil ni en ofertas. Consultá con tu veterinario el destino."
            />
            {reactores.length ? (
              <ul className="divide-y divide-border">
                {reactores.map((a) => (
                  <li key={a.id}>
                    <Link href={`/hacienda/${a.id}?tab=sanidad`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block font-semibold tabular-nums text-ink">{a.identificacion_principal ?? "Sin caravana"}</span>
                        <span className="block text-[12.5px] text-muted">
                          {a.categoria_nombre}
                          {a.lote?.nombre ? ` · ${a.lote.nombre}` : ""}
                        </span>
                      </span>
                      <Badge tone="danger" icon={<IconAlert size={14} />}>
                        {REACTOR[a.reactor ?? ""] ?? "Reactor"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[14px] text-muted">No hay reactores registrados.</p>
            )}
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader
            title="Tareas del plan"
            description={tareas.length ? `${vencidas ? `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"} y las de los` : "Las de los"} próximos 60 días. Se cierran solas al registrar la aplicación.` : undefined}
            action={
              <Link href="/sanidad/plan" className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
                Plan sanitario <IconArrowRight size={14} />
              </Link>
            }
          />
          {tareas.length ? (
            <ul className="divide-y divide-border">
              {tareas.slice(0, 10).map((t) => {
                const vencida = t.estado === "vencida";
                const a = (t.alcance ?? {}) as Alcance;
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[10px] text-center leading-none ${vencida ? "bg-danger-bg text-danger" : "bg-campo-50 text-monte"}`}>
                      <span>
                        <span className="block text-[17px] font-bold tabular-nums">{(t.vence_en ?? "").slice(8, 10)}</span>
                        <span className="block text-[10.5px] font-semibold uppercase">{MESES_CORTOS[Number((t.vence_en ?? "").slice(5, 7)) - 1]}</span>
                      </span>
                    </span>
                    <span className="min-w-[200px] flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-semibold text-ink">{t.titulo}</span>
                        {vencida && (
                          <Badge tone="danger" icon={<IconAlert size={14} />}>
                            Vencida
                          </Badge>
                        )}
                      </span>
                      <span className="block text-[12.5px] text-muted">
                        {t.fecha_desde && t.fecha_desde !== t.vence_en ? `Del ${fecha(t.fecha_desde)} al ${fecha(t.vence_en)}` : `Hasta el ${fecha(t.vence_en)}`}
                        {" · "}
                        {aQuienes(a, (c) => catNombre.get(c) ?? c, (id) => loteNombre.get(id) ?? "un lote")}
                        {t.cabezas_estimadas ? ` · ~${nf.format(t.cabezas_estimadas)} cab.` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      {puedeRegistrar && (
                        <Button href={`/sanidad/registrar?tarea=${t.id}`} variant="outline" size="sm">
                          Registrar
                        </Button>
                      )}
                      {gestiona && <ReprogramarTarea id={t.id ?? ""} titulo={t.titulo ?? ""} desde={t.fecha_desde ?? null} vence={t.vence_en ?? ""} rowVersion={t.row_version ?? 1} />}
                      {gestiona && <OmitirTarea id={t.id ?? ""} titulo={t.titulo ?? ""} />}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<IconCalendar size={24} />}
              title="Sin tareas en los próximos 60 días"
              description="Las tareas salen del plan sanitario: aftosa, rabia, antiparasitarios de los bucerros. Si todavía no lo armaste, empezá por las plantillas."
              action={
                <Button href="/sanidad/plan" variant="outline">
                  Ver el plan sanitario
                </Button>
              }
            />
          )}
        </Card>
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
        </div>

        {puedeRegistrar && (
          <Card className="self-start">
            <CardHeader title="Registrar" description="A un animal, un lote o un potrero completo." />
            <ul className="divide-y divide-border">
              {ATAJOS.map((a) => (
                <li key={a.tipo}>
                  <Link href={"href" in a && a.href ? a.href : `/sanidad/registrar?tipo=${a.tipo}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
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
