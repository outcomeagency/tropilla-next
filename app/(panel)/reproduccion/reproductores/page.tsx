import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { requireContexto } from "@/lib/establecimiento";
import { Card, CardBody, PageHeader } from "@/components/ui";

type Rep = { id: string; nombre: string; rp?: string | null; registro_genealogico?: string | null; raza?: string | null; especie_codigo: string; centro?: string | null; row_version: number };

async function guardar(form: FormData) {
  "use server";
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  const body = Object.fromEntries(["nombre", "rp", "registro_genealogico", "raza", "especie_codigo", "centro"].map((k) => [k, String(form.get(k) ?? "").trim() || null]));
  const id = String(form.get("id") ?? "");
  if (id) await api(`/establecimientos/${est}/reproductores-externos/${id}`, { method: "PATCH", body: { ...body, row_version: Number(form.get("row_version")) } });
  else await api(`/establecimientos/${est}/reproductores-externos`, { method: "POST", body });
  revalidatePath("/reproduccion/reproductores");
}

async function ReproductoresContenido() {
  await connection();
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  const { data } = await api<{ data: Rep[] }>(`/establecimientos/${est}/reproductores-externos`);
  return <><PageHeader title="Reproductores externos" subtitle="Toros de centros de inseminación y reproductores comprados, asociados a este establecimiento." />
    <Card className="mb-4"><CardBody><h2 className="mb-3 text-[16px] font-semibold">Agregar reproductor</h2><form action={guardar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input required name="nombre" placeholder="Nombre" className="rounded-lg border border-border bg-base px-3 py-2" />
      <input name="rp" placeholder="RP" className="rounded-lg border border-border bg-base px-3 py-2" />
      <input name="registro_genealogico" placeholder="Registro genealógico (HBA u otro)" className="rounded-lg border border-border bg-base px-3 py-2" />
      <input name="raza" placeholder="Raza" className="rounded-lg border border-border bg-base px-3 py-2" />
      <select name="especie_codigo" required defaultValue="BOV" className="rounded-lg border border-border bg-base px-3 py-2"><option value="BOV">Bovino</option><option value="BUB">Bubalino</option></select>
      <input name="centro" placeholder="Centro" className="rounded-lg border border-border bg-base px-3 py-2" />
      <button className="rounded-lg bg-campo px-4 py-2 font-semibold text-white sm:col-span-2 lg:col-span-3">Guardar reproductor</button>
    </form></CardBody></Card>
    <div className="grid gap-3 md:grid-cols-2">{data.map((r) => <Card key={r.id}><CardBody><h2 className="mb-3 font-semibold">{r.nombre}</h2><p className="mb-3 text-[13px] text-muted">{[r.rp && `RP ${r.rp}`, r.registro_genealogico, r.raza, r.especie_codigo, r.centro].filter(Boolean).join(" · ")}</p><form action={guardar} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="row_version" value={r.row_version} />
      <input required name="nombre" defaultValue={r.nombre} aria-label="Nombre" className="rounded-lg border border-border bg-base px-3 py-2" /><input name="rp" defaultValue={r.rp ?? ""} aria-label="RP" placeholder="RP" className="rounded-lg border border-border bg-base px-3 py-2" />
      <input name="registro_genealogico" defaultValue={r.registro_genealogico ?? ""} aria-label="Registro genealógico" placeholder="Registro genealógico" className="rounded-lg border border-border bg-base px-3 py-2" /><input name="raza" defaultValue={r.raza ?? ""} aria-label="Raza" placeholder="Raza" className="rounded-lg border border-border bg-base px-3 py-2" />
      <input type="hidden" name="especie_codigo" value={r.especie_codigo} /><input name="centro" defaultValue={r.centro ?? ""} aria-label="Centro" placeholder="Centro" className="rounded-lg border border-border bg-base px-3 py-2" /><button className="rounded-lg border border-border px-4 py-2 font-semibold">Guardar cambios</button>
    </form></CardBody></Card>)}</div>
  </>;
}

export default function ReproductoresPage() {
  return <Suspense fallback={<div className="h-80 rounded-xl border border-border bg-surface" />}><ReproductoresContenido /></Suspense>;
}
