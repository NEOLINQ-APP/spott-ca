import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/transactions")({
  component: () => (
    <AdminPlaceholder
      title="Orders / Transactions"
      description="End-to-end view of every payment flowing through Spott."
      columns={["Transaction ID", "Buyer", "Business", "Amount", "Commission split", "Status", "Date"]}
      legacyTab="Orders"
    />
  ),
  head: () => ({ meta: [{ title: "Transactions — Spott Admin" }] }),
});
