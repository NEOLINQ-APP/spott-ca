import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDealerOverview } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Car, Inbox, Star, Sparkles, CreditCard, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/dealer/")({ component: DealerOverview });

function fmtMoney(cents?: number | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function DealerOverview() {
  const fetchOverview = useServerFn(getDealerOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["dealer-overview"],
    queryFn: () => fetchOverview(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading dealer dashboard…
      </div>
    );
  }

  const businesses = data?.businesses ?? [];
  const subs = data?.subscriptions ?? [];
  const activeSub = subs.find((s: any) => ["active", "trialing"].includes(s.status));
  const stats = data?.stats ?? { vehicleCount: 0, activeCount: 0, featuredCount: 0, leadCount: 0, newLeadCount: 0 };

  if (!businesses.length) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">No dealership yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your dealership to start listing inventory and capturing leads on Spott.ca.
        </p>
        <Link to="/business/new" className="inline-block mt-4">
          <Button>Create dealership profile</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Car className="h-4 w-4"/> Vehicles</div>
          <div className="mt-2 text-2xl font-semibold">{stats.vehicleCount}</div>
          <div className="text-xs text-muted-foreground">{stats.activeCount} active</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Star className="h-4 w-4"/> Featured</div>
          <div className="mt-2 text-2xl font-semibold">{stats.featuredCount}</div>
          <div className="text-xs text-muted-foreground">currently boosted</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Inbox className="h-4 w-4"/> Leads</div>
          <div className="mt-2 text-2xl font-semibold">{stats.leadCount}</div>
          <div className="text-xs text-muted-foreground">{stats.newLeadCount} new</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-4 w-4"/> Plan</div>
          <div className="mt-2 text-lg font-semibold capitalize">
            {activeSub?.plan?.name ?? "No active plan"}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {activeSub?.status ?? "—"}
            {activeSub?.is_founding_dealer ? " · Founding" : ""}
          </div>
        </Card>
      </div>

      {/* Subscription card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Subscription
            </h2>
            {activeSub ? (
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <div>Plan: <strong className="text-foreground">{activeSub.plan?.name}</strong></div>
                <div>Status: <span className="capitalize">{activeSub.status}</span></div>
                {activeSub.trial_ends_at && (
                  <div>Trial ends: <strong className="text-foreground">{fmtDate(activeSub.trial_ends_at)}</strong></div>
                )}
                {activeSub.is_founding_dealer && (
                  <div className="text-foreground">
                    🔒 Founding Dealer price locked: monthly {fmtMoney(activeSub.locked_monthly_price_cents)} / yearly {fmtMoney(activeSub.locked_yearly_price_cents)}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                You're not enrolled in a dealer plan yet. Start your free 90-day Founding Dealer trial.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/dealer/plans"><Button>Choose a plan</Button></Link>
            <Link to="/business/billing"><Button variant="outline">Manage billing</Button></Link>
          </div>
        </div>
      </Card>

      {/* Dealerships */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Your dealerships</h2>
        <ul className="mt-3 divide-y divide-border">
          {businesses.map((b: any) => (
            <li key={b.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">/{b.slug}</div>
              </div>
              <div className="flex gap-2">
                <Link to="/business/$slug" params={{ slug: b.slug }}><Button size="sm" variant="outline">View profile</Button></Link>
                <Link to="/vehicles/dealer/$slug" params={{ slug: b.slug }}><Button size="sm" variant="outline">Inventory page</Button></Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
