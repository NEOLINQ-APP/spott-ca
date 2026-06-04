import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/listings")({
  component: () => (
    <AdminPlaceholder
      title="Marketplace Listings"
      description="Every product and service published to the marketplace."
      columns={["Listing", "Business owner", "Price", "Category", "Active", "Clicks / views", "Sales count"]}
      legacyTab="Marketplace"
    />
  ),
  head: () => ({ meta: [{ title: "Listings — Spott Admin" }] }),
});
