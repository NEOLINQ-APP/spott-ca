import { DollarSign } from "lucide-react";

type Props = {
  value: number | null;
  onChange: (next: number | null) => void;
};

const TIERS: { v: number; label: string; help: string }[] = [
  { v: 1, label: "$", help: "Inexpensive" },
  { v: 2, label: "$$", help: "Moderate" },
  { v: 3, label: "$$$", help: "Pricey" },
  { v: 4, label: "$$$$", help: "High-end" },
  { v: 5, label: "$$$$$", help: "Luxury" },
];

export function PriceTierEditor({ value, onChange }: Props) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <DollarSign className="h-3.5 w-3.5" /> Price range
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-full border px-3 py-1 text-xs ${value == null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          Not set
        </button>
        {TIERS.map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => onChange(t.v)}
            title={t.help}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${value === t.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PriceBadge({ tier, className }: { tier: number | null | undefined; className?: string }) {
  if (!tier || tier < 1 || tier > 5) return null;
  return (
    <span
      title={`Price range: ${"$".repeat(tier)}`}
      className={`inline-flex items-center rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] font-semibold text-foreground/80 ${className ?? ""}`}
    >
      <span className="text-emerald-600 dark:text-emerald-400">{"$".repeat(tier)}</span>
      <span className="ml-0.5 text-muted-foreground/60">{"$".repeat(5 - tier)}</span>
    </span>
  );
}
