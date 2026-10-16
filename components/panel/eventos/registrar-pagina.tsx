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

export type SP = { tipo?: string; animales?: string; lote?: string };

export async function RegistrarPagina({ searchParams, modulo = "hacienda" }: { searchParams: Promise<SP>; modulo?: "hacienda" | "reproduccion" }) {
  const ctx = await requireContexto();
  const sp = await searchParams;
  if (!ctx.can(modulo === "reproduccion" ? "reproduccion.crear" : "hacienda.crear")) {
    return (
      <Card>
        <EmptyState icon={<IconLock size={24} />} title="Tu rol no permite cargar eventos" description="Podés ver el registro de eventos. Para cargar, pedile al dueño un rol de encargado o administración." />
      </Card>
    );
  }
  const est = ctx.activa.establecimiento_id;
  const ids = (sp.animales ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 100);
  const [cat, lotes, potreros, elegidos] = await Promise.all([
    getCatalogos(),
    listLotes(est).catch(() => []),
    listPotreros(est).catch(() => []),
    Promise.all(ids.map((id) => getAnimal(est, id).catch(() => null))),
  ]);
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
    }));

  return (
    <RegistrarEvento
      modulo={modulo}
      tipoInicial={sp.tipo}
      animalesIniciales={animales}
      loteInicial={sp.lote}
      lotes={lotes.map((l) => ({ id: l.id ?? "", nombre: l.nombre ?? "", especie: l.especie ?? "", anonimo: !!l.anonimo, conteo: l.conteo ?? {} }))}
      potreros={potreros.map((x) => ({ id: x.id ?? "", nombre: x.nombre ?? "" }))}
      categorias={cat.categorias.map((c) => ({ codigo: c.codigo, nombre: c.nombre ?? c.codigo, especie: String(c.especie ?? ""), sexo: (c.sexo as string | null) ?? null }))}
      razas={cat.razas.map((r) => ({ codigo: r.codigo, nombre: r.nombre ?? r.codigo, especie: String(r.especie ?? "") }))}
      causasMuerte={cat.items.causas_muerte ?? []}
      destinos={cat.items.destinos ?? []}
      categoriasFaena={cat.categoriasFaena.map((c) => ({ codigo: c.codigo, nombre: c.nombre ?? c.codigo }))}
      gestaciones={gestacionesDe(cat.parametros)}
      hoy={hoyAR(new Date())}
    />
  );
}

