import Link from "next/link";
import { Suspense, type ComponentType } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Avatar, Button, Card, CardHeader, EmptyState, KpiCard, PageHeader, StatusBadge, Table, Td, Th, Tr, TrustBadge, inputClass } from "@/components/ui";
import {
  IconArrowRight,
  IconBuffalo,
  IconCalendar,
  IconChart,
  IconCheckCircle,
  IconChevronRight,
  IconCow,
  IconFile,
  IconHeart,
  IconList,
  IconMessage,
  IconPlus,
  IconSearch,
  IconSyringe,
  type IconProps,
} from "@/components/icons";
import { StockByCategory } from "@/components/panel/stock-by-category";
import { requireContexto } from "@/lib/establecimiento";
import { ROL_LABEL } from "@/lib/auth";
import { getInicio, type Pendiente } from "@/lib/data/inicio";
import { fecha, hoyAR, nf } from "@/lib/format";

export const metadata: Metadata = { title: "Inicio" };

const PENDIENTE_ICON: Record<Pendiente["icon"], ComponentType<IconProps>> = {
  syringe: IconSyringe,
  calendar: IconCalendar,
  file: IconFile,
  message: IconMessage,
  list: IconList,
};

function Encabezado({ subtitle }: { subtitle: string }) {
  return (
    <PageHeader
      title="Inicio"
      subtitle={subtitle}
      actions={
        <>
          <form action="/hacienda" role="search" className="relative w-full sm:w-[300px]">
            <label htmlFor="buscar-animal" className="sr-only">
              Buscar animal por caravana, tatuaje o RFID
            </label>
            <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input id="buscar-animal" name="q" type="search" placeholder="Caravana, tatuaje o RFID" className={`${inputClass} pl-10 text-[14px]`} />
          </form>
          <Button href="/hacienda" icon={<IconPlus size={18} />}>
            Cargar evento
          </Button>
        </>
      }
    />
  );
}

async function Tablero() {
  const ctx = await requireContexto();
  await connection();
  const now = new Date();
  const hoy = hoyAR(now);
  const d = await getInicio(ctx.activa.establecimiento_id, hoy);
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(now);
  const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(now);
  const inicialEspecie = d.porEspecie.BUB >= d.porEspecie.BOV ? "bubalino" : "bovino";

  return (
    <>
      <Encabezado subtitle={`${dia.charAt(0).toUpperCase()}${dia.slice(1)} · Datos al ${hora} · ${ctx.activa.establecimiento_nombre}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="cabezas en potreros" value={d.cabezasPotreros != null ? nf.format(d.cabezasPotreros) : "—"} icon={<IconChart size={24} />} href="/establecimiento" />
        <KpiCard label="Bovinos identificados" value={nf.format(d.porEspecie.BOV)} icon={<IconCow size={24} />} href="/hacienda?especie=BOV" />
        <KpiCard label="Bubalinos identificados" value={nf.format(d.porEspecie.BUB)} icon={<IconBuffalo size={24} />} href="/hacienda?especie=BUB" />
        <KpiCard label={`preñadas · ${d.partos30} ${d.partos30 === 1 ? "parto" : "partos"} en 30 días`} value={nf.format(d.prenadas)} icon={<IconHeart size={24} />} href="/reproduccion" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader
            title="Existencias por categoría"
            description={d.source === "api" ? undefined : "Animales identificados individualmente. Los lotes por cantidades se suman cuando la API publique existencias."}
          />
          <StockByCategory data={d.existencias} initial={inicialEspecie} emptyText="No hay animales identificados de esta especie." />
        </Card>

        <Card>
          <CardHeader
            title="Pendientes"
            action={
              <Link href="/hacienda" className="text-[13px] font-medium text-campo hover:underline">
                Ver hacienda
              </Link>
            }
          />
          {d.pendientes.length ? (
            <ul>
              {d.pendientes.map((p) => {
                const Icon = PENDIENTE_ICON[p.icon];
                return (
                  <li key={p.id} className="border-b border-border last:border-b-0">
                    <Link href={p.href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2">
                      <Icon size={22} className="shrink-0 text-monte" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-ink">
                          <span className="font-semibold">{p.titulo}</span>
                          {p.detalle && <span className="text-muted"> · {p.detalle}</span>}
                        </span>
                        <span className="block text-[12.5px] text-muted">{p.bajada}</span>
                        <span className="mt-1.5 block sm:hidden">
                          <StatusBadge estado={p.estado} />
                        </span>
                      </span>
                      <span className="hidden sm:block">
                        <StatusBadge estado={p.estado} />
                      </span>
                      <IconChevronRight size={18} className="shrink-0 text-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<IconCheckCircle size={24} />} title="Nada pendiente por ahora" description="No hay partos próximos, retiros vigentes ni recategorizaciones sugeridas. Cuando aparezca algo, lo vas a ver acá." />
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Actividad reciente"
          action={
            <Link href="/hacienda?orden=reciente" className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
              Ver hacienda <IconArrowRight size={16} />
            </Link>
          }
        />
        {d.actividad.length ? (
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Evento</Th>
                <Th>Detalle</Th>
                <Th>Cargado por</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {d.actividad.map((a) => (
                <Tr key={a.id}>
                  <Td className="whitespace-nowrap tabular-nums text-muted">{fecha(a.ocurrido_en)}</Td>
                  <Td className="font-medium">{a.tipo_nombre ?? a.tipo}</Td>
                  <Td className="text-muted">{a.resumen}</Td>
                  <Td>
                    {a.autor?.nombre && (
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar name={a.autor.nombre} size={26} />
                        <span>
                          {a.autor.nombre}
                          {a.autor.rol && <span className="block text-[12px] text-muted">{ROL_LABEL[a.autor.rol as keyof typeof ROL_LABEL] ?? a.autor.rol}</span>}
                        </span>
                      </span>
                    )}
                  </Td>
                  <Td>
                    <TrustBadge nivel={a.confianza ?? "declarado"} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<IconList size={24} />} title="Todavía no hay actividad" description="Los eventos que se carguen en el campo o desde la web aparecen acá con su autor." />
        )}
      </Card>
    </>
  );
}

/** Inicio del panel (TPA-52) — estructura de la preview 01 con datos reales. */
export default function InicioPage() {
  return (
    <Suspense
      fallback={
        <>
          <Encabezado subtitle="Cargando datos del establecimiento…" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[104px] rounded-[var(--radius-card)] border border-border bg-surface" />
            ))}
          </div>
        </>
      }
    >
      <Tablero />
    </Suspense>
  );
}
