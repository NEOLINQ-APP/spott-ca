import { useMemo } from "react";
import { PROVINCES, CITIES } from "@/lib/canadian-cities";

type Props = {
  province: string;
  city: string;
  onProvinceChange: (v: string) => void;
  onCityChange: (v: string) => void;
  className?: string;
};

const selectCls = "rounded-md border border-border bg-background px-2 py-2 text-sm";

// Province -> City (Canada only), each tier only ever offering options
// that are real for the tier above it (picking a province clears an
// out-of-province city rather than leaving an invalid combination sitting
// in the filter). Real Canadian data throughout; spott.ca is Canada-only.
export function LocationCascadeFilter({ province, city, onProvinceChange, onCityChange, className }: Props) {
  const cityOptions = useMemo(() => {
    if (!province) return [];
    return CITIES.filter((c) => c.province === province).sort((a, b) => a.name.localeCompare(b.name));
  }, [province]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <select
        value={province}
        onChange={(e) => {
          onProvinceChange(e.target.value);
          onCityChange("");
        }}
        className={selectCls}
        aria-label="Province"
      >
        <option value="">All provinces</option>
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
