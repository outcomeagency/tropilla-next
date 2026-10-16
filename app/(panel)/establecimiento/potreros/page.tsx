import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Button, Card, CardHeader, EmptyState, KpiCard, Notice, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconChart, IconChevronRight, IconCow, IconMap, IconPlus, IconRuler } from "@/components/icons";
import { EstablecimientoTabs } from "@/components/panel/establecimiento/tabs";
import { PotrerosMapa } from "@/components/panel/potreros/mapa";
import { requireContexto } from "@/lib/establecimiento";
import { getEstablecimiento } from "@/lib/data/establecimientos";
import { listPotrerosConArchivados, ringDe } from "@/lib/data/potreros";
import { getCatalogos, nombreItem } from "@/lib/data/catalogos";
import { nf } from "@/lib/format";

export const metadata: Metadata = { title: "Potreros" };

const OK: Record<string, string> = {
  creado: "Potrero creado. Ya podés moverle lotes y hacienda.",
  editado: "Cambios guardados.",
  archivado: "Potrero archivado. Su historia sigue disponible.",
};

const dec1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

async function Contenido({ searchParams }: { searchParams: Promise<{ ok?: string; archivados?: string }> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  const est = ctx.activa.establecimiento_id;
  const verArchivados = sp.archivados === "1";
  const [potreros, cat, e] = await Promise.all([listPotrerosConArchivados(est, verArchivados), getCatalogos(), getEstablecimiento(est).catch(() => null)]);
  const editar = ctx.can("maestros.editar");

  const activos = potreros.filter((p) => !p.archivado_en);
  const ha = activos.reduce((s, p) => s + Number(p.superficie_ha ?? 0), 0);
  const cabezas = activos.reduce((s, p) => s + (p.ocupacion?.cabezas ?? 0), 0);
  const sinDibujo = activos.filter((p) => ringDe(p).length < 3).length;
  const polygons = potreros
    .map((p) => ({ id: p.id ?? "", nombre: p.nombre ?? "", ring: ringDe(p), label: p.ocupacion?.cabezas ? `${p.nombre} · ${nf.format(p.ocupacion.cabezas)}` : p.nombre, muted: !!p.archivado_en }))
    .filter((p) => p.ring.length >= 3);
  const centro = e?.ubicacion ? { lat: Number(e.ubicacion.lat), lon: Number(e.ubicacion.lon) } : null;

  return (
    <>
      {sp.ok && OK[sp.ok] && (
        <div className="mb-4">
          <Notice tone="success" title={OK[sp.ok]} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="potreros activos" value={nf.format(activos.length)} icon={<IconMap size={22} />} />
        <KpiCard label="hectáreas en potreros" value={nf.format(Math.round(ha))} icon={<IconRuler size={22} />} />
        <KpiCard label="cabezas ubicadas" value={nf.format(cabezas)} icon={<IconCow size={22} />} href="/hacienda" />
        <KpiCard label="carga promedio (cab/ha)" value={ha ? dec1.format(cabezas / ha) : "—"} icon={<IconChart size={22} />} />
      </div>

      {potreros.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconMap size={24} />}
            title={`Cargá los potreros de ${ctx.activa.establecimiento_nombre}`}
            description="Definí cada potrero con su ambiente (bañado, loma, malezal), el recurso forrajero y si tiene agua o revolcadero. Podés dibujar el contorno sobre la imagen satelital: las hectáreas se calculan solas."
            action={editar ? <Button href="/establecimiento/potreros/nuevo" icon={<IconPlus size={18} />}>Agregar potrero</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.1fr_1fr]">
          <Card className="overflow-hidden">
            <CardHeader
              title="Mapa del campo"
              description={sinDibujo ? `${sinDibujo} ${sinDibujo === 1 ? "potrero no tiene" : "potreros no tienen"} contorno dibujado: abrilo y dibujalo sobre el satélite.` : "Tocá un potrero para ver quién está y editarlo."}
            />
            <div className="p-3">
              <PotrerosMapa polygons={polygons} center={centro} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Potreros"
              description="Ocupación actual según lotes y animales identificados."
              action={
                <Link href={verArchivados ? "/establecimiento/potreros" : "/establecimiento/potreros?archivados=1"} className="text-[13px] font-medium text-campo hover:underline">
                  {verArchivados ? "Ocultar archivados" : "Ver archivados"}
                </Link>
              }
            />
            <Table minWidth={620}>
              <thead>
                <tr>
                  <Th>Potrero</Th>
                  <Th>Ambiente</Th>
                  <Th numeric>Ha</Th>
                  <Th>Ocupación</Th>
                  <Th>
                    <span className="sr-only">Abrir</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {potreros.map((p) => {
                  const cab = p.ocupacion?.cabezas ?? 0;
                  const lotes = p.ocupacion?.lotes ?? [];
                  return (
                    <Tr key={p.id}>
                      <Td>
                        <Link href={`/establecimiento/potreros/${p.id}`} className="font-semibold text-ink hover:text-campo hover:underline">
                          {p.nombre}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap gap-x-2 text-[12.5px] text-muted">
                          {nombreItem(cat, "recursos_forrajeros", p.recurso_forrajero) || "Forraje sin cargar"}
                          {p.agua && <span>· Agua</span>}
                          {p.revolcadero && <span>· Revolcadero</span>}
                        </span>
                        {p.archivado_en && (
                          <span className="mt-1 inline-block">
                            <Badge tone="neutral">Archivado</Badge>
                          </span>
                        )}
                      </Td>
                      <Td className="text-[13.5px]">{nombreItem(cat, "ambientes", p.ambiente) || "—"}</Td>
                      <Td numeric>{p.superficie_ha ? nf.format(Number(p.superficie_ha)) : "—"}</Td>
                      <Td>
                        {cab ? (
                          <>
                            <span className="font-semibold tabular-nums">{nf.format(cab)} cab.</span>
                            {p.superficie_ha && Number(p.superficie_ha) > 0 && <span className="text-[12.5px] text-muted"> · {dec1.format(cab / Number(p.superficie_ha))} cab/ha</span>}
                            <span className="mt-0.5 block text-[12.5px] text-muted">{lotes.map((l) => l.nombre).join(", ")}</span>
                          </>
                        ) : (
                          <span className="text-[13.5px] text-muted">Vacío</span>
                        )}
                      </Td>
                      <Td className="w-10">
                        <Link href={`/establecimiento/potreros/${p.id}`} aria-label={`Abrir ${p.nombre}`} className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-surface-2">
                          <IconChevronRight size={18} />
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}

/** Potreros con ambiente, forraje, contorno y ocupación (TPA-14). */
export default function PotrerosPage(props: { searchParams: Promise<{ ok?: string; archivados?: string }> }) {
  return (
    <>
      <PageHeader
        title="Mi establecimiento"
        subtitle="Potreros con su ambiente y quién está en cada uno."
        actions={
          <Suspense fallback={null}>
            <AccionNuevo />
          </Suspense>
        }
      />
      <EstablecimientoTabs activo="potreros" />
      <Suspense fallback={<div className="h-[560px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function AccionNuevo() {
  const ctx = await requireContexto();
  if (!ctx.can("maestros.editar")) return null;
  return (
    <Button href="/establecimiento/potreros/nuevo" icon={<IconPlus size={18} />}>
      Agregar potrero
    </Button>
  );
}
