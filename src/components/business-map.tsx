import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Car } from "lucide-react";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function BusinessMap({ name, address, city, province, postalCode, latitude, longitude }: Props) {
  const fullAddress = [address, city, province, postalCode].filter(Boolean).join(", ");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null,
  );

  // Resolve coordinates (geocode through our server proxy if not provided).
  useEffect(() => {
    let cancelled = false;
    if (coords) return;
    if (!fullAddress) {
      setError("No address available.");
      return;
    }
    (async () => {
      try {
        // Use free OSM Nominatim directly; coordinates for most businesses
        // are already resolved server-side at ingest time.
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullAddress)}`,
          { headers: { Accept: "application/json" } },
        );
        const arr = await r.json();
        if (cancelled) return;
        if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
          setCoords({ lat: Number(arr[0].lat), lng: Number(arr[0].lon) });
        } else {
          setError("Could not locate this address on the map.");
        }
      } catch {
        if (!cancelled) setError("Map failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fullAddress, coords]);

  // Initialize / update the Leaflet map.
  useEffect(() => {
    if (!coords || !containerRef.current) return;
    if (!mapRef.current) {
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [coords.lat, coords.lng],
        16,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      L.marker([coords.lat, coords.lng], { icon: defaultIcon }).addTo(map).bindPopup(name).openPopup();
      mapRef.current = map;
    } else {
      mapRef.current.setView([coords.lat, coords.lng], 16);
    }
    return () => {
      // Only destroy on unmount (when coords change we just re-center above).
    };
  }, [coords, name]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (!fullAddress && latitude == null) return null;

  const query = encodeURIComponent(fullAddress || name);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const apple = `https://maps.apple.com/?q=${query}`;
  const uber =
    coords
      ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${coords.lat}&dropoff[longitude]=${coords.lng}&dropoff[nickname]=${query}`
      : `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${query}`;
  const lyft =
    coords
      ? `https://ride.lyft.com/ridetype?id=lyft&pickup=my_location&destination[latitude]=${coords.lat}&destination[longitude]=${coords.lng}`
      : `https://www.lyft.com/ride?id=lyft&destination=${query}`;

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" /> Location & directions
      </h2>
      {fullAddress && <p className="mt-2 text-sm text-muted-foreground">{fullAddress}</p>}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        {error ? (
          <div className="flex aspect-video w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <div ref={containerRef} className="aspect-video w-full" />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={gmaps} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/10">
          <Navigation className="h-3.5 w-3.5" /> Google Maps
        </a>
        <a href={apple} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/10">
          <Navigation className="h-3.5 w-3.5" /> Apple Maps
        </a>
        <a href={uber} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80">
          <Car className="h-3.5 w-3.5" /> Uber
        </a>
        <a href={lyft} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-pink-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-700">
          <Car className="h-3.5 w-3.5" /> Lyft
        </a>
      </div>
    </section>
  );
}
