import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonVertical } from "@/components/ComingSoonVertical";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — Coming soon · Spott" },
      {
        name: "description",
        content:
          "Local events on Spott — concerts, markets, festivals, and community happenings across Canada.",
      },
      { property: "og:title", content: "Events — Coming soon · Spott" },
      {
        property: "og:description",
        content: "Discover and post local events on Spott.",
      },
    ],
    links: [{ rel: "canonical", href: "https://spott.ca/events" }],
  }),
  component: () => (
    <ComingSoonVertical
      title="Events"
      tagline="Concerts, markets, festivals, and meetups near you."
      description="A dated, ticketed Events vertical is on the roadmap. For now, event-running businesses can list under Business Directory → Events & Entertainment."
    />
  ),
});
