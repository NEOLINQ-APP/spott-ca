import { Link } from "@tanstack/react-router";
import { Building2, ShoppingBag, Car } from "lucide-react";

export function SectionSwitcher({ active }: { active: "directory" | "marketplace" | "autos" }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition";
  const activeCls = "bg-primary text-primary-foreground shadow-sm";
  const idleCls = "text-muted-foreground hover:text-foreground hover:bg-accent/10";
  return (
    <div
      role="tablist"
      aria-label="Switch between Directory, Marketplace and Autos"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1 backdrop-blur"
    >
      <Link
        to="/directory"
        role="tab"
        aria-selected={active === "directory"}
        className={`${base} ${active === "directory" ? activeCls : idleCls}`}
      >
        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>Directory</span>
      </Link>
      <Link
        to="/marketplace"
        role="tab"
        aria-selected={active === "marketplace"}
        className={`${base} ${active === "marketplace" ? activeCls : idleCls}`}
      >
        <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>Marketplace</span>
      </Link>
      <Link
        to="/vehicles"
        role="tab"
        aria-selected={active === "autos"}
        className={`${base} ${active === "autos" ? activeCls : idleCls}`}
      >
        <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>Autos</span>
      </Link>
    </div>
  );
}
