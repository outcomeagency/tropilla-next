import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge, Card, EmptyState, FilterTabs, Notice, PageHeader, SpeciesChip, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert, IconClock, IconSyringe } from "@/components/icons";
import { SanidadTabs } from "@/components/panel/sanidad/tabs";
import { ArchivarProducto, EditarProducto, NuevoProducto } from "@/components/panel/sanidad/productos";
import { requireContexto } from "@/lib/establecimiento";
import { listProductos, listProductosSugeridos, type ProductoSanitario } from "@/lib/data/sanidad";
import { getCatalogos } from "@/lib/data/catalogos";
import { TIPOS_PRODUCTO, retiroTexto, tipoProductoNombre, viaNombre } from "@/lib/sanidad";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Productos sanitarios" };

type SP = { tipo?: string; archivados?: string };

function href(sp: SP, cambios: Partial<SP>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...cambios })) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/sanidad/productos?${s}` : "/sanidad/productos";
}

/** Retiro de carne/leche: el dato que evita vender un animal tratado. Sin cargar → aviso. */
function Retiro({ p }: { p: ProductoSanitario }) {
  const carne = retiroTexto(p.retiro_carne_dias);
  const leche = retiroTexto(p.retiro_leche_dias);
  if (!carne && !leche)
    return (
      <Badge tone="warning" icon={<IconAlert size={14} />}>
        Falta el retiro
      </Badge>
    );
  return (
    <span className="block whitespace-nowrap text-[13.5px] leading-snug">
      {carne && (
        <span className="flex items-center gap-1.5">
          <IconClock size={14} className={p.retiro_carne_dias ? "text-warning" : "text-subtle"} />
          <span className="text-muted">Carne</span> <span className="font-semibold tabular-nums text-ink">{carne}</span>
        </span>
      )}
      {leche && (
        <span className="flex items-center gap-1.5">
          <IconClock size={14} className={p.retiro_leche_dias ? "text-warning" : "text-subtle"} />
          <span className="text-muted">Leche</span> <span className="font-semibold tabular-nums text-ink">{leche}</span>
        </span>
      )}
    </span>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  const est = ctx.activa.establecimiento_id;
  const archivados = sp.archivados === "1";
  const puedeEditar = ctx.can("maestros.editar");
  const [todos, cat, sugeridos] = await Promise.all([
    listProductos(est, { archivados }),
    getCatalogos(),
    puedeEditar ? listProductosSugeridos().catch(() => []) : Promise.resolve([]),
  ]);
  const enfermedades = cat.items.enfermedades ?? [];
  const principios = cat.items.principios_activos ?? [];
  const enfNombre = new Map(enfermedades.map((e) => [e.codigo, e.nombre]));
  const productos = todos.filter((p) => (!sp.tipo || p.tipo === sp.tipo) && (archivados ? true : !p.archivado_en));
  const sinRetiro = todos.filter((p) => !p.archivado_en && p.tipo !== "vacuna" && p.retiro_carne_dias == null).length;
  const existentes = todos.flatMap((p) => [p.nombre_comercial?.toLowerCase() ?? "", p.principio_activo?.toLowerCase() ?? ""]).filter(Boolean);
  const tipos = TIPOS_PRODUCTO.filter(([t]) => todos.some((p) => p.tipo === t));

  return (
    <>
      <SanidadTabs activo="productos">
        {puedeEditar && <NuevoProducto sugeridos={sugeridos} enfermedades={enfermedades} principios={principios} existentes={existentes} />}
      </SanidadTabs>

      {sinRetiro > 0 && (
        <div className="mb-4">
          <Notice tone="warning" title={`${sinRetiro} ${sinRetiro === 1 ? "producto no tiene" : "productos no tienen"} cargado el retiro de carne`}>
            Sin ese dato TROPILLA no puede avisarte antes de vender u ofertar un animal tratado. Copialo del marbete con «Editar».
          </Notice>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <FilterTabs
            label="Tipo de producto"
            items={[{ href: href(sp, { tipo: undefined }), label: "Todos", active: !sp.tipo, count: todos.filter((p) => !p.archivado_en).length }, ...tipos.map(([t, n]) => ({ href: href(sp, { tipo: t }), label: n, active: sp.tipo === t }))]}
          />
          <Link href={href(sp, { archivados: archivados ? undefined : "1" })} className="ml-auto text-[13px] font-medium text-campo hover:underline">
            {archivados ? "Ocultar archivados" : "Ver archivados"}
          </Link>
        </div>

        {productos.length === 0 ? (
          <EmptyState
            icon={<IconSyringe size={24} />}
            title={sp.tipo ? "No hay productos de este tipo" : "Cargá los productos que usás"}
            description={
              sp.tipo
                ? "Probá con otro tipo o mirá todo el catálogo."
                : "Vacunas, antiparasitarios y antibióticos con su vía, la dosis que indicó tu veterinario y el retiro del marbete. Después, al registrar una aplicación, se eligen de la lista y el retiro se calcula solo."
            }
          >
            {!puedeEditar && <p className="text-[13px] text-muted">Los carga el dueño, un administrador o el veterinario.</p>}
          </EmptyState>
        ) : (
          <Table minWidth={1040}>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th>Tipo y vía</Th>
                <Th>Para qué</Th>
                <Th>Especies</Th>
                <Th>Dosis declarada</Th>
                <Th>Retiro</Th>
                {puedeEditar && (
                  <Th>
                    <span className="sr-only">Acciones</span>
                  </Th>
                )}
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <Tr key={p.id}>
                  <Td className="min-w-[190px]">
                    <span className="block font-semibold text-ink">{p.nombre_comercial}</span>
                    {p.principio_activo && <span className="block text-[12.5px] capitalize text-muted">{p.principio_activo}</span>}
                    {p.archivado_en && (
                      <span className="mt-1 inline-block">
                        <Badge tone="neutral">Archivado</Badge>
                      </span>
                    )}
                  </Td>
                  <Td className="text-[13.5px]">
                    {tipoProductoNombre(p.tipo)}
                    {p.via && <span className="block text-[12.5px] text-muted">{viaNombre(p.via)}</span>}
                  </Td>
                  <Td className="max-w-[240px] text-[13px] text-muted">{(p.enfermedades ?? []).map((e) => enfNombre.get(e) ?? e).join(", ") || "—"}</Td>
                  <Td>
                    <span className="flex gap-1">
                      {(p.especies ?? []).map((e) => (
                        <SpeciesChip key={e} especie={especieDe(e)} />
                      ))}
                    </span>
                  </Td>
                  <Td className="max-w-[200px] text-[13px]">{p.dosis_declarada ?? <span className="text-subtle">Sin cargar</span>}</Td>
                  <Td>
                    <Retiro p={p} />
                  </Td>
                  {puedeEditar && (
                    <Td className="whitespace-nowrap text-right">
                      {!p.archivado_en && (
                        <>
                          <EditarProducto
                            producto={{ ...p, especies: p.especies ?? [], enfermedades: p.enfermedades ?? [] }}
                            enfermedades={enfermedades}
                            principios={principios}
                          />
                          <ArchivarProducto id={p.id ?? ""} nombre={p.nombre_comercial ?? ""} />
                        </>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="border-t border-border px-5 py-3 text-[12.5px] text-muted">TROPILLA no prescribe productos ni dosis: lo que ves es lo que cargó el establecimiento. Validalo con tu veterinario.</p>
      </Card>
    </>
  );
}

/** Catálogo de productos sanitarios del establecimiento (TPA-31). */
export default function ProductosPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Sanidad" subtitle="Productos que usa el establecimiento, con la dosis declarada y el período de retiro." />
      <Suspense fallback={<div className="h-[520px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
