import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getMyMarketplaceListings,
  getMySavedListings,
  getMyListingPerformance,
} from "@/lib/seller-dashboard.functions";
import { Eye, Heart, BarChart3, Tag } from "lucide-react";

function money(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

export function PrivateMyListingsPanel() {
  const fetch = useServerFn(getMyMarketplaceListings);
  const { data, isLoading } = useQuery({
    queryKey: ["seller", "private", "my-listings"],
    queryFn: () => fetch({}),
  });

  if (isLoading) return <PanelSkeleton />;
  const items = data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{items.length} listings</h3>
        <Link
          to="/marketplace/new"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New listing
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-5 w-5" />}
          title="No listings yet"
          body="Create your first marketplace listing to start selling."
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((l: any) => (
            <li key={l.id} className="flex items-center justify-between gap-3 p-3">
              <Link to="/marketplace/$id" params={{ id: l.id }} className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.title}</div>
                <div className="text-xs text-muted-foreground">
                  {money(l.price_cents, l.currency)} · {l.status}
                </div>
              </Link>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {l.view_count ?? 0}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PrivateSavedListingsPanel() {
  const fetch = useServerFn(getMySavedListings);
  const { data, isLoading } = useQuery({
    queryKey: ["seller", "private", "saved"],
    queryFn: () => fetch({}),
  });

  if (isLoading) return <PanelSkeleton />;
  const items = data ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="h-5 w-5" />}
        title="Nothing saved yet"
        body="Listings you favorite will show up here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((f: any) => {
        const l = f.marketplace_listings;
        if (!l) return null;
        return (
          <li key={f.listing_id} className="flex items-center justify-between gap-3 p-3">
            <Link to="/marketplace/$id" params={{ id: l.id }} className="flex-1 min-w-0">
              <div className="font-medium truncate">{l.title}</div>
              <div className="text-xs text-muted-foreground">
                {money(l.price_cents, l.currency)}
                {l.city ? ` · ${l.city}, ${l.province ?? ""}` : ""}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PrivatePerformancePanel() {
  const fetch = useServerFn(getMyListingPerformance);
  const { data, isLoading } = useQuery({
    queryKey: ["seller", "private", "performance"],
    queryFn: () => fetch({}),
  });

  if (isLoading) return <PanelSkeleton />;
  const t = data?.totals ?? { views: 0, active: 0, count: 0 };
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total views" value={t.views.toLocaleString()} icon={<Eye className="h-4 w-4" />} />
        <Stat label="Active listings" value={t.active.toString()} icon={<Tag className="h-4 w-4" />} />
        <Stat label="Total listings" value={t.count.toString()} icon={<BarChart3 className="h-4 w-4" />} />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-3 text-sm font-medium">Top listings by views</div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No listings to measure yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.slice(0, 10).map((i: any) => (
              <li key={i.id} className="flex items-center justify-between p-3 text-sm">
                <span className="truncate">{i.title}</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  {(i.view_count ?? 0).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Shared bits
function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function PanelSkeleton() {
  return <div className="h-40 animate-pulse rounded-xl bg-card/60" />;
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
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
