import { createFileRoute, redirect } from "@tanstack/react-router";

// Unified "Listings" entry point. Spott is one platform — /listings is the
// canonical browse URL. /marketplace, /browse and /directory remain as
// aliases for any inbound links and old bookmarks.
export const Route = createFileRoute("/listings")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/marketplace", search: search as never });
  },
});
