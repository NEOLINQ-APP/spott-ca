import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Car } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/vehicles")({
  component: VehiclesLayout,
  head: () => ({
    meta: [
      { title: "Vehicles — Spott.ca" },
      { name: "description", content: "Buy and sell cars, trucks and SUVs across Canada on Spott Vehicles." },
      { property: "og:title", content: "Spott Vehicles" },
      { property: "og:description", content: "Canada's automotive marketplace — private sellers and dealers." },
    ],
  }),
});

function VehiclesLayout() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm">
          <Link to="/vehicles" className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary">
            <Car className="h-4 w-4" /> Spott Vehicles
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/vehicles/browse" className="text-muted-foreground hover:text-foreground">Browse</Link>
          <Link to="/vehicles/sell" className="text-muted-foreground hover:text-foreground">Sell My Car</Link>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
