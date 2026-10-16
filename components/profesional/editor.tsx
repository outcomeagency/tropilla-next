"use client";

import type { S } from "@/lib/schemas";
import { Button, Card, CardBody, CardHeader, Notice } from "@/components/ui";
import { guardarProfesionalAction } from "@/app/(auth)/profesional/actions";
import { Photo } from "@/components/public/photo";

export function ProfesionalEditor({ perfil }: { perfil: S<"Profesional"> | null }) {
  const zonas = perfil?.zonas as { provincias?: string[] } | undefined;
  return <main className="mx-auto max-w-[760px] space-y-5 px-4 py-8">
    <div><h1 className="text-[28px] font-bold tracking-tight text-ink">Perfil profesional</h1><p className="mt-1 text-sm text-muted">Contales a productores en qué trabajás y dónde pueden encontrarte.</p></div>
    <Notice tone="info" title="La matrícula se muestra como declarada">TROPILLA no valida matrículas ni acredita competencias profesionales.</Notice>
    <Card><CardHeader title={perfil ? "Editar perfil" : "Armar mi perfil"} description="Los campos del perfil público se comparten solo si activás la publicación." /><CardBody>
      <form action={guardarProfesionalAction} className="space-y-4">
        <input type="hidden" name="foto_sha256" value={perfil?.foto_sha256 ?? ""} />
        {perfil?.foto && <div className="max-w-40"><Photo src={perfil.foto} alt={perfil.foto.alt ?? perfil.nombre_publico} sizes="160px" className="aspect-square rounded-full border border-border" /></div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">Nombre público<input name="nombre_publico" required defaultValue={perfil?.nombre_publico} className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
          <label className="text-sm font-medium text-ink">Enlace corto<input name="slug" required pattern="[a-z0-9-]+" defaultValue={perfil?.slug} placeholder="ana-perez" className="mt-1 h-10 w-full rounded border border-border px-3" /><span className="text-xs text-muted">tropilla.ar/es/profesionales/tu-enlace</span></label>
          <label className="text-sm font-medium text-ink">Profesión<select name="profesion" defaultValue={perfil?.profesion ?? "veterinario"} className="mt-1 h-10 w-full rounded border border-border bg-surface px-3"><option value="veterinario">Veterinario/a</option><option value="ing_agronomo">Ingeniero/a agrónomo/a</option><option value="asesor">Asesor/a</option><option value="otro">Otro</option></select></label>
          <label className="text-sm font-medium text-ink">Matrícula declarada<input name="matricula_declarada" defaultValue={perfil?.matricula_declarada ?? ""} className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
          <label className="text-sm font-medium text-ink sm:col-span-2">Especialidades<input name="especialidades" defaultValue={perfil?.especialidades?.join(", ")} placeholder="Sanidad bubalina, reproducción" className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
          <label className="text-sm font-medium text-ink sm:col-span-2">Provincias donde trabajás<input name="provincias" defaultValue={zonas?.provincias?.join(", ")} placeholder="Corrientes, Chaco, Formosa" className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
        </div>
        <fieldset><legend className="text-sm font-medium text-ink">Idiomas</legend><div className="mt-2 flex flex-wrap gap-4 text-sm text-ink">{[["es","Español"],["en","Inglés"],["pt","Portugués"]].map(([key,label]) => <label key={key} className="flex items-center gap-2"><input name="idiomas" type="checkbox" value={key} defaultChecked={perfil?.idiomas?.includes(key as "es"|"en"|"pt") ?? key === "es"} className="accent-monte" />{label}</label>)}</div></fieldset>
        <label className="block text-sm font-medium text-ink">Presentación<textarea name="bio" rows={4} maxLength={1000} defaultValue={perfil?.bio ?? ""} className="mt-1 w-full rounded border border-border px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-sm text-ink"><input name="publico" type="checkbox" defaultChecked={perfil?.publico ?? false} className="accent-monte" />Publicar mi perfil en el directorio</label>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit">Guardar perfil</Button>{perfil?.slug && <a className="text-sm font-medium text-monte underline" href={`/es/profesionales/${perfil.slug}`} target="_blank" rel="noreferrer">Ver perfil público</a>}</div>
      </form>
    </CardBody></Card>
  </main>;
}
