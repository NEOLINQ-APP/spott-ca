import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonVertical } from "@/components/ComingSoonVertical";

export const Route = createFileRoute("/real-estate")({
  head: () => ({
    meta: [
      { title: "Real Estate — Coming soon · Spott" },
      {
        name: "description",
        content:
          "Real estate listings are coming to Spott. Browse Canadian homes, condos, and rentals from private sellers and agents.",
      },
      { property: "og:title", content: "Real Estate — Coming soon · Spott" },
      {
        property: "og:description",
        content: "Canadian real estate marketplace launching on Spott.",
      },
    ],
    links: [{ rel: "canonical", href: "https://spott.ca/real-estate" }],
  }),
  component: () => (
    <ComingSoonVertical
      title="Real Estate"
      tagline="Buy, sell, or rent across Canada — all in one place."
      description="We're building a real-estate vertical alongside Vehicles, Business Directory, and Marketplace. Expect dedicated filters for property type, beds/baths, price, and neighbourhood."
    />
  ),
});
