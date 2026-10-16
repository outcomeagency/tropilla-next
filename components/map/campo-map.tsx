"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { cx } from "@/components/ui";

export type LatLon = { lat: number; lon: number };
/** Anillo GeoJSON: pares [lon, lat] (el primero se repite al final al guardar). */
export type Ring = Array<[number, number]>;

export interface MapPolygon {
  id: string;
  nombre: string;
  ring: Ring;
  /** Etiqueta permanente (nombre + cabezas, ej. «Bañado Norte · 350 cab.»). */
  label?: string;
  selected?: boolean;
  /** Atenuado (archivado o fuera del filtro). */
  muted?: boolean;
}

const TILES = {
  mapa: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satelite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imágenes &copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 18,
  },
} as const;

/** Centro por defecto: General Paz, Corrientes (NEA). */
const NEA: LatLon = { lat: -27.75, lon: -57.62 };

/**
 * Mapa del campo (Leaflet + teselas OSM / satélite). Sin hex: los trazos se
 * estilan con clases (`.tp-poly`, `.tp-pin`) que usan los tokens de theme.css.
 *
 * - `point` + `onPoint`: ubicación del establecimiento (clic o arrastre).
 * - `polygons`: potreros con etiqueta; `onPolygonClick` para elegir.
 * - `drawing` + `onDrawingChange`: dibujo de un polígono por clics.
 */
export function CampoMap({
  center,
  zoom = 13,
  height = 360,
  point,
  onPoint,
  polygons,
  onPolygonClick,
  drawing,
  onDrawingChange,
  className,
  defaultLayer = "satelite",
  ariaLabel = "Mapa del establecimiento",
}: {
  center?: LatLon | null;
  zoom?: number;
  height?: number | string;
  point?: LatLon | null;
  onPoint?: (p: LatLon) => void;
  polygons?: MapPolygon[];
  onPolygonClick?: (id: string) => void;
  drawing?: Ring | null;
  onDrawingChange?: (ring: Ring) => void;
  className?: string;
  defaultLayer?: keyof typeof TILES;
  ariaLabel?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const tiles = useRef<Leaflet.TileLayer | null>(null);
  const pointLayer = useRef<Leaflet.Marker | null>(null);
  const polyLayer = useRef<Leaflet.LayerGroup | null>(null);
  const drawLayer = useRef<Leaflet.LayerGroup | null>(null);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [layer, setLayer] = useState<keyof typeof TILES>(defaultLayer);

  // Callbacks siempre frescos sin re-crear el mapa.
  const cb = useRef({ onPoint, onPolygonClick, onDrawingChange, drawing });
  useEffect(() => {
    cb.current = { onPoint, onPolygonClick, onDrawingChange, drawing };
  });

  // Init (Leaflet toca window: import dinámico).
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lf = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as typeof Leaflet);
      L.current = lf;
      const c = center ?? point ?? NEA;
      const m = lf.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([c.lat, c.lon], zoom);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const d = cb.current.drawing;
        if (d && cb.current.onDrawingChange) {
          cb.current.onDrawingChange([...d, [round(lng), round(lat)]]);
          return;
        }
        cb.current.onPoint?.({ lat: round(lat), lon: round(lng) });
      });
      // Rueda sólo con foco (no secuestra el scroll de la página).
      m.on("focus", () => m.scrollWheelZoom.enable());
      m.on("blur", () => m.scrollWheelZoom.disable());
      polyLayer.current = lf.layerGroup().addTo(m);
      drawLayer.current = lf.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // El mapa se crea una vez; center/zoom iniciales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teselas
  useEffect(() => {
    const lf = L.current;
    const m = map.current;
    if (!ready || !lf || !m) return;
    tiles.current?.remove();
    const t = TILES[layer];
    tiles.current = lf.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom }).addTo(m);
  }, [ready, layer]);

  // Punto
  useEffect(() => {
    const lf = L.current;
    const m = map.current;
    if (!ready || !lf || !m) return;
    pointLayer.current?.remove();
    pointLayer.current = null;
    if (!point) return;
    const icon = lf.divIcon({ className: "tp-pin", html: "<span></span>", iconSize: [26, 26], iconAnchor: [13, 26] });
    const mk = lf.marker([point.lat, point.lon], { icon, draggable: !!onPoint, keyboard: true, title: "Ubicación del establecimiento" }).addTo(m);
    mk.on("dragend", () => {
      const ll = mk.getLatLng();
      cb.current.onPoint?.({ lat: round(ll.lat), lon: round(ll.lng) });
    });
    pointLayer.current = mk;
    if (!polygons?.length) m.panTo([point.lat, point.lon]);
    // Por valor: un objeto nuevo con las mismas coordenadas no re-crea el marcador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, point?.lat, point?.lon, !!onPoint, polygons?.length]);

  // Polígonos
  useEffect(() => {
    const lf = L.current;
    const m = map.current;
    const g = polyLayer.current;
    if (!ready || !lf || !m || !g) return;
    g.clearLayers();
    const bounds: Leaflet.LatLngExpression[] = [];
    for (const p of polygons ?? []) {
      if (p.ring.length < 3) continue;
      const latlngs = p.ring.map(([lon, lat]) => [lat, lon] as [number, number]);
      bounds.push(...latlngs);
      const poly = lf.polygon(latlngs, {
        className: cx("tp-poly", p.selected && "tp-poly--sel", p.muted && "tp-poly--muted", onPolygonClick && "tp-poly--click"),
        bubblingMouseEvents: false,
      });
      if (p.label ?? p.nombre) poly.bindTooltip(p.label ?? p.nombre, { permanent: true, direction: "center", className: "tp-map-label" });
      if (onPolygonClick) poly.on("click", () => cb.current.onPolygonClick?.(p.id));
      g.addLayer(poly);
    }
    if (bounds.length && !fitted.current) {
      m.fitBounds(lf.latLngBounds(bounds), { padding: [24, 24], maxZoom: 15 });
      fitted.current = true;
    }
  }, [ready, polygons, onPolygonClick]);

  // Dibujo en curso
  useEffect(() => {
    const lf = L.current;
    const g = drawLayer.current;
    if (!ready || !lf || !g) return;
    g.clearLayers();
    el.current?.classList.toggle("tp-map--drawing", !!drawing);
    if (!drawing?.length) return;
    const latlngs = drawing.map(([lon, lat]) => [lat, lon] as [number, number]);
    if (latlngs.length >= 3) g.addLayer(lf.polygon(latlngs, { className: "tp-poly tp-poly--draw", interactive: false }));
    else if (latlngs.length === 2) g.addLayer(lf.polyline(latlngs, { className: "tp-poly tp-poly--draw", interactive: false }));
    latlngs.forEach((ll) => g.addLayer(lf.circleMarker(ll, { radius: 5, className: "tp-vertex", interactive: false })));
  }, [ready, drawing]);

  return (
    <div className={cx("tp-map relative overflow-hidden rounded-[12px] border border-border bg-surface-2", className)} style={{ height }}>
      <div ref={el} className="h-full w-full" role="application" aria-label={ariaLabel} />
      <div className="absolute right-2 top-2 z-[500] inline-flex rounded-[8px] border border-border bg-surface p-0.5 text-[12.5px] font-medium">
        {(["mapa", "satelite"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setLayer(k)}
            aria-pressed={layer === k}
            className={cx("h-7 rounded-[6px] px-2.5 transition-colors", layer === k ? "bg-monte text-blanco" : "text-ink hover:bg-surface-2")}
          >
            {k === "mapa" ? "Mapa" : "Satélite"}
          </button>
        ))}
      </div>
      {!ready && <p className="absolute inset-0 grid place-items-center text-[13px] text-muted">Cargando mapa…</p>}
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** Superficie aproximada de un anillo [lon, lat] en hectáreas (esférica, suficiente para mostrar). */
export function areaHa(ring: Ring): number {
  if (ring.length < 3) return 0;
  const R = 6378137;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % ring.length];
    sum += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((sum * R * R) / 2) / 10_000;
}
const toRad = (d: number) => (d * Math.PI) / 180;
