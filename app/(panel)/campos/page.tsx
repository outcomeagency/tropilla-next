import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Button, Card, CardBody, CardHeader, EmptyState, Notice, PageHeader, Select, buttonClass, inputClass } from "@/components/ui";
import { IconFence, IconFilter, IconPlus } from "@/components/icons";
import { AvisoFila, CamposTabs, LimitesCampos } from "@/components/panel/campos/comun";
import { requireContexto } from "@/lib/establecimiento";
import { buscarCampos, getCondicionesCampos, type FiltrosCampos } from "@/lib/data/campos";
import { nf } from "@/lib/format";

export const metadata: Metadata = { title: "Campos y pastajes" };

type SP = Record<string, string | string[] | undefined>;
const CLAVES = ["modalidad", "especie", "provincia", "cabezas", "desde", "orden", "todos"] as const;
const ESPECIE_NOMBRE: Record<string, string> = { BOV: "bovinos", BUB: "búfalos" };

function leer(sp: SP) {
  const f: Partial<Record<(typeof CLAVES)[number], string>> = {};
  for (const k of CLAVES) {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.slice(0, 40);
    if (s) f[k] = s;
  }
  return f;
}

async function Contenido({ searchParams }: { searchParams: Promise<SP> }) {
  const [ctx, sp, cond] = await Promise.all([requireContexto(), searchParams, getCondicionesCampos()]);
  const f = leer(sp);
  const conRodeo = ctx.can("campos.ver");
  const filtros: FiltrosCampos = {
    establecimiento_id: conRodeo ? ctx.activa.establecimiento_id : undefined,
    modalidad: f.modalidad,
    especie: f.especie,
    provincia: f.provincia,
    cabezas: f.cabezas,
    desde: f.desde,
    orden: f.orden,
    solo_compatibles: conRodeo && !f.todos ? "1" : undefined,
  };
  const r = await buscarCampos(filtros);
  const staff = !!ctx.me.usuario.es_staff;

  if (r.estado !== "ok" || cond.estado !== "ok") {
    return (
      <>
        <CamposTabs actual="buscar" staff={staff} gestiona={ctx.can("campos.ver")} />
        <Card>
          <EmptyState
            icon={<IconFence size={24} />}
            title="No pudimos traer el mercado de campos"
            description={r.estado === "error" ? `${r.mensaje} Probá de nuevo en unos minutos.` : "Probá de nuevo en unos minutos."}
            action={<Button href="/campos">Reintentar</Button>}
          />
        </Card>
      </>
    );
  }

  const { data: avisos, meta } = r.data;
  const c = cond.data;
  const rodeo = meta.rodeo ?? [];
  const toggle = new URLSearchParams(Object.entries(f).filter(([k, v]) => k !== "todos" && v) as [string, string][]);
  if (!f.todos) toggle.set("todos", "1");

  return (
    <>
      <CamposTabs actual="buscar" staff={staff} gestiona={ctx.can("campos.ver")} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {conRodeo && (
            <Notice tone="info" title={rodeo.length ? "Comparamos cada campo con tu rodeo" : "Tu establecimiento no tiene hacienda cargada"}>
              {rodeo.length
                ? `${rodeo.map((x) => `${nf.format(x.cabezas)} ${ESPECIE_NOMBRE[x.especie] ?? x.especie}`).join(" y ")} en ${ctx.activa.establecimiento_nombre}. `
                : "Sin existencias no podemos calcular la compatibilidad: usá los filtros de especie y cabezas. "}
              {f.cabezas ? `Capacidad comparada con ${nf.format(Number(f.cabezas))} cabezas. ` : "Indicá en «Cabezas» cuántas querés mover para comparar la capacidad. "}
              {f.todos ? "Estás viendo todos los avisos." : "Mostramos solo los compatibles."}{" "}
              <Link href={`/campos?${toggle.toString()}`} className="font-semibold underline">
                {f.todos ? "Ver solo compatibles" : "Ver todos los avisos"}
              </Link>
            </Notice>
          )}

          <form method="get" className="flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
            {f.todos && <input type="hidden" name="todos" value="1" />}
            <label className="min-w-[150px] flex-1 space-y-1 text-[12.5px] font-semibold text-ink">
              Modalidad
              <Select name="modalidad" defaultValue={f.modalidad ?? ""}>
                <option value="">Todas</option>
                {c.modalidades.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </Select>
            </label>
            <label className="min-w-[130px] flex-1 space-y-1 text-[12.5px] font-semibold text-ink">
              Especie
              <Select name="especie" defaultValue={f.especie ?? ""}>
                <option value="">Todas</option>
                <option value="BOV">Bovinos</option>
                <option value="BUB">Búfalos</option>
              </Select>
            </label>
            <label className="min-w-[150px] flex-1 space-y-1 text-[12.5px] font-semibold text-ink">
              Provincia
              <Select name="provincia" defaultValue={f.provincia ?? ""}>
                <option value="">Todo el NEA</option>
                {c.provincias_piloto.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </label>
            <label className="w-[120px] space-y-1 text-[12.5px] font-semibold text-ink">
              Cabezas
              <input name="cabezas" type="number" min={1} inputMode="numeric" defaultValue={f.cabezas} className={inputClass} />
            </label>
            <label className="w-[160px] space-y-1 text-[12.5px] font-semibold text-ink">
              Desde
              <input name="desde" type="date" defaultValue={f.desde} className={inputClass} />
            </label>
            <label className="min-w-[150px] flex-1 space-y-1 text-[12.5px] font-semibold text-ink">
              Ordenar por
              <Select name="orden" defaultValue={f.orden ?? ""}>
                <option value="">{conRodeo ? "Compatibilidad" : "Más recientes"}</option>
                <option value="recientes">Más recientes</option>
                <option value="capacidad">Mayor capacidad</option>
                {conRodeo && <option value="distancia">Más cerca</option>}
              </Select>
            </label>
            <button type="submit" className={buttonClass("outline", "md")}>
              <IconFilter size={18} /> Filtrar
            </button>
          </form>

          <Card>
            <CardHeader title={`${nf.format(meta.total)} ${meta.total === 1 ? "campo disponible" : "campos disponibles"}`} description="Avisos publicados en el piloto del NEA con temporada vigente." />
            {avisos.length ? (
              <div className="divide-y divide-border">
                {avisos.map((a) => (
                  <AvisoFila key={a.id} a={a} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<IconFence size={24} />}
                title={f.todos || !conRodeo ? "No hay campos con esos filtros" : "No encontramos campos compatibles con tu rodeo"}
                description={
                  f.todos || !conRodeo
                    ? "Probá con otra provincia, modalidad o fecha. El piloto suma avisos cada semana."
                    : "Puede que la capacidad o la especie no coincidan. Mirá todos los avisos o ajustá los filtros."
                }
                action={
                  <>
                    {!f.todos && conRodeo && <Button href="/campos?todos=1">Ver todos los avisos</Button>}
                    <Button href="/campos" variant="outline">
                      Limpiar filtros
                    </Button>
                  </>
                }
              />
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          {ctx.can("campos.gestionar") && (
            <Card>
              <CardBody className="space-y-3">
                <h2 className="text-[15px] font-semibold text-ink">¿Te sobra pasto?</h2>
                <p className="text-[13.5px] text-muted">Publicá tu campo para pastaje, arrendamiento o capitalización. Es gratis durante el piloto.</p>
                <Button href="/campos/mis-avisos/nuevo" icon={<IconPlus size={18} />}>
                  Publicar un campo
                </Button>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Antes de cerrar trato" />
            <CardBody>
              <LimitesCampos avisos={c.avisos} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function CamposPage(props: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Campos y pastajes" subtitle="Encontrá campo para tu hacienda o publicá el que tenés disponible. Piloto en Corrientes, Chaco, Formosa y Misiones." />
      <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-border bg-surface" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
