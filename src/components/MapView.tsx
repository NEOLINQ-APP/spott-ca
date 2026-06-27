import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(fallbackCenter, fallbackZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [fallbackCenter, fallbackZoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (pins.length === 0) return;
    const bounds = L.latLngBounds([]);
    for (const p of pins) {
      const safeTitle = p.title.replace(/</g, "&lt;");
      const safeSub = (p.subtitle ?? "").replace(/</g, "&lt;");
      const m = L.marker([p.lat, p.lng], { icon: defaultIcon }).bindPopup(
        `<a href="${p.href}" style="font-weight:600">${safeTitle}</a>${safeSub ? `<br/><span style="color:#666">${safeSub}</span>` : ""}`,
      );
      m.addTo(layer);
      bounds.extend([p.lat, p.lng]);
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [pins]);

  return <div ref={elRef} className={`${height} w-full rounded-2xl border border-border`} />;
}
