"use client";

import type { S } from "@/lib/schemas";
import { Button, Card, CardBody, CardHeader, Notice } from "@/components/ui";
import { guardarProveedorAction } from "@/app/(auth)/proveedor/actions";

const PROVINCIAS = [
  ["18", "Corrientes"], ["22", "Chaco"], ["34", "Formosa"], ["54", "Misiones"],
] as const;

const IDIOMAS = [["es", "Español"], ["en", "Inglés"], ["pt", "Portugués"]] as const;

export function ProveedorEditor({ perfil, rubros, error, status }: { perfil: S<"ProveedorPerfil"> | null; rubros: S<"RubroProveedor">[]; error: boolean; status?: string }) {
  const descripciones = perfil?.descripciones as { es?: string; en?: string; pt?: string } | undefined;
  return <main className="mx-auto max-w-[760px] space-y-5 px-4 py-8">
    <div><h1 className="text-[28px] font-bold tracking-tight text-ink">Cuenta de proveedor</h1><p className="mt-1 text-sm text-muted">Armá un perfil público para que productores del NEA puedan encontrarte y pedirte presupuesto.</p></div>
    {error && <Notice tone="warning" title="No pudimos cargar todo el perfil">Podés revisar la conexión y volver a cargar la página.</Notice>}
    {status === "guardado" && <Notice tone="success" title="Perfil guardado">Se guardaron los cambios del perfil de proveedor.</Notice>}
    {status === "email" && <Notice tone="warning" title="Verificá tu email">Hace falta confirmar el correo antes de publicar el perfil.</Notice>}
    {status === "error" && <Notice tone="warning" title="No se pudo guardar">Revisá los campos requeridos y volvé a intentar.</Notice>}
    {status === "cobertura" && <Notice tone="warning" title="Revisá la zona de cobertura">Completá latitud, longitud y radio juntos. El radio debe estar entre 1 y 300 km.</Notice>}
    {perfil && <Notice tone={perfil.estado_cuit === "validado" ? "success" : perfil.estado_cuit === "inconsistente" ? "warning" : "info"} title={perfil.estado_cuit === "validado" ? "CUIT cotejado con BCRA" : perfil.estado_cuit === "inconsistente" ? "Datos inconsistentes" : "Validación de CUIT pendiente"}>
      {perfil.estado_cuit === "validado" ? `La razón social coincide con la informada por ${perfil.fuente_cuit ?? "la fuente consultada"}.` : perfil.estado_cuit === "inconsistente" ? "La razón social declarada no coincide con la informada por la fuente consultada. Revisá los datos antes de publicar." : "La fuente no permitió cotejar los datos. El perfil puede guardarse, pero el cotejo queda pendiente."}
      {perfil.razon_social_informada ? <span className="mt-1 block">Razón social informada: {perfil.razon_social_informada}</span> : null}
    </Notice>}
    <Card><CardHeader title={perfil ? "Editar perfil" : "Crear perfil proveedor"} description="Los datos fiscales quedan privados. El directorio muestra solo la información pública que cargues acá." /><CardBody>
      <form action={guardarProveedorAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">Nombre público<input name="nombre_publico" required minLength={3} maxLength={120} defaultValue={perfil?.nombre_publico} className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
          <label className="text-sm font-medium text-ink">Enlace corto<input name="slug" required pattern="[a-z0-9-]{3,60}" defaultValue={perfil?.slug} placeholder="veterinaria-esteros" className="mt-1 h-10 w-full rounded border border-border px-3" /><span className="text-xs text-muted">tropilla.ar/es/proveedores/tu-enlace</span></label>
          <label className="text-sm font-medium text-ink">Razón social declarada<input name="razon_social_declarada" required maxLength={200} defaultValue={perfil?.razon_social_declarada ?? ""} className="mt-1 h-10 w-full rounded border border-border px-3" /></label>
          <label className="text-sm font-medium text-ink">CUIT<input name="cuit" required={!perfil} inputMode="numeric" pattern="[0-9-]{11,13}" maxLength={13} placeholder={perfil ? "Dejá vacío si no lo cambiás" : "30-12345678-9"} className="mt-1 h-10 w-full rounded border border-border px-3" /><span className="text-xs text-muted">No se publica. Se coteja con el BCRA cuando la fuente responde.</span></label>
        </div>
        <fieldset><legend className="text-sm font-medium text-ink">Rubros</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{rubros.map((rubro) => <label key={rubro.codigo} className="flex items-center gap-2 rounded border border-border px-3 py-2 text-sm text-ink"><input name="rubros" type="checkbox" value={rubro.codigo} defaultChecked={perfil?.rubros.includes(rubro.codigo) ?? false} className="accent-monte" />{rubro.nombre}</label>)}</div></fieldset>
        <fieldset className="space-y-3"><legend className="text-sm font-medium text-ink">Zona de cobertura</legend><div className="flex flex-wrap gap-4 text-sm text-ink">{PROVINCIAS.map(([code, name]) => <label key={code} className="flex items-center gap-2"><input name="provincias" type="checkbox" value={code} defaultChecked={perfil?.provincias.includes(code) ?? false} className="accent-monte" />{name}</label>)}</div><p className="text-xs text-muted">El perfil público muestra solo las provincias. Para búsqueda espacial, agregá un centro y un radio aproximados; la ubicación exacta no se publica.</p><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium text-ink">Latitud<input name="cobertura_lat" type="number" step="any" min="-90" max="90" inputMode="decimal" className="mt-1 h-10 w-full rounded border border-border px-3" /></label><label className="text-sm font-medium text-ink">Longitud<input name="cobertura_lon" type="number" step="any" min="-180" max="180" inputMode="decimal" className="mt-1 h-10 w-full rounded border border-border px-3" /></label><label className="text-sm font-medium text-ink">Radio en km<input name="cobertura_radio_km" type="number" min="1" max="300" step="1" inputMode="numeric" className="mt-1 h-10 w-full rounded border border-border px-3" /></label></div><p className="text-xs text-muted">Los valores se convierten en un área aproximada PostGIS. La geometría no forma parte de la ficha pública.</p></fieldset>
        <fieldset><legend className="text-sm font-medium text-ink">Idiomas de atención</legend><div className="mt-2 flex flex-wrap gap-4 text-sm text-ink">{IDIOMAS.map(([code, name]) => <label key={code} className="flex items-center gap-2"><input name="idiomas" type="checkbox" value={code} defaultChecked={perfil?.idiomas.includes(code) ?? code === "es"} className="accent-monte" />{name}</label>)}</div></fieldset>
        <div className="space-y-3"><h2 className="text-sm font-semibold text-ink">Descripción pública en tres idiomas</h2>{([["es", "Español"], ["en", "Inglés"], ["pt", "Portugués"]] as const).map(([code, name]) => <label key={code} className="block text-sm font-medium text-ink">{name}<textarea name={`descripcion_${code}`} required minLength={20} maxLength={2000} rows={3} defaultValue={descripciones?.[code] ?? ""} className="mt-1 w-full rounded border border-border px-3 py-2" /></label>)}</div>
        <label className="flex items-center gap-2 text-sm text-ink"><input name="publico" type="checkbox" defaultChecked={perfil?.publico ?? false} className="accent-monte" />Publicar mi perfil en el directorio</label>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit">Guardar perfil</Button>{perfil?.slug && <a className="text-sm font-medium text-monte underline" href={`/es/proveedores/${perfil.slug}`} target="_blank" rel="noreferrer">Ver perfil público</a>}</div>
      </form>
    </CardBody></Card>
  </main>;
}
