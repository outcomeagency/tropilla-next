import { connection } from "next/server";
import { Card, EmptyState } from "@/components/ui";
import { IconLock } from "@/components/icons";
import { RegistrarEvento } from "@/components/panel/eventos/registrar";
import { requireContexto } from "@/lib/establecimiento";
import { getAnimal, listPotreros } from "@/lib/data/hacienda";
import { listLotes } from "@/lib/data/potreros";
import { getCatalogos } from "@/lib/data/catalogos";
import { hoyAR } from "@/lib/format";
import { gestacionesDe } from "@/lib/gestacion";
import type { AnimalElegido } from "@/lib/evento-actions";
import type { ModuloRegistrar } from "@/lib/eventos-hacienda";
import { listProductos, listRetiros, listTareas } from "@/lib/data/sanidad";
import { tiposPrueba } from "@/lib/data/pruebas";
import type { TareaOpt } from "@/components/panel/eventos/registrar";

export type SP = { tipo?: string; animales?: string; lote?: string; potrero?: string; tarea?: string };

export async function RegistrarPagina({ searchParams, modulo = "hacienda" }: { searchParams: Promise<SP>; modulo?: ModuloRegistrar }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  if (!ctx.can(modulo === "reproduccion" ? "reproduccion.crear" : modulo === "sanidad" ? "sanidad.crear" : "hacienda.crear")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite cargar eventos" description="Podés ver el registro de eventos. Para cargar, pedile al dueño un rol de encargado o administración." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const ids = (sp.animales ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 100);
  const sanidad = modulo === "sanidad";
  const [cat, lotes, potreros, elegidos, productos, tareas, retiros] = await Promise.all([
    getCatalogos(),
    listLotes(est).catch(() => []),
    listPotreros(est).catch(() => []),
    Promise.all(ids.map((id) => getAnimal(est, id).catch(() => null))),
    sanidad ? listProductos(est).catch(() => []) : Promise.resolve([]),
    sanidad && sp.tarea ? listTareas(est, { estado: "abiertas", limit: 100 }).then((r) => r.data).catch(() => []) : Promise.resolve([]),
    modulo === "hacienda" ? listRetiros(est).catch(() => ({ data: [], lotes: [] })) : Promise.resolve({ data: [], lotes: [] }),
  ]);
  const retiroLote = new Map((retiros.lotes ?? []).map((l) => [l.id ?? "", l.retiro_carne_hasta ?? null]));
  const t = tareas.find((x) => x.id === sp.tarea);
  const alcance = (t?.alcance ?? {}) as { lote_ids?: string[]; potrero_ids?: string[]; potrero_id?: string; lote_id?: string };
  const tarea: TareaOpt | null = t
    ? {
        id: t.id ?? "",
        titulo: t.titulo ?? "",
        tipo: t.tipo_evento ?? "",
        enfermedad: t.enfermedad ?? null,
        productoId: t.producto_id ?? null,
        loteId: alcance.lote_id ?? (alcance.lote_ids?.length === 1 ? alcance.lote_ids[0] : null),
        potreroId: alcance.potrero_id ?? (alcance.potrero_ids?.length === 1 ? alcance.potrero_ids[0] : null),
        vence: t.vence_en ?? "",
      }
    : null;
  await connection();

  const animales: AnimalElegido[] = elegidos
    .filter((a) => a?.id && (a.estado ?? "activo") === "activo")
    .map((a) => ({
      id: a!.id ?? "",
      ident: a!.identificacion_principal ?? "Sin caravana",
      especie: a!.especie ?? "",
      sexo: a!.sexo ?? "",
      categoria: a!.categoria_nombre ?? a!.categoria ?? "",
      lote: a!.lote?.nombre ?? null,
      estado: a!.estado ?? null,
      raza: a!.raza ?? null,
      retiro: !!a!.retiro_vigente,
      reactor: !!a!.reactor,
    }));

  return (
    <RegistrarEvento
      modulo={modulo}
      tipoInicial={sp.tipo}
      animalesIniciales={animales}
      loteInicial={sp.lote}
      lotes={lotes.map((l) => ({ id: l.id ?? "", nombre: l.nombre ?? "", especie: l.especie ?? "", anonimo: !!l.anonimo, conteo: l.conteo ?? {}, retiroHasta: retiroLote.get(l.id ?? "") ?? null }))}
      potreros={potreros.map((x) => ({ id: x.id ?? "", nombre: x.nombre ?? "" }))}
      categorias={cat.categorias.map((c) => ({ codigo: c.codigo, nombre: c.nombre ?? c.codigo, especie: String(c.especie ?? ""), sexo: (c.sexo as string | null) ?? null }))}
      razas={cat.razas.map((r) => ({ codigo: r.codigo, nombre: r.nombre ?? r.codigo, especie: String(r.especie ?? "") }))}
      causasMuerte={cat.items.causas_muerte ?? []}
      destinos={cat.items.destinos ?? []}
      categoriasFaena={cat.categoriasFaena.map((c) => ({ codigo: c.codigo, nombre: c.nombre ?? c.codigo }))}
      gestaciones={gestacionesDe(cat.parametros)}
      hoy={hoyAR(new Date())}
      potreroInicial={sp.potrero}
      pruebas={sanidad ? tiposPrueba(cat) : undefined}
      tarea={tarea}
      enfermedades={cat.items.enfermedades ?? []}
      productos={productos
        .filter((x) => !x.archivado_en && x.id)
        .map((x) => ({
          id: x.id ?? "",
          nombre: x.nombre_comercial ?? "",
          tipo: x.tipo ?? "",
          via: x.via ?? null,
          dosis: x.dosis_declarada ?? null,
          principio: x.principio_activo ?? null,
          carne: x.retiro_carne_dias ?? null,
          leche: x.retiro_leche_dias ?? null,
          enfermedades: x.enfermedades ?? [],
          especies: x.especies ?? [],
        }))}
    />
  );
}

