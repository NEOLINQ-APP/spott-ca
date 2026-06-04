import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <AdminPlaceholder
      title="Users"
      description="Search, inspect, and moderate every account on Spott."
      columns={["User ID", "Name", "Email", "Role", "Referral code", "Total spent", "Joined", "Status"]}
      legacyTab="Users"
    />
  ),
  head: () => ({ meta: [{ title: "Users — Spott Admin" }] }),
});
