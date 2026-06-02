import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

export const Route = createFileRoute("/marketplace")({
  component: MarketplaceLayout,
  head: () => ({
    meta: [
      { title: "Spott Marketplace — Buy, sell and trade locally in Canada" },
      { name: "description", content: "Browse and post local listings on Spott Marketplace. Vehicles, electronics, furniture, free stuff and more from people near you." },
      { property: "og:title", content: "Spott Marketplace" },
      { property: "og:description", content: "Buy, sell and trade locally on Spott.ca" },
    ],
  }),
});

function MarketplaceLayout() {
  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <Outlet />
    </div>
  );
}
