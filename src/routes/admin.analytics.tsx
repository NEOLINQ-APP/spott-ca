import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Users, Zap, Share2, Clock, Target } from "lucide-react";
import { getGrowthKPIs } from "@/lib/growth-kpis.functions";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Growth Analytics — Spott Admin" }] }),
});

function AnalyticsPage() {
  const fetchKpis = useServerFn(getGrowthKPIs);
  const [data, setData] = useState<Awaited<ReturnType<typeof getGrowthKPIs>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchKpis());
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchKpis]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (err || !data) {
    return <div className="mx-auto max-w-3xl p-10 text-sm text-destructive">{err ?? "No data"}</div>;
  }

  const targetVelocity = 1027; // 100k / 90d - current
  const progressPct = Math.min(100, (data.totalListings / data.target) * 100);

  const cards = [
    {
      icon: <Users className="h-5 w-5" />,
      label: "Weekly Active Listers",
      value: data.kpis.activeListers7d.toLocaleString(),
      target: "≥ 8,000",
      hint: "Users who posted ≥ 1 listing in last 7 days",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      label: "Listing Velocity (7d avg/day)",
      value: data.kpis.velocity7d.toFixed(0),
      target: `≥ ${targetVelocity}/day`,
      hint: "New marketplace listings per day, rolling 7d",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: "Activation Rate",
      value: `${(data.kpis.activationRate * 100).toFixed(1)}%`,
      target: "≥ 40%",
      hint: "Signups posting first listing within 7 days",
    },
    {
      icon: <Share2 className="h-5 w-5" />,
      label: "K-Factor (viral coeff.)",
      value: data.kpis.kFactor.toFixed(2),
      target: "≥ 0.70",
      hint: "Referrals sent per active user × conversion",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: "Time to First Contact",
      value: data.kpis.medianHoursToFirstContact != null
        ? `${data.kpis.medianHoursToFirstContact.toFixed(1)}h`
        : "—",
      target: "< 24h",
      hint: "Median hours from listing post to first message",
    },
  ];

  const max = Math.max(1, ...data.series.map((s) => s.count));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Target className="h-4 w-4" /> 90-day growth to 100K listings
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Growth Analytics</h1>
      </header>

      {/* Progress to 100K */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total listings</div>
            <div className="mt-1 font-display text-4xl font-semibold">{data.totalListings.toLocaleString()}</div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            Target <strong className="text-foreground">{data.target.toLocaleString()}</strong>
            <div>{progressPct.toFixed(1)}% of goal</div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span className="text-primary">{c.icon}</span> {c.label}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">Target {c.target}</div>
            <div className="mt-3 text-xs text-muted-foreground">{c.hint}</div>
          </div>
        ))}
      </div>

      {/* 30-day velocity trend */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">30-day listing velocity</h2>
          <span className="text-xs text-muted-foreground">Daily new listings</span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-1">
          {data.series.map((s) => (
            <div key={s.date} className="flex-1 group relative" title={`${s.date}: ${s.count}`}>
              <div
                className="w-full rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                style={{ height: `${(s.count / max) * 100}%`, minHeight: s.count > 0 ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Referrals summary */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Referrals (last 30d)</div>
          <div className="mt-2 font-display text-3xl font-semibold">{data.referrals.totalLast30d}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.referrals.qualifiedLast30d} qualified (friend posted a listing)
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Days to target</div>
          <div className="mt-2 font-display text-3xl font-semibold">
            {data.kpis.velocity7d > 0
              ? Math.ceil((data.target - data.totalListings) / data.kpis.velocity7d)
              : "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">At current 7d velocity</div>
        </div>
      </div>
    </div>
  );
}
