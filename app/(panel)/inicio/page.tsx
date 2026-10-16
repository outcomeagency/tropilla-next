import Link from "next/link";
import type { ComponentType } from "react";
import type { Metadata } from "next";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  KpiCard,
  PageHeader,
  SpeciesChip,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
  TrustBadge,
  inputClass,
} from "@/components/ui";
import {
  IconArrowRight,
  IconBuffalo,
  IconCalendar,
  IconChart,
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
import { MOCK_ACTIVIDAD, MOCK_EXISTENCIAS, MOCK_PENDIENTES, MOCK_RESUMEN, type Pendiente } from "@/lib/mock";

export const metadata: Metadata = { title: "Inicio" };

const nf = new Intl.NumberFormat("es-AR");

const KPI_ICON: Record<(typeof MOCK_RESUMEN.kpis)[number]["icon"], ComponentType<IconProps>> = {
  chart: IconChart,
  cow: IconCow,
  buffalo: IconBuffalo,
  heart: IconHeart,
};

const PENDIENTE_ICON: Record<Pendiente["icon"], ComponentType<IconProps>> = {
  syringe: IconSyringe,
  calendar: IconCalendar,
  file: IconFile,
  message: IconMessage,
  list: IconList,
};

/**
 * Inicio del panel — réplica de brain/design/previews/01-web-dashboard-inicio.jpg.
 * TODO(API): reemplazar lib/mock.ts por GET /establecimientos/{id}/resumen,
 * /existencias, /pendientes y /eventos.
 */
export default function InicioPage() {
  return (
    <>
      <PageHeader
        title="Inicio"
        subtitle={`${MOCK_RESUMEN.fecha} · Última sincronización ${MOCK_RESUMEN.ultimaSync}`}
        actions={
          <>
            <form action="/hacienda" role="search" className="relative w-full sm:w-[280px]">
              <label htmlFor="buscar-animal" className="sr-only">
                Buscar animal por caravana, tatuaje o RFID
              </label>
              <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                id="buscar-animal"
                name="q"
                type="search"
                placeholder="Caravana, tatuaje o RFID"
                className={`${inputClass} pl-10 text-[14px]`}
              />
            </form>
            <Button href="/trazabilidad" icon={<IconPlus size={18} />}>
              Cargar evento
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MOCK_RESUMEN.kpis.map((k) => {
          const Icon = KPI_ICON[k.icon];
          return (
            <KpiCard
              key={k.id}
              label={k.label}
              value={typeof k.value === "number" ? nf.format(k.value) : k.value}
              icon={<Icon size={24} />}
              delta={k.delta}
              deltaHint={k.hint}
              href={k.href}
            />
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader title="Existencias por categoría" />
          <StockByCategory data={MOCK_EXISTENCIAS} initial="bubalino" />
        </Card>

        <Card>
          <CardHeader
            title="Pendientes de la semana"
            action={
              <Link href="/sanidad" className="text-[13px] font-medium text-campo hover:underline">
                Ver agenda
              </Link>
            }
          />
          <ul>
            {MOCK_PENDIENTES.map((p) => {
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
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Actividad reciente"
          action={
            <Link href="/trazabilidad" className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
              Ver toda la actividad <IconArrowRight size={16} />
            </Link>
          }
        />
        <Table minWidth={860}>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Evento</Th>
              <Th>Animal / lote</Th>
              <Th>Especie</Th>
              <Th>Cargado por</Th>
              <Th>Estado</Th>
              <Th>
                <span className="sr-only">Ver</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ACTIVIDAD.map((a) => (
              <Tr key={a.id}>
                <Td className="whitespace-nowrap tabular-nums text-muted">{a.fecha}</Td>
                <Td className="font-medium">{a.evento}</Td>
                <Td>{a.sujeto}</Td>
                <Td>
                  <SpeciesChip especie={a.especie} />
                </Td>
                <Td>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Avatar name={a.autor} size={26} />
                    {a.autor}
                  </span>
                </Td>
                <Td>
                  <TrustBadge nivel={a.confianza} />
                </Td>
                <Td className="w-10 text-right">
                  <Link
                    href="/trazabilidad"
                    aria-label={`Ver ${a.evento} de ${a.sujeto}`}
                    className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-control)] text-subtle hover:bg-surface-2 hover:text-ink"
                  >
                    <IconChevronRight size={18} />
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
