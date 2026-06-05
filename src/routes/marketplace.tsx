import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

export const Route = createFileRoute("/marketplace")({
  component: MarketplaceLayout,
  head: () => ({
    meta: [
      { title: "Spott Listings — Buy, sell and trade locally in Canada" },
      { name: "description", content: "Browse and post local listings on Spott. Vehicles, electronics, furniture, services and more from people near you." },
      { property: "og:title", content: "Spott Listings" },
      { property: "og:description", content: "Buy, sell and trade locally on Spott" },
    ],
    links: [{ rel: "canonical", href: "https://spott.ca/listings" }],
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
