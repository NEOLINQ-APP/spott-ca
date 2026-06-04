import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias: /browse → /listings (canonical). Preserved for inbound links/bookmarks.
export const Route = createFileRoute("/browse")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/listings", search: search as never });
  },
});
