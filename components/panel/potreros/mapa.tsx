"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CampoMap, type LatLon, type MapPolygon } from "@/components/map/campo-map";

/** Mapa de potreros del listado: clic en un potrero abre su ficha. */
export function PotrerosMapa({ polygons, center, height = 480 }: { polygons: MapPolygon[]; center: LatLon | null; height?: number }) {
  const router = useRouter();
  const abrir = useCallback((id: string) => router.push(`/establecimiento/potreros/${id}`), [router]);
  return <CampoMap polygons={polygons} center={center} point={polygons.length ? null : center} zoom={13} height={height} onPolygonClick={abrir} ariaLabel="Mapa de potreros" />;
}
