import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/payouts")({
  component: () => (
    <AdminPlaceholder
      title="Earnings & Payouts"
      description="Track seller and promoter balances, and release payouts."
      columns={["Payee", "Period", "Gross", "Fees", "Net", "Status", "Released at"]}
      legacyTab="Payouts"
    />
  ),
  head: () => ({ meta: [{ title: "Payouts — Spott Admin" }] }),
});
