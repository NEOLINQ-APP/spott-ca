import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { adminPlacementAnalytics } from "@/lib/featured-analytics.functions";
import { AdminShell } from "@/components/admin/AdminShell";
import { BarChart3, Eye, MousePointerClick, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/featured/analytics")({
  head: () => ({
    meta: [
      { title: "Featured Analytics | Spott Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminFeaturedAnalytics,
});

type Row = { business_id: string; name: string; slug: string; impressions: number; clicks: number; ctr: number };

function AdminFeaturedAnalytics() {
  const fetchAnalytics = useServerFn(adminPlacementAnalytics);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ impressions: 0, clicks: 0, ctr: 0 });
  const [bySource, setBySource] = useState<Record<string, { impressions: number; clicks: number }>>({});
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics({ data: { days } })
      .then((res) => {
        setRows(res.rows as Row[]);
        setTotals(res.totals);
        setBySource(res.bySource ?? {});
      })
      .finally(() => setLoading(false));
  }, [days, fetchAnalytics]);

  return (
    <AdminShell title="Featured analytics">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Site-wide featured placement performance.</p>
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

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat icon={Eye} label="Impressions" value={totals.impressions} />
        <Stat icon={MousePointerClick} label="Clicks" value={totals.clicks} />
        <Stat icon={TrendingUp} label="CTR" value={`${(totals.ctr * 100).toFixed(2)}%`} />
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4" /> By source
        </div>
        {Object.keys(bySource).length === 0 ? (
          <div className="text-sm text-muted-foreground">No data yet.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {Object.entries(bySource).map(([src, s]) => (
              <div key={src} className="rounded-xl border border-border bg-background/40 p-3">
                <div className="text-xs uppercase text-muted-foreground">{src}</div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>{s.impressions} impr</span>
                  <span>{s.clicks} clicks</span>
                  <span className="text-muted-foreground">
                    {s.impressions ? ((s.clicks / s.impressions) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Top featured businesses</div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No placement events yet.</div>
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
    </AdminShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number | string }) {
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
