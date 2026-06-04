import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/analytics")({
  component: () => (
    <AdminPlaceholder
      title="Analytics"
      description="Deep-dive reports across revenue, growth, and conversion."
      columns={["Revenue breakdown", "User growth", "Marketplace growth", "Top businesses", "Top promoters", "Conversion funnels"]}
    />
  ),
  head: () => ({ meta: [{ title: "Analytics — Spott Admin" }] }),
});
