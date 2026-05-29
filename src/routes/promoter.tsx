import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { getMyPromoterStats } from "@/lib/promoters.functions";
import { Loader2, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/promoter")({
  component: PromoterDashboard,
  head: () => ({ meta: [{ title: "Promoter Dashboard — Spott.ca" }] }),
});

function PromoterDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchStats = useServerFn(getMyPromoterStats);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/promoters" }); return; }
    if (!user) return;
    fetchStats().then((d) => { setData(d); setBusy(false); }).catch(() => setBusy(false));
  }, [user, loading]);

  if (loading || busy) return <><SiteHeader /><div className="mx-auto max-w-6xl p-12"><Loader2 className="h-6 w-6 animate-spin" /></div></>;

  if (!data?.promoter) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="mb-2 text-2xl font-bold">You're not a promoter yet</h1>
          <p className="mb-6 text-muted-foreground">Apply to join the program and start earning.</p>
          <Link to="/promoters" className="inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Apply now →
          </Link>
        </main>
      </>
    );
  }

  if (data.promoter.status !== "approved") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="mb-2 text-2xl font-bold">Application {data.promoter.status}</h1>
          <p className="text-muted-foreground">
            {data.promoter.status === "pending" && "We're reviewing your application — you'll hear back within 1–2 business days."}
            {data.promoter.status === "suspended" && "Your promoter account is currently suspended. Contact us if this is a mistake."}
          </p>
        </main>
      </>
    );
  }

  const { promoter, redemptions, totals } = data;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Promoter dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {promoter.display_name}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Commission: <strong className="text-foreground">
              {promoter.commission_type === "flat" ? `$${(promoter.commission_value / 100).toFixed(2)}` : `${promoter.commission_value}%`}
            </strong> per redemption</div>
          </div>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-4">
          <Stat icon={TrendingUp} label="Total redemptions" value={String(totals.count)} />
          <Stat icon={DollarSign} label="Total earned" value={`$${(totals.earned_cents / 100).toFixed(2)}`} />
          <Stat icon={Clock} label="Pending payout" value={`$${(totals.pending_cents / 100).toFixed(2)}`} accent="amber" />
          <Stat icon={CheckCircle2} label="Paid out" value={`$${(totals.paid_cents / 100).toFixed(2)}`} accent="emerald" />
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">Redemption history</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Business</th>
                  <th className="px-4 py-2">Reward</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 text-xs">{new Date(r.redeemed_at).toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-2 text-xs">{r.business?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{r.addon_type}</td>
                    <td className="px-4 py-2 text-right font-medium">${((r.commission_cents || 0) / 100).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        r.commission_status === "paid" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                        r.commission_status === "pending" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                        "bg-muted text-muted-foreground"
                      }`}>{r.commission_status}</span>
                    </td>
                  </tr>
                ))}
                {redemptions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No redemptions yet. Share your code to start earning!
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: "emerald" | "amber" }) {
  const c = accent === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : accent === "amber" ? "text-amber-600 dark:text-amber-400"
    : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className={`mb-2 h-5 w-5 ${c}`} />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
