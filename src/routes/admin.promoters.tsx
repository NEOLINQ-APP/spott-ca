import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/promoters")({
  component: () => (
    <AdminPlaceholder
      title="Promoters / Affiliates"
      description="Manage the partner network and track referral performance."
      columns={["Promoter", "Referral code", "Users referred", "Total earnings", "Conversion rate", "Payout status"]}
      legacyTab="Promoters"
    />
  ),
  head: () => ({ meta: [{ title: "Promoters — Spott Admin" }] }),
});
