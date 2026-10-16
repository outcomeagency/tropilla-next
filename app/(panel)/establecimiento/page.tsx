import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, Button, Card, CardBody, CardHeader, DataList, EmptyState, Notice, PageHeader, SpeciesChip } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClose, IconLock, IconMap, IconPin, IconShield } from "@/components/icons";
import { CampoMap } from "@/components/map/campo-map";
import { LevantarInterdiccion, RegistrarInterdiccion } from "@/components/panel/establecimiento/interdiccion";
import { requireContexto } from "@/lib/establecimiento";
import { getEstablecimiento, getProductor } from "@/lib/data/establecimientos";
import { getCatalogos, nombreItem } from "@/lib/data/catalogos";
import { departamentoNombre, provinciaNombre } from "@/lib/geo";
import { fecha, hoyAR, nf } from "@/lib/format";
import { especieDe } from "@/lib/types";

export const metadata: Metadata = { title: "Mi establecimiento" };

const GARRAPATA: Record<string, { label: string; tone: "warning" | "info" | "success" }> = {
  erradicacion: { label: "Zona de erradicación", tone: "warning" },
  control: { label: "Zona de control", tone: "info" },
  libre: { label: "Zona libre", tone: "success" },
};
const AFTOSA: Record<string, string> = {
  libre_con_vacunacion: "Libre con vacunación",
  libre_sin_vacunacion: "Libre sin vacunación",
};

function Privado({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted">
      <IconLock size={13} /> {children ?? "Privado"}
    </span>
  );
}

function ZonaFila({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function SiNo({ si, siLabel = "Endémica", noLabel = "No endémica" }: { si: boolean; siLabel?: string; noLabel?: string }) {
  return si ? (
    <Badge tone="warning" icon={<IconAlert size={14} />}>
      {siLabel}
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<IconCheckCircle size={14} />}>
      {noLabel}
    </Badge>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const ctx = await requireContexto();
  const { ok } = await searchParams;
  const id = ctx.activa.establecimiento_id;
  const [e, cat] = await Promise.all([getEstablecimiento(id), getCatalogos()]);
  const productor = e.productor_id ? await getProductor(e.productor_id).catch(() => null) : null;
  await connection();
  const hoy = hoyAR(new Date());

  const privados = ctx.can("establecimiento.ver_privados");
  const editar = ctx.can("establecimiento.editar");
  const z = e.zonas_sanitarias ?? {};
  const dep = cat.departamentos.find((d) => d.codigo === e.departamento_codigo);
  const garrapata = z.garrapata ? GARRAPATA[z.garrapata] : null;
  const interdiccion = e.interdiccion_vigente as { evento_id?: string; motivo?: string; motivo_otro?: string; inicio?: string; levantamiento_estimado?: string } | null | undefined;
  const ubic = e.ubicacion ? { lat: Number(e.ubicacion.lat), lon: Number(e.ubicacion.lon) } : null;
  const lugar = [e.localidad, departamentoNombre(e.departamento_codigo), provinciaNombre(e.provincia_codigo)].filter(Boolean).join(" · ");
  const contacto = (productor?.contacto ?? {}) as { email?: string; telefono?: string; whatsapp?: string };
  const asociaciones = (productor?.asociaciones ?? []) as Array<{ entidad?: string; numero_socio?: string }>;
  const instalaciones = new Set(e.instalaciones ?? []);

  return (
    <>
      <PageHeader
        title="Mi establecimiento"
        subtitle="Datos del campo, zonas sanitarias y ubicación. Con esto se arman el plan sanitario sugerido y tu perfil público."
        actions={editar ? <Button href="/establecimiento/editar">Editar datos</Button> : undefined}
      />
      {ok === "datos" && (
        <div className="mb-4">
          <Notice tone="success" title="Datos guardados.">
            Los cambios ya se usan en el plan sanitario sugerido y en el perfil público (si publicás esa sección).
          </Notice>
        </div>
      )}

      {/* Encabezado del campo */}
      <Card className="mb-4 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col justify-between gap-6 p-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{productor?.nombre ?? ctx.activa.productor_nombre}</p>
              <h2 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.02em] text-ink">{e.nombre}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[14.5px] text-muted">
                <IconPin size={16} className="shrink-0" /> {lugar}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(e.especies ?? []).map((s) => (
                  <SpeciesChip key={s} especie={especieDe(s)} withIcon />
                ))}
                {(e.actividades ?? []).map((a) => (
                  <Badge key={a} tone="neutral">
                    {nombreItem(cat, "actividades", a)}
                  </Badge>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <div>
                <dt className="text-[12px] text-muted">Superficie</dt>
                <dd className="text-[22px] font-bold tabular-nums text-ink">
                  {e.superficie_ha ? nf.format(Number(e.superficie_ha)) : "—"} <span className="text-[14px] font-medium text-muted">ha</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Instalaciones</dt>
                <dd className="text-[22px] font-bold tabular-nums text-ink">
                  {instalaciones.size} <span className="text-[14px] font-medium text-muted">de {cat.items.instalaciones?.length ?? 6}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">RENSPA</dt>
                <dd className="mt-1.5 text-[14.5px] font-medium tabular-nums text-ink">{privados ? (e.renspa ?? "Sin cargar") : <Privado>Sólo dueño y administración</Privado>}</dd>
              </div>
            </dl>
          </div>
          <div className="border-t border-border lg:border-l lg:border-t-0">
            {privados ? (
              ubic ? (
                <CampoMap center={ubic} point={ubic} zoom={12} height="100%" className="min-h-[260px] rounded-none border-0" ariaLabel={`Ubicación de ${e.nombre}`} />
              ) : (
                <EmptyState
                  icon={<IconMap size={24} />}
                  title="Sin ubicación cargada"
                  description="Marcá el casco o la tranquera en el mapa. Es privada: en lo público sólo se ve el departamento."
                  action={editar ? <Button href="/establecimiento/editar#ubicacion" variant="outline">Marcar en el mapa</Button> : undefined}
                />
              )
            ) : (
              <EmptyState icon={<IconLock size={24} />} title="Ubicación privada" description="La ubicación exacta sólo la ven el dueño y la administración." />
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Productor y datos generales" description="Lo fiscal y la identificación oficial nunca se publican." />
            <CardBody>
              <DataList
                items={[
                  { label: productor?.tipo === "sociedad" ? "Razón social" : "Productor", value: productor?.nombre ?? ctx.activa.productor_nombre ?? "—" },
                  { label: "CUIT", value: privados ? (productor?.cuit ? formatCuit(productor.cuit) : "Sin cargar") : <Privado /> },
                  { label: "Departamento", value: `${departamentoNombre(e.departamento_codigo)}, ${provinciaNombre(e.provincia_codigo)}` },
                  { label: "Localidad / paraje", value: e.localidad || "—" },
                  {
                    label: "Contacto",
                    value: privados ? (
                      [contacto.email, contacto.telefono].filter(Boolean).join(" · ") || "Sin cargar"
                    ) : (
                      <Privado />
                    ),
                  },
                  {
                    label: "Asociaciones",
                    value: asociaciones.length ? asociaciones.map((a) => `${a.entidad}${a.numero_socio ? ` · socio ${a.numero_socio}` : ""}`).join(", ") : "Ninguna declarada",
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Instalaciones" description="Lo que hay en el campo para trabajar la hacienda." />
            <ul className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
              {(cat.items.instalaciones ?? []).map((i) => {
                const tiene = instalaciones.has(i.codigo);
                return (
                  <li key={i.codigo} className="flex items-center gap-2.5 bg-surface px-5 py-3.5 text-[14px]">
                    {tiene ? <IconCheckCircle size={18} className="shrink-0 text-success" /> : <IconClose size={18} className="shrink-0 text-subtle" />}
                    <span className={tiene ? "font-medium text-ink" : "text-muted"}>{i.nombre}</span>
                    <span className="sr-only">{tiene ? "(tiene)" : "(no tiene)"}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Historia del establecimiento" description="Texto libre. Se puede mostrar en el perfil público si lo activás." />
            <CardBody>
              {e.historia ? (
                <p className="max-w-[72ch] whitespace-pre-line text-[15px] leading-relaxed text-ink">{e.historia}</p>
              ) : (
                <p className="text-[14px] text-muted">
                  Todavía no contaste la historia del campo: desde cuándo está la familia, qué razas trabajan, cómo manejan los bajos.{" "}
                  {editar && (
                    <Link href="/establecimiento/editar#historia" className="font-medium text-campo hover:underline">
                      Escribirla
                    </Link>
                  )}
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Zonas sanitarias declaradas" description="Definen qué tareas sugiere el plan sanitario. Validalas con tu veterinario." />
            <div className="divide-y divide-border">
              <ZonaFila label="Interdicción" hint={interdiccion ? `Desde el ${fecha(interdiccion.inicio)}${interdiccion.levantamiento_estimado ? ` · levantamiento estimado ${fecha(interdiccion.levantamiento_estimado)}` : ""}` : "Sin interdicción vigente"}>
                {interdiccion ? (
                  <>
                    <Badge tone="danger" icon={<IconAlert size={14} />}>
                      Interdicto · {interdiccion.motivo === "rabia" ? "rabia" : (interdiccion.motivo_otro ?? "otro motivo")}
                    </Badge>
                    {ctx.can("establecimiento_eventos.crear") && interdiccion.evento_id && <LevantarInterdiccion eventoId={interdiccion.evento_id} hoy={hoy} />}
                  </>
                ) : (
                  <>
                    <Badge tone="success" icon={<IconCheckCircle size={14} />}>
                      Sin interdicción
                    </Badge>
                    {ctx.can("establecimiento_eventos.crear") && <RegistrarInterdiccion hoy={hoy} />}
                  </>
                )}
              </ZonaFila>
              <ZonaFila label="Fiebre aftosa" hint="Estatus de la zona según SENASA (declarado).">
                <Badge tone="neutral" icon={<IconShield size={14} />}>
                  {z.aftosa_zona ? (AFTOSA[z.aftosa_zona] ?? z.aftosa_zona) : "Sin declarar"}
                </Badge>
              </ZonaFila>
              <ZonaFila
                label="Garrapata"
                hint={dep?.garrapata_sugerida && dep.garrapata_sugerida !== z.garrapata ? `Para ${dep.nombre} se sugiere: ${GARRAPATA[dep.garrapata_sugerida]?.label.toLowerCase() ?? dep.garrapata_sugerida}.` : undefined}
              >
                {garrapata ? (
                  <Badge tone={garrapata.tone} icon={<IconShield size={14} />}>
                    {garrapata.label}
                  </Badge>
                ) : (
                  <Badge tone="neutral">Sin declarar</Badge>
                )}
              </ZonaFila>
              <ZonaFila label="Rabia paresiante" hint={z.rabia_endemica ? "Suma la vacunación antirrábica al plan." : undefined}>
                <SiNo si={!!z.rabia_endemica} />
              </ZonaFila>
              <ZonaFila label="Fasciola hepática" hint={z.fasciola_endemica ? "Suma control de Fasciola en bajos y esteros." : undefined}>
                <SiNo si={!!z.fasciola_endemica} />
              </ZonaFila>
            </div>
          </Card>

          {privados && ubic && (
            <Card>
              <CardHeader title="Ubicación" description="Privada: en lo público sólo se muestra departamento y provincia." />
              <CardBody className="flex items-center justify-between gap-3">
                <p className="font-mono text-[13px] tabular-nums text-ink">
                  {e.ubicacion?.lat}, {e.ubicacion?.lon}
                </p>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${e.ubicacion?.lat}&mlon=${e.ubicacion?.lon}#map=14/${e.ubicacion?.lat}/${e.ubicacion?.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-campo hover:underline"
                >
                  Abrir en OpenStreetMap
                </a>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function formatCuit(c: string): string {
  const d = c.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : c;
}

/** Datos del establecimiento y zonas sanitarias (TPA-13). */
export default function EstablecimientoPage(props: { searchParams: Promise<{ ok?: string }> }) {
  return (
    <Suspense fallback={<div className="h-[640px] rounded-[var(--radius-card)] border border-border bg-surface" />}>
      <Contenido searchParams={props.searchParams} />
    </Suspense>
  );
}
