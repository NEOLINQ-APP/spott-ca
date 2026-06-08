import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDealerAnalytics } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Loader2, Eye, Inbox, Car, Percent } from "lucide-react";

export const Route = createFileRoute("/dealer/analytics")({ component: DealerAnalyticsPage });

function DealerAnalyticsPage() {
  const fetchFn = useServerFn(getDealerAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["dealer-analytics"],
    queryFn: () => fetchFn(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
      </div>
    );
  }

  const a = data ?? { views: 0, leads: 0, vehicles: 0, ctr: 0, topVehicles: [] };
  const ctrPct = (a.ctr * 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Car className="h-4 w-4"/> Vehicles</div>
          <div className="mt-2 text-2xl font-semibold">{a.vehicles}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-4 w-4"/> Total views</div>
          <div className="mt-2 text-2xl font-semibold">{a.views.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Inbox className="h-4 w-4"/> Leads</div>
          <div className="mt-2 text-2xl font-semibold">{a.leads.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Percent className="h-4 w-4"/> Lead-rate</div>
          <div className="mt-2 text-2xl font-semibold">{ctrPct}%</div>
          <div className="text-xs text-muted-foreground">leads / views</div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Top vehicles by views</h2>
        {a.topVehicles.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No vehicle activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {a.topVehicles.map((v: any) => (
              <li key={v.id} className="flex items-center justify-between py-3">
                <Link to="/vehicles/$id" params={{ id: v.id }} className="font-medium hover:underline">
                  {v.title ?? [v.year, v.make, v.model].filter(Boolean).join(" ")}
                </Link>
                <div className="text-sm text-muted-foreground">{(v.view_count ?? 0).toLocaleString()} views</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
