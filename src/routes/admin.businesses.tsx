import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/businesses")({
  component: () => (
    <AdminPlaceholder
      title="Businesses"
      description="Approve, edit, and analyze every business on the directory."
      columns={["Business", "Owner", "Category", "Verified", "Total sales", "Active listings", "Rating", "Claim status"]}
      legacyTab="Listings"
    />
  ),
  head: () => ({ meta: [{ title: "Businesses — Spott Admin" }] }),
});
