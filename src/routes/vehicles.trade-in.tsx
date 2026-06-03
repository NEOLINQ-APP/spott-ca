import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, ArrowLeft } from "lucide-react";
import { LeadForm } from "@/components/vehicles/LeadForm";

export const Route = createFileRoute("/vehicles/trade-in")({
  component: TradeInPage,
  head: () => ({
    meta: [
      { title: "Trade-In Value — Spott Vehicles" },
      { name: "description", content: "Check your vehicle's trade-in value with our AI-powered Canadian valuation engine." },
    ],
  }),
});

function TradeInPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/vehicles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Vehicles
      </Link>
      <div className="mt-4 text-center">
        <ArrowLeftRight className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Check My Trade-In Value</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Get an instant AI trade-in range based on live Canadian market comps.
        </p>
      </div>
      <div className="mt-6">
        <LeadForm leadType="trade_in" showVehicleFields submitLabel="Get my trade-in value" />
      </div>
    </div>
  );
}
