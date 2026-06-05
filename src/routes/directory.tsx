import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias: /directory → /listings?section=business-directory.
// The Business Directory section lists claimable businesses from the
// `businesses` table — NOT marketplace items tagged "business". Preserved
// for inbound links and old bookmarks.
export const Route = createFileRoute("/directory")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/listings",
      search: {
        ...(search as Record<string, unknown>),
        section: "business-directory",
      } as never,
    });
  },
});
