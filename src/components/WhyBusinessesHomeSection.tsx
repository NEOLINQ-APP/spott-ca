import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Search,
  MessageSquare,
  BarChart3,
  MapPin,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const BENEFITS = [
  {
    icon: MapPin,
    title: "Built in Canada, for Canadians",
    blurb: "A homegrown business directory designed for Canadian cities, customers, and culture.",
  },
  {
    icon: Search,
    title: "Get found by local customers",
    blurb: "Show up when Canadians search for what you offer in your city — no global noise.",
  },
  {
    icon: ShieldCheck,
    title: "Verified, trusted profiles",
    blurb: "Verification badges and real owner profiles build instant credibility with buyers.",
  },
  {
    icon: MessageSquare,
    title: "Direct messaging with customers",
    blurb: "Talk to leads and buyers in-platform — no middlemen, no missed opportunities.",
  },
  {
    icon: BarChart3,
    title: "Modern tools that convert",
    blurb: "Photos, hours, services, promotions, events, leads and analytics in one place.",
  },
  {
    icon: Sparkles,
    title: "Founding Member pricing for life",
    blurb: "Join early and lock in our lowest introductory pricing — forever.",
  },
];

export function WhyBusinessesHomeSection() {
  return (
    <section
      aria-labelledby="why-businesses-heading"
      className="border-b border-border bg-gradient-to-b from-card/40 to-background"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> For Canadian businesses
          </div>
          <h2
            id="why-businesses-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Why businesses choose Spott.ca
          </h2>
          <p className="mt-3 text-muted-foreground">
            A modern, proudly Canadian platform built to help your business get discovered,
            trusted, and chosen by local customers across Canada.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, blurb }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card/60 p-5 transition hover:border-primary/40 hover:bg-card"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/for-business">
              See why businesses choose Spott.ca
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/business/new">List your business — free</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to="/pricing">View pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
