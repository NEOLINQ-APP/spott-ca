import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonVertical } from "@/components/ComingSoonVertical";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — Coming soon · Spott" },
      {
        name: "description",
        content:
          "Job listings are coming to Spott — full-time, part-time, gig work, and contracts from Canadian employers.",
      },
      { property: "og:title", content: "Jobs — Coming soon · Spott" },
      {
        property: "og:description",
        content: "Find work and hire locally on Spott.",
      },
    ],
    links: [{ rel: "canonical", href: "https://spott.ca/jobs" }],
  }),
  component: () => (
    <ComingSoonVertical
      title="Jobs"
      tagline="Hire locally. Find work near you."
      description="A dedicated Jobs vertical with filters for role, compensation, on-site / remote, and employer is in the works. Until then, service providers can list on the Business Directory."
    />
  ),
});
