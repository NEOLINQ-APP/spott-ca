import { useState } from "react";
import { Clock } from "lucide-react";
import {
  type BusinessHours, type DayKey, DAY_KEYS, DAY_LABELS, emptyHours,
} from "@/lib/hours";

type Props = {
  value: BusinessHours | null;
  onChange: (next: BusinessHours) => void;
  province?: string | null;
};

export function HoursEditor({ value, onChange, province }: Props) {
  const [hours, setHours] = useState<BusinessHours>(value ?? emptyHours(province));

  const update = (next: BusinessHours) => {
    setHours(next);
    onChange(next);
  };

  const toggleClosed = (d: DayKey) => {
    const cur = hours[d];
    update({ ...hours, [d]: cur ? null : { open: "09:00", close: "17:00" } });
  };
  const setTime = (d: DayKey, key: "open" | "close", val: string) => {
    const cur = hours[d] ?? { open: "09:00", close: "17:00" };
    update({ ...hours, [d]: { ...cur, [key]: val } });
  };

  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Business hours
      </div>
      <ul className="divide-y divide-border/60">
        {DAY_KEYS.map((d) => {
          const v = hours[d];
          const closed = !v;
          return (
            <li key={d} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-24 text-xs text-muted-foreground">{DAY_LABELS[d]}</span>
              <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={() => toggleClosed(d)}
                  className="h-3.5 w-3.5"
                />
                Closed
              </label>
              <div className="ml-auto flex items-center gap-1">
                <input
                  type="time"
                  disabled={closed}
                  value={v?.open ?? "09:00"}
                  onChange={(e) => setTime(d, "open", e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="time"
                  disabled={closed}
                  value={v?.close ?? "17:00"}
                  onChange={(e) => setTime(d, "close", e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
