import { useEffect, useRef } from "react";
import type * as LType from "leaflet";

export type MapViewPin = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  lat: number;
  lng: number;
};

export function MapView({
  pins,
  height = "h-[70vh]",
  fallbackCenter = [56.1304, -106.3468] as [number, number],
  fallbackZoom = 4,
}: {
  pins: MapViewPin[];
  height?: string;
  fallbackCenter?: [number, number];
  fallbackZoom?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerRef = useRef<LType.LayerGroup | null>(null);
  const LRef = useRef<typeof LType | null>(null);
  const iconRef = useRef<LType.Icon | null>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Client-only: leaflet references `window` at module scope, so it must
      // not be imported during SSR.
      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      iconRef.current = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(fallbackCenter, fallbackZoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      renderPins(pinsRef.current);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackCenter[0], fallbackCenter[1], fallbackZoom]);

  function renderPins(list: MapViewPin[]) {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    const icon = iconRef.current;
    if (!L || !map || !layer || !icon) return;
    layer.clearLayers();
    if (list.length === 0) return;
    const bounds = L.latLngBounds([]);
    for (const p of list) {
      const safeTitle = p.title.replace(/</g, "&lt;");
      const safeSub = (p.subtitle ?? "").replace(/</g, "&lt;");
      const m = L.marker([p.lat, p.lng], { icon }).bindPopup(
        `<a href="${p.href}" style="font-weight:600">${safeTitle}</a>${safeSub ? `<br/><span style="color:#666">${safeSub}</span>` : ""}`,
      );
      m.addTo(layer);
      bounds.extend([p.lat, p.lng]);
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }

  useEffect(() => {
    renderPins(pins);
  }, [pins]);

  return <div ref={elRef} className={`${height} w-full rounded-2xl border border-border`} />;
}
