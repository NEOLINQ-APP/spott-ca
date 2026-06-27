import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Scale, X } from "lucide-react";
import { getCompareIds, removeCompare, clearCompare, COMPARE_MAX } from "@/lib/vehicle-compare";

export function VehicleCompareBar() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(getCompareIds());
    sync();
    window.addEventListener("spott:compare-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("spott:compare-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
        <Scale className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium">Compare ({ids.length}/{COMPARE_MAX})</span>
        <div className="flex items-center gap-1">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => removeCompare(id)}
              className="group inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono hover:bg-destructive/10"
              title="Remove from compare"
            >
              {id.slice(0, 6)}
              <X className="h-3 w-3 opacity-60 group-hover:text-destructive" />
            </button>
          ))}
        </div>
        <Link
          to="/vehicles/compare"
          search={{ ids: ids.join(",") }}
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Compare
        </Link>
        <button
          type="button"
          onClick={clearCompare}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
