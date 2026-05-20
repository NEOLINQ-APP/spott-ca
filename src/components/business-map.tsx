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

export function BusinessMap({ name, address, city, province, postalCode, latitude, longitude }: Props) {
  const fullAddress = [address, city, province, postalCode].filter(Boolean).join(", ");
  if (!fullAddress && latitude == null) return null;

  const query = encodeURIComponent(fullAddress || `${name}`);
  // OpenStreetMap embed — no API key needed. Centers on coords if known, else on address bbox.
  const osmSrc = latitude != null && longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.005},${longitude + 0.005},${latitude + 0.005}&layer=mapnik&marker=${latitude},${longitude}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=-141,41,-52,84&layer=mapnik`;

  const gmaps = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const apple = `https://maps.apple.com/?q=${query}`;
  // Rideshare deep-links — open native app if installed, falls back to web.
  const uber = latitude != null && longitude != null
    ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${latitude}&dropoff[longitude]=${longitude}&dropoff[nickname]=${query}`
    : `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${query}`;
  const lyft = latitude != null && longitude != null
    ? `https://ride.lyft.com/ridetype?id=lyft&pickup=my_location&destination[latitude]=${latitude}&destination[longitude]=${longitude}`
    : `https://www.lyft.com/ride?id=lyft&destination=${query}`;

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" /> Location & directions
      </h2>
      {fullAddress && (
        <p className="mt-2 text-sm text-muted-foreground">{fullAddress}</p>
      )}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <iframe
          title={`Map of ${name}`}
          src={osmSrc}
          className="aspect-video w-full"
          loading="lazy"
        />
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
