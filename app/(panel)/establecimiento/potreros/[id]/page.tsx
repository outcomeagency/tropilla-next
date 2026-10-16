import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Card, CardHeader, EmptyState, PageHeader, SpeciesChip, buttonClass } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconCow } from "@/components/icons";
import { PotreroEditor } from "@/components/panel/potreros/editor";
import { ArchivarPotrero } from "@/components/panel/potreros/archivar";
import { CampoMap } from "@/components/map/campo-map";
import { requireContexto } from "@/lib/establecimiento";
import { getEstablecimiento } from "@/lib/data/establecimientos";
import { getPotrero, listLotes, listPotrerosConArchivados, ringDe } from "@/lib/data/potreros";
import { getCatalogos, nombreItem } from "@/lib/data/catalogos";
import { ApiError } from "@/lib/api";
import { fecha, nf } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Potrero" };

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContexto();
  const { id } = await params;
  const est = ctx.activa.establecimiento_id;
  let p;
  try {
    p = await getPotrero(est, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  const [cat, todos, lotes, e] = await Promise.all([getCatalogos(), listPotrerosConArchivados(est), listLotes(est).catch(() => []), getEstablecimiento(est).catch(() => null)]);
  const editar = ctx.can("maestros.editar") && !p.archivado_en;
  const ring = ringDe(p);
  const lotesAca = lotes.filter((l) => l.potrero?.id === id);
  const cab = p.ocupacion?.cabezas ?? 0;
  const catNombre = new Map(cat.categorias.map((c) => [c.codigo, c.nombre ?? c.codigo]));
  const sueltos = cab - lotesAca.reduce((s, l) => s + (l.cabezas_individuales ?? 0) + (l.cabezas_anonimas ?? 0), 0);

  return (
    <>
      <PageHeader
        title={p.nombre ?? "Potrero"}
        subtitle={[nombreItem(cat, "ambientes", p.ambiente), nombreItem(cat, "recursos_forrajeros", p.recurso_forrajero), p.superficie_ha ? `${nf.format(Number(p.superficie_ha))} ha` : null].filter(Boolean).join(" · ")}
        actions={
          <>
            {p.archivado_en && <Badge tone="neutral">Archivado el {fecha(p.archivado_en)}</Badge>}
            {editar && <ArchivarPotrero id={id} nombre={p.nombre ?? ""} cabezas={cab} />}
          </>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <CardHeader
          title="Quién está ahora"
          description={cab ? `${nf.format(cab)} cabezas${p.superficie_ha && Number(p.superficie_ha) > 0 ? ` · ${(cab / Number(p.superficie_ha)).toLocaleString("es-AR", { maximumFractionDigits: 1 })} cab/ha` : ""}` : "Sin hacienda en este potrero."}
          action={
            cab ? (
              <Link href={`/hacienda?potrero_id=${id}`} className={buttonClass("ghost", "sm")}>
                Ver animales identificados <IconArrowRight size={16} />
              </Link>
            ) : undefined
          }
        />
        {lotesAca.length ? (
          <ul className="-mb-px -mr-px grid sm:grid-cols-2 xl:grid-cols-3">
            {lotesAca.map((l) => {
              const total = (l.cabezas_individuales ?? 0) + (l.cabezas_anonimas ?? 0);
              return (
                <li key={l.id} className="border-b border-r border-border px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/hacienda?lote_id=${l.id}`} className="font-semibold text-ink hover:text-campo hover:underline">
                      {l.nombre}
                    </Link>
                    <SpeciesChip especie={especieDe(l.especie)} />
                  </div>
                  <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">
                    {nf.format(total)} <span className="text-[13px] font-medium text-muted">cab.</span>
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {Object.entries(l.conteo ?? {})
                      .map(([c, n]) => `${catNombre.get(c) ?? c} ${nf.format(n)}`)
                      .join(" · ") || (l.anonimo ? "Lote por cantidades" : "Animales identificados")}
                  </p>
                </li>
              );
            })}
            {sueltos > 0 && (
              <li className="border-b border-r border-border px-5 py-4">
                <p className="font-semibold text-ink">Fuera de lote</p>
                <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">
                  {nf.format(sueltos)} <span className="text-[13px] font-medium text-muted">cab.</span>
                </p>
                <p className="text-[12.5px] text-muted">Animales identificados ubicados acá sin lote.</p>
              </li>
            )}
          </ul>
        ) : (
          <EmptyState icon={<IconCow size={24} />} title="Potrero vacío" description="Cuando traslades un lote o animales a este potrero, vas a ver acá la composición por categoría." />
        )}
      </Card>

      {editar ? (
        <PotreroEditor
          p={{
            id,
            nombre: p.nombre ?? "",
            superficie_ha: (p.superficie_ha ?? "").replace(".", ","),
            ambiente: p.ambiente ?? "",
            recurso_forrajero: p.recurso_forrajero ?? "",
            agua: !!p.agua,
            revolcadero: !!p.revolcadero,
            notas: p.notas ?? "",
            ring,
            row_version: String(p.row_version ?? ""),
          }}
          otros={todos.filter((o) => o.id !== id).map((o) => ({ id: o.id ?? "", nombre: o.nombre ?? "", ring: ringDe(o) })).filter((o) => o.ring.length >= 3)}
          centro={e?.ubicacion ? { lat: Number(e.ubicacion.lat), lon: Number(e.ubicacion.lon) } : null}
          ambientes={cat.items.ambientes ?? []}
          forrajes={cat.items.recursos_forrajeros ?? []}
        />
      ) : (
        ring.length >= 3 && (
          <Card className="overflow-hidden">
            <CardHeader title="Contorno" />
            <div className="p-3">
              <CampoMap polygons={[{ id, nombre: p.nombre ?? "", ring, selected: true }]} height={420} ariaLabel={`Contorno de ${p.nombre}`} />
            </div>
          </Card>
        )
      )}
    </>
  );
}

/** Ficha y edición de un potrero (TPA-14). */
export default function PotreroPage(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/establecimiento/potreros" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Potreros
      </Link>
      <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido params={props.params} />
      </Suspense>
    </>
  );
}
