import { useEffect, useRef, useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { suggestLocations, type LocationSuggestion } from "@/lib/canadian-cities";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  showLocate?: boolean;
};

export function CityAutocomplete({ value, onChange, placeholder = "City or province", className, showLocate = true }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LocationSuggestion[]>([]);
  const [locating, setLocating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(suggestLocations(value, 8));
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10`,
            { headers: { Accept: "application/json" } },
          );
          const j = await r.json();
          const detected = j.address?.city || j.address?.town || j.address?.village || j.address?.county || "";
          if (detected) onChange(detected);
        } catch {}
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div ref={ref} className={`relative flex items-center gap-1 ${className ?? ""}`}>
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground sm:w-40"
      />
      {showLocate && (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          aria-label="Use my current location"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-50"
        >
          <LocateFixed className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} />
        </button>
      )}
      {open && items.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full min-w-[14rem] overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          {items.map((it) => (
            <li key={it.label}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(it.value); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent/20"
              >
                <span>{it.label}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{it.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
