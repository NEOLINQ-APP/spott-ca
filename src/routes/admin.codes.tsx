import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/codes")({
  component: () => (
    <AdminPlaceholder
      title="Promo Codes"
      description="Discount codes issued by promoters and businesses."
      columns={["Code", "Owner", "Discount type", "Usage count", "Revenue generated"]}
      legacyTab="Coupons"
    />
  ),
  head: () => ({ meta: [{ title: "Promo Codes — Spott Admin" }] }),
});
