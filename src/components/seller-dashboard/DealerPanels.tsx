import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyDealerInventory, listMyDealerLeads } from "@/lib/vehicles.functions";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useState } from "react";
import { toast } from "sonner";
import {
  Car,
  Inbox,
  Crown,
  Star,
  BarChart3,
  ExternalLink,
  Loader2,
  CalendarCheck,
} from "lucide-react";

function money(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

interface DealerProps {
  dealer: { id: string; name: string; slug: string } | null;
}

export function DealerInventoryPanel({ dealer }: DealerProps) {
  const fetch = useServerFn(listMyDealerInventory);
  const { data, isLoading } = useQuery({
    queryKey: ["seller", "dealer", "inventory"],
    queryFn: () => fetch({}),
  });

  if (isLoading) return <Skeleton />;
  const items = data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{items.length} vehicles in inventory</h3>
        <div className="flex gap-2">
          {dealer && (
            <Link
              to="/vehicles/dealer/$slug"
              params={{ slug: dealer.slug }}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted"
            >
              View public inventory
            </Link>
          )}
          <Link
            to="/vehicles/sell"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Add vehicle
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty icon={<Car />} title="No vehicles listed yet" body="Add your first vehicle to start receiving leads." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((v: any) => (
            <li key={v.id} className="flex items-center justify-between gap-3 p-3">
              <Link to="/vehicles/$id" params={{ id: v.id }} className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {[v.year, v.make, v.model].filter(Boolean).join(" ") || v.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {money(v.price_cents)} · {v.status}
                  {v.mileage_km != null ? ` · ${v.mileage_km.toLocaleString()} km` : ""}
                </div>
              </Link>
              <div className="text-xs text-muted-foreground">{v.view_count ?? 0} views</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DealerLeadsPanel() {
  const fetch = useServerFn(listMyDealerLeads);
  const { data, isLoading } = useQuery({
    queryKey: ["seller", "dealer", "leads"],
    queryFn: () => fetch({}),
  });
  if (isLoading) return <Skeleton />;
  const items = data ?? [];

  if (items.length === 0) {
    return <Empty icon={<Inbox />} title="No leads yet" body="Test-drive, finance and contact requests will appear here." />;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((l: any) => (
        <li key={l.id} className="p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">{l.full_name ?? "Lead"} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{l.lead_type}</span></div>
            <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {l.email ?? "—"}{l.phone ? ` · ${l.phone}` : ""}
          </div>
          {l.preferred_date && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs">
              <CalendarCheck className="h-3.5 w-3.5" />
              {l.preferred_date} {l.preferred_time ?? ""}
            </div>
          )}
          {l.message && <div className="mt-2 text-sm">{l.message}</div>}
          <Link
            to="/vehicles/$id"
            params={{ id: l.vehicle_id }}
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            View vehicle →
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DealerSubscriptionPanel() {
  const { tier, isActive, sub, loading } = useSubscription();
  const portal = useServerFn(createPortalSession);
  const [opening, setOpening] = useState(false);
  if (loading) return <Skeleton />;

  const openPortal = async () => {
    setOpening(true);
    try {
      const url = await portal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/dashboard`,
        },
      });
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-full ${tier === "free" ? "bg-secondary" : "bg-primary/15 text-primary"}`}>
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">
            Current plan: <span className="capitalize">{tier}</span>
            {sub?.cancel_at_period_end && (
              <span className="ml-2 text-xs text-yellow-600">(cancels at period end)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {tier === "free"
              ? "Upgrade for featured placement, bigger inventory limits, and lead boosts."
              : sub?.current_period_end
                ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}`
                : "Active"}
          </div>
        </div>
        <div className="flex gap-2">
          {isActive && (
            <button
              onClick={openPortal}
              disabled={opening}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/10 disabled:opacity-50"
            >
              {opening ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage billing
            </button>
          )}
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {tier === "free" ? "See plans" : "Change plan"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DealerFeaturedPanel() {
  const fetch = useServerFn(listMyDealerInventory);
  const { data, isLoading } = useQuery({
    queryKey: ["seller", "dealer", "inventory"],
    queryFn: () => fetch({}),
  });
  if (isLoading) return <Skeleton />;
  const items = data ?? [];
  // Featured signal lives on a per-vehicle featured_until column (not selected
  // by listMyDealerInventory yet). For now show inventory with a Promote CTA.
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <Star className="h-4 w-4" /> Featured listings
        </span>
        <p className="mt-1">
          Promote a vehicle to the top of search and the dealer inventory grid. Upgrade your
          subscription or buy a one-off boost.
        </p>
      </div>
      {items.length === 0 ? (
        <Empty icon={<Star />} title="No inventory to feature" body="Add a vehicle first, then promote it from here." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.slice(0, 10).map((v: any) => (
            <li key={v.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="truncate">
                {[v.year, v.make, v.model].filter(Boolean).join(" ") || v.title}
              </span>
              <Link
                to="/pricing"
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Promote
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DealerAnalyticsPanel() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <BarChart3 className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium">Dealer analytics coming soon</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Inventory views, lead conversion, and source attribution will appear here.
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-40 animate-pulse rounded-xl bg-card/60" />;
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}
