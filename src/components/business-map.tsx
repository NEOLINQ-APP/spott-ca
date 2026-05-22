/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Car } from "lucide-react";

interface Props {
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let mapsLoaderPromise: Promise<typeof google> | null = null;

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsLoaderPromise) return mapsLoaderPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Missing Google Maps browser key"));

  mapsLoaderPromise = new Promise((resolve, reject) => {
    const cbName = `__initGmaps_${Date.now()}`;
    (window as any)[cbName] = () => {
      resolve((window as any).google);
      delete (window as any)[cbName];
    };
    const script = document.createElement("script");
    const channel = TRACKING_ID ? `&channel=${TRACKING_ID}` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=${cbName}${channel}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoaderPromise;
}

export function BusinessMap({ name, address, city, province, postalCode, latitude, longitude }: Props) {
  const fullAddress = [address, city, province, postalCode].filter(Boolean).join(", ");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const init = async () => {
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;

        let center: google.maps.LatLngLiteral | null =
          latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;

        // Geocode via our server function (browser key isn't authorized for Geocoding API).
        if (!center && fullAddress) {
          try {
            const res = await fetch(`/api/geocode?address=${encodeURIComponent(fullAddress)}`);
            const data = await res.json();
            if (data?.lat != null && data?.lng != null) center = { lat: data.lat, lng: data.lng };
          } catch {
            /* fall through */
          }
        }


        if (!center) {
          setError("Could not locate this address on the map.");
          return;
        }

        const map = new g.maps.Map(containerRef.current, {
          center,
          zoom: 16,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        new g.maps.Marker({ position: center, map, title: name });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Map failed to load");
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [fullAddress, latitude, longitude, name]);

  if (!fullAddress && latitude == null) return null;

  const query = encodeURIComponent(fullAddress || name);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const apple = `https://maps.apple.com/?q=${query}`;
  const uber =
    latitude != null && longitude != null
      ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${latitude}&dropoff[longitude]=${longitude}&dropoff[nickname]=${query}`
      : `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${query}`;
  const lyft =
    latitude != null && longitude != null
      ? `https://ride.lyft.com/ridetype?id=lyft&pickup=my_location&destination[latitude]=${latitude}&destination[longitude]=${longitude}`
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
