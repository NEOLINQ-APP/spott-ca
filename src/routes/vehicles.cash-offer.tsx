import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, Clock } from "lucide-react";

export const Route = createFileRoute("/vehicles/cash-offer")({
  component: () => (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <DollarSign className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 font-display text-3xl font-semibold">Get a Cash Offer</h1>
      <p className="mt-2 text-sm text-muted-foreground">Instant AI cash offers coming next. We're connecting the VIN decoder to our valuation engine.</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Launching soon</div>
      <div className="mt-6"><Link to="/vehicles" className="text-sm font-semibold text-primary hover:underline">← Back to Vehicles</Link></div>
    </div>
  ),
  head: () => ({ meta: [{ title: "Get a Cash Offer — Spott Vehicles" }] }),
});
