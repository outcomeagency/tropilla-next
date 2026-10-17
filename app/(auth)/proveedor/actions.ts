"use server";

import { redirect } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { One, S } from "@/lib/schemas";

export async function guardarProveedorAction(formData: FormData) {
  const rubros = formData.getAll("rubros").map(String);
  const provincias = formData.getAll("provincias").map(String);
  const idiomas = formData.getAll("idiomas").map(String);
  const slug = String(formData.get("slug") ?? "");
  const cuit = String(formData.get("cuit") ?? "").trim();
  const coberturaLat = String(formData.get("cobertura_lat") ?? "").trim();
  const coberturaLon = String(formData.get("cobertura_lon") ?? "").trim();
  const coberturaRadio = String(formData.get("cobertura_radio_km") ?? "").trim();
  if (!(await getSesionOpcional())) redirect("/ingresar?next=%2Fproveedor");
  const coberturaCompleta = [coberturaLat, coberturaLon, coberturaRadio].every(Boolean);
  if ([coberturaLat, coberturaLon, coberturaRadio].some(Boolean) && !coberturaCompleta) redirect("/proveedor?estado=cobertura");
  let cobertura: { type: "MultiPolygon"; coordinates: number[][][][] } | undefined;
  if (coberturaCompleta) {
    const lat = Number(coberturaLat);
    const lon = Number(coberturaLon);
    const radio = Number(coberturaRadio);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(radio) || radio < 1 || radio > 300) {
      redirect("/proveedor?estado=cobertura");
    }
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const angular = (radio * 1000) / 6_371_008.8;
    const ring: number[][] = [];
    for (let step = 0; step <= 48; step++) {
      const bearing = (step / 48) * 2 * Math.PI;
      const destLat = Math.asin(Math.sin(latRad) * Math.cos(angular) + Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing));
      const destLon = lonRad + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad), Math.cos(angular) - Math.sin(latRad) * Math.sin(destLat));
      ring.push([(destLon * 180) / Math.PI, (destLat * 180) / Math.PI]);
    }
    cobertura = { type: "MultiPolygon", coordinates: [[ring]] };
  }
  try {
    await api<One<S<"ProveedorPerfil">>>("/me/proveedor", {
      method: "PUT",
      body: {
        slug,
        nombre_publico: String(formData.get("nombre_publico") ?? "").trim(),
        razon_social_declarada: String(formData.get("razon_social_declarada") ?? "").trim(),
        ...(cuit ? { cuit } : {}),
        rubros,
        provincias,
        ...(cobertura ? { cobertura } : {}),
        idiomas,
        descripciones: {
          es: String(formData.get("descripcion_es") ?? "").trim(),
          en: String(formData.get("descripcion_en") ?? "").trim(),
          pt: String(formData.get("descripcion_pt") ?? "").trim(),
        },
        publico: formData.get("publico") === "on",
      },
    });
  } catch (error) {
    const status = error instanceof ApiError && error.status === 403 ? "email" : "error";
    redirect(`/proveedor?estado=${status}`);
  }
  redirect("/proveedor?estado=guardado");
}
