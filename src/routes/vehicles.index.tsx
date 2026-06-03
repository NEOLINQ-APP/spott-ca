import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Search, DollarSign, ArrowLeftRight, Tag, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/vehicles/")({
  component: VehiclesHub,
  head: () => ({
    meta: [
      { title: "Spott Vehicles — Buy & Sell Cars in Canada" },
      { name: "description", content: "Browse vehicles, sell your car, get a cash offer, or check your trade-in value." },
    ],
  }),
});

function VehiclesHub() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Car className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">Spott Vehicles</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Canada's home for cars, trucks and SUVs. Buy from private sellers and dealers, list yours in minutes with AI-assisted posting.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard to="/vehicles/browse" icon={<Search className="h-6 w-6" />} title="Browse Vehicles" subtitle="Search the marketplace" primary />
        <ActionCard to="/vehicles/sell" icon={<Tag className="h-6 w-6" />} title="Sell My Car" subtitle="Free listing in minutes" />
        <ActionCard to="/vehicles/cash-offer" icon={<DollarSign className="h-6 w-6" />} title="Get a Cash Offer" subtitle="Instant AI estimate" />
        <ActionCard to="/vehicles/trade-in" icon={<ArrowLeftRight className="h-6 w-6" />} title="Trade-In Value" subtitle="Check what it's worth" />
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Are you a dealer?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Get unlimited listings, priority placement, and qualified leads delivered straight to your dashboard.</p>
        <Link to="/auth" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Dealer sign up <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function ActionCard({ to, icon, title, subtitle, primary }: { to: string; icon: React.ReactNode; title: string; subtitle: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl border-2 p-5 transition hover:scale-[1.02] ${
        primary ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {icon}
      </div>
      <div className="mt-4 font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
      <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
    </Link>
  );
}
