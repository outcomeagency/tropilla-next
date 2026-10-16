import "server-only";
import { api, ApiError } from "@/lib/api";
import { listAnimales, listPotreros } from "@/lib/data/hacienda";
import type { Many, One, S } from "@/lib/schemas";

export interface Pendiente {
  id: string;
  icon: "syringe" | "calendar" | "file" | "message" | "list";
  titulo: string;
  detalle?: string;
  bajada: string;
  estado: "urgente" | "pendiente" | "informativo" | "por_revisar" | "sugerencia";
  href: string;
}

export interface InicioData {
  /** `api`: GET …/inicio · `compuesto`: armado con endpoints reales mientras /inicio no exista. */
  source: "api" | "compuesto";
  cabezasPotreros: number | null;
  identificados: number;
  porEspecie: { BOV: number; BUB: number };
  prenadas: number;
  partos30: number;
  existencias: Record<"bovino" | "bubalino", Array<{ categoria: string; cabezas: number }>>;
  pendientes: Pendiente[];
  actividad: S<"EventoResumen">[];
}

const DIA = 86_400_000;

/**
 * Inicio (TPA-52). Usa GET …/inicio si existe; si no, lo compone con datos
 * reales: animales identificados, ocupación de potreros y eventos recientes.
 * No inventa nada: lo que no se puede calcular no se muestra.
 */
export async function getInicio(est: string, hoy: string): Promise<InicioData> {
  const [inicio, actividad, potreros] = await Promise.all([
    api<One<S<"Inicio">>>(`/establecimientos/${est}/inicio`).catch((e) => {
      if (e instanceof ApiError && e.routeMissing) return null;
      throw e;
    }),
    api<Many<S<"EventoResumen">>>(`/establecimientos/${est}/eventos?limit=8`).then((r) => r.data),
    listPotreros(est).catch(() => []),
  ]);
  const cabezasPotreros = potreros.length ? potreros.reduce((s, p) => s + (p.ocupacion?.cabezas ?? 0), 0) : null;

  // Animales identificados (todas las páginas, con tope razonable para el inicio).
  const animales: S<"AnimalResumen">[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const r = await listAnimales(est, {}, cursor, 100);
    animales.push(...r.data);
    cursor = r.meta?.next_cursor ?? undefined;
    if (!cursor) break;
  }

  const porCat = (esp: "BOV" | "BUB") => {
    const m = new Map<string, number>();
    for (const a of animales.filter((x) => x.especie === esp)) m.set(a.categoria_nombre ?? a.categoria ?? "", (m.get(a.categoria_nombre ?? a.categoria ?? "") ?? 0) + 1);
    return [...m.entries()].map(([categoria, cabezas]) => ({ categoria, cabezas })).sort((a, b) => b.cabezas - a.cabezas);
  };

  let existencias = { bovino: porCat("BOV"), bubalino: porCat("BUB") };
  if (inicio?.data.existencias?.length) {
    const ex = inicio.data.existencias;
    const of = (e: "BOV" | "BUB") => ex.filter((x) => x.especie === e).map((x) => ({ categoria: x.categoria_nombre ?? x.categoria ?? "", cabezas: x.cabezas ?? 0 }));
    existencias = { bovino: of("BOV"), bubalino: of("BUB") };
  }

  const hoyMs = new Date(`${hoy}T12:00:00Z`).getTime();
  const prenadas = animales.filter((a) => a.estado_reproductivo === "prenada");
  const proximos = prenadas.filter((a) => a.fecha_probable_parto && new Date(`${a.fecha_probable_parto}T12:00:00Z`).getTime() - hoyMs <= 30 * DIA && new Date(`${a.fecha_probable_parto}T12:00:00Z`).getTime() >= hoyMs - 15 * DIA);
  const vencidos = prenadas.filter((a) => a.fecha_probable_parto && hoyMs - new Date(`${a.fecha_probable_parto}T12:00:00Z`).getTime() > 15 * DIA);
  const semana = proximos.filter((a) => new Date(`${a.fecha_probable_parto}T12:00:00Z`).getTime() - hoyMs <= 7 * DIA);
  const recat = animales.filter((a) => a.categoria_sugerida && a.categoria_sugerida !== a.categoria);
  const retiro = animales.filter((a) => a.retiro_vigente);

  const pendientes: Pendiente[] = [];
  if (vencidos.length)
    pendientes.push({ id: "vencidos", icon: "calendar", titulo: `${vencidos.length} ${vencidos.length === 1 ? "parto vencido" : "partos vencidos"}`, bajada: "Pasaron más de 15 días de la fecha probable", estado: "urgente", href: "/hacienda?estado_reproductivo=prenada&orden=reciente" });
  if (proximos.length)
    pendientes.push({
      id: "partos",
      icon: "calendar",
      titulo: semana.length ? `${semana.length} ${semana.length === 1 ? "parto probable" : "partos probables"} esta semana` : `${proximos.length} partos probables en 30 días`,
      detalle: semana.length && proximos.length > semana.length ? `${proximos.length} en 30 días` : undefined,
      bajada: "Según servicio y tacto",
      estado: "informativo",
      href: "/hacienda?estado_reproductivo=prenada",
    });
  if (retiro.length)
    pendientes.push({ id: "retiro", icon: "syringe", titulo: `${retiro.length} ${retiro.length === 1 ? "animal" : "animales"} con retiro vigente`, bajada: "No faenar ni vender para faena todavía", estado: "pendiente", href: "/hacienda?sanidad=retiro" });
  if (recat.length)
    pendientes.push({ id: "recat", icon: "list", titulo: `${recat.length} ${recat.length === 1 ? "animal" : "animales"} con recategorización sugerida`, bajada: "Según peso, edad y eventos", estado: "sugerencia", href: "/hacienda/recategorizacion" });
  for (const it of inicio?.data.pendientes?.items ?? []) {
    pendientes.push({ id: `${it.tipo}-${it.entidad_id}`, icon: "file", titulo: it.titulo ?? "", bajada: it.fecha ?? "", estado: "pendiente", href: it.ruta ?? "/inicio" });
  }

  return {
    source: inicio ? "api" : "compuesto",
    cabezasPotreros,
    identificados: animales.length,
    porEspecie: { BOV: animales.filter((a) => a.especie === "BOV").length, BUB: animales.filter((a) => a.especie === "BUB").length },
    prenadas: prenadas.length,
    partos30: proximos.length,
    existencias,
    pendientes,
    actividad: inicio?.data.actividad?.length ? inicio.data.actividad : actividad,
  };
}
