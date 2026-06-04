import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias: /directory → /listings (canonical) with Business Directory filter applied.
// Preserved for inbound links and old bookmarks; Spott is one unified platform.
export const Route = createFileRoute("/directory")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/listings",
      search: { ...(search as Record<string, unknown>), type: "business" } as never,
    });
  },
});
