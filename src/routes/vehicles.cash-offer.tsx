import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, ArrowLeft } from "lucide-react";
import { LeadForm } from "@/components/vehicles/LeadForm";

export const Route = createFileRoute("/vehicles/cash-offer")({
  component: CashOfferPage,
  head: () => ({
    meta: [
      { title: "Get a Cash Offer — Spott Vehicles" },
      { name: "description", content: "Get an instant AI-powered cash offer for your vehicle in Canada." },
    ],
  }),
});

function CashOfferPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/vehicles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Vehicles
      </Link>
      <div className="mt-4 text-center">
        <DollarSign className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Get a Cash Offer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us about your vehicle — we'll send an instant AI estimate and follow up with a firm cash offer.
        </p>
      </div>
      <div className="mt-6">
        <LeadForm leadType="cash_offer" showVehicleFields submitLabel="Get my cash offer" />
      </div>
    </div>
  );
}
