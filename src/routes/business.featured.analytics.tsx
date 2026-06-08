import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ownerPlacementAnalytics } from "@/lib/featured-analytics.functions";
import { BarChart3, MousePointerClick, Eye, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/business/featured/analytics")({
  head: () => ({
    meta: [
      { title: "Featured Placement Analytics | Spott.ca" },
      { name: "description", content: "Track impressions, clicks, and CTR for your featured placements on Spott.ca." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

type Row = { business_id: string; name: string; slug: string; impressions: number; clicks: number; ctr: number };

function AnalyticsPage() {
  const fetchAnalytics = useServerFn(ownerPlacementAnalytics);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ impressions: 0, clicks: 0, ctr: 0 });
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics({ data: { days } })
      .then((res) => { setRows(res.rows as Row[]); setTotals(res.totals); })
      .finally(() => setLoading(false));
  }, [days, fetchAnalytics]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Featured placement analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Impressions, clicks, and CTR across your featured placements on Spott.ca.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard icon={Eye} label="Impressions" value={totals.impressions} />
        <StatCard icon={MousePointerClick} label="Clicks" value={totals.clicks} />
        <StatCard icon={TrendingUp} label="CTR" value={`${(totals.ctr * 100).toFixed(2)}%`} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
          <BarChart3 className="h-4 w-4" /> By business
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No placement events yet. Apply for a featured placement to start collecting data.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Business</th>
                <th className="px-4 py-2 text-right">Impressions</th>
                <th className="px-4 py-2 text-right">Clicks</th>
                <th className="px-4 py-2 text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.business_id} className="border-t border-border">
                  <td className="px-4 py-2"><a className="hover:underline" href={`/business/${r.slug}`}>{r.name}</a></td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.impressions}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.clicks}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{(r.ctr * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
