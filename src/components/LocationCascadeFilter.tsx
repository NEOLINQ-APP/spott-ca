import { useMemo } from "react";
import { COUNTRIES, PROVINCES, CITIES } from "@/lib/canadian-cities";

type Props = {
  country: string;
  province: string;
  city: string;
  onCountryChange: (v: string) => void;
  onProvinceChange: (v: string) => void;
  onCityChange: (v: string) => void;
  className?: string;
};

const selectCls = "rounded-md border border-border bg-background px-2 py-2 text-sm";

// Country -> Province/State -> City, each tier only ever offering options
// that are real for the tier above it (picking a province clears an
// out-of-province city rather than leaving an invalid combination sitting
// in the filter). Real Canadian data throughout — see COUNTRIES' own
// comment in canadian-cities.ts for why country is a genuine single-entry
// list today, not a stub.
export function LocationCascadeFilter({ country, province, city, onCountryChange, onProvinceChange, onCityChange, className }: Props) {
  const cityOptions = useMemo(() => {
    if (!province) return [];
    return CITIES.filter((c) => c.province === province).sort((a, b) => a.name.localeCompare(b.name));
  }, [province]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <select
        value={country}
        onChange={(e) => {
          onCountryChange(e.target.value);
          onProvinceChange("");
          onCityChange("");
        }}
        className={selectCls}
        aria-label="Country"
      >
        <option value="">All countries</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>

      <select
        value={province}
        onChange={(e) => {
          onProvinceChange(e.target.value);
          onCityChange("");
        }}
        disabled={!country}
        className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-50`}
        aria-label="Province or state"
      >
        <option value="">{country ? "All provinces" : "Select country first"}</option>
        {PROVINCES.map((p) => (
          <option key={p.code} value={p.code}>{p.name}</option>
        ))}
      </select>

      <select
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        disabled={!province}
        className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-50`}
        aria-label="City"
      >
        <option value="">{province ? "All cities" : "Select province first"}</option>
        {cityOptions.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
