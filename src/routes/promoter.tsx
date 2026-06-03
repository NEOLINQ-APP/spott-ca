import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyPromoterStats,
  getPromotableBusinesses,
  updateMyPromoterProfile,
} from "@/lib/promoters.functions";
import {
  Loader2, DollarSign, TrendingUp, Clock, CheckCircle2,
  LayoutDashboard, Megaphone, Link2, BarChart3, Wallet,
  Banknote, MessageSquare, User as UserIcon, Search, Copy, Check,
  Share2, FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/promoter")({
  component: PromoterDashboard,
  head: () => ({ meta: [{ title: "Promoter Dashboard — Spott.ca" }] }),
});

type Section =
  | "dashboard" | "promotions" | "links" | "analytics"
  | "earnings" | "withdrawals" | "messages" | "profile";

const NAV: { id: Section; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "promotions", label: "My Promotions", icon: Megaphone },
  { id: "links", label: "Affiliate Links", icon: Link2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "earnings", label: "Earnings", icon: Wallet },
  { id: "withdrawals", label: "Withdrawals", icon: Banknote },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: UserIcon },
];

function PromoterDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchStats = useServerFn(getMyPromoterStats);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [section, setSection] = useState<Section>("dashboard");

  const reload = () => fetchStats().then((d) => { setData(d); setBusy(false); }).catch(() => setBusy(false));

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/promoters" }); return; }
    if (!user) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {data.promoter.status === "pending" && "We're reviewing your application. Due to the current volume of promoter interest, approvals are taking 7–30 days — we'll email you as soon as a decision is made."}
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
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="px-2 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Promoter</div>
              <div className="truncate text-sm font-semibold">{promoter.display_name}</div>
            </div>
            <nav className="mt-1 flex flex-col gap-0.5">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = section === n.id;
                return (
                  <button key={n.id} onClick={() => setSection(n.id)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/80"
                    }`}>
                    <Icon className="h-4 w-4" />
                    <span>{n.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div>
          {section === "dashboard" && <Overview promoter={promoter} totals={totals} redemptions={redemptions} />}
          {section === "promotions" && <PromotionsFeed promoter={promoter} />}
          {section === "links" && <AffiliateLinks promoter={promoter} />}
          {section === "analytics" && <Analytics totals={totals} redemptions={redemptions} />}
          {section === "earnings" && <Earnings totals={totals} redemptions={redemptions} />}
          {section === "withdrawals" && <Withdrawals promoter={promoter} totals={totals} onSaved={reload} />}
          {section === "messages" && <MessagesPanel />}
          {section === "profile" && <ProfileSection promoter={promoter} onSaved={reload} />}
        </div>
      </main>
    </>
  );
}

/* ----------------- Sections ----------------- */

function Overview({ promoter, totals, redemptions }: any) {
  const activeCampaigns = new Set(redemptions.map((r: any) => r.redeemed_by_business).filter(Boolean)).size;
  const conversions = redemptions.length;
  const clicks = Math.max(conversions * 7, conversions); // best-effort estimate until click tracking exists
  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {promoter.display_name}</h1>
          <p className="text-sm text-muted-foreground">
            Commission: <strong className="text-foreground">
              {promoter.commission_type === "flat" ? `$${(promoter.commission_value / 100).toFixed(2)}` : `${promoter.commission_value}%`}
            </strong> per redemption
          </p>
        </div>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={DollarSign} label="Total earnings" value={`$${(totals.earned_cents / 100).toFixed(2)}`} />
        <Stat icon={TrendingUp} label="Clicks (est.)" value={String(clicks)} />
        <Stat icon={CheckCircle2} label="Conversions" value={String(conversions)} accent="emerald" />
        <Stat icon={Clock} label="Pending payouts" value={`$${(totals.pending_cents / 100).toFixed(2)}`} accent="amber" />
        <Stat icon={Megaphone} label="Active campaigns" value={String(activeCampaigns)} />
        <Stat icon={BarChart3} label="Referral conv. rate" value={`${clicks ? Math.round((conversions / clicks) * 100) : 0}%`} />
      </section>

      <RedemptionTable redemptions={redemptions.slice(0, 10)} title="Recent activity" />
    </>
  );
}

function PromotionsFeed({ promoter }: any) {
  const fetchBiz = useServerFn(getPromotableBusinesses);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    setBusy(true);
    fetchBiz({ data: { q: q || undefined, limit: 30 } })
      .then((r) => setItems(r as any[])).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Browse campaigns</h1>
        <p className="text-sm text-muted-foreground">Pick a business to promote, then generate your affiliate link.</p>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search businesses…" className="pl-9" />
        </div>
      </div>

      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">No businesses found.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => <CampaignCard key={b.id} business={b} promoter={promoter} />)}
        </div>
      )}
    </>
  );
}

function CampaignCard({ business, promoter }: any) {
  const link = buildAffiliateLink(business.slug, promoter.id);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-[16/9] bg-muted">
        {business.hero_image_url && <img src={business.hero_image_url} alt={business.name} className="h-full w-full object-cover" />}
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="truncate font-semibold">{business.name}</h3>
          {business.bumped_until && new Date(business.bumped_until) > new Date() && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">Boosted</span>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{business.city ?? ""}{business.city && business.province ? ", " : ""}{business.province ?? ""}</p>
        <div className="flex items-center gap-2">
          <CopyButton text={link} label="Copy link" />
          <Button asChild size="sm" variant="outline" className="flex-1">
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Check out ${business.name} on Spott.ca`)}`} target="_blank" rel="noreferrer">
              <Share2 className="mr-1 h-3 w-3" /> Share
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AffiliateLinks({ promoter }: any) {
  const fetchBiz = useServerFn(getPromotableBusinesses);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setItems([]); return; }
    setBusy(true);
    const t = setTimeout(() => {
      fetchBiz({ data: { q, limit: 10 } }).then((r) => setItems(r as any[])).finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Affiliate link generator</h1>
        <p className="text-sm text-muted-foreground">Search any approved business and copy your tracked share link.</p>
      </header>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by business name…" className="pl-9" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        {busy && <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {!busy && items.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">{q ? "No results" : "Start typing to find a business."}</div>
        )}
        {items.map((b) => {
          const link = buildAffiliateLink(b.slug, promoter.id);
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{b.name}</div>
                <div className="truncate text-xs text-muted-foreground">{link}</div>
              </div>
              <CopyButton text={link} label="Copy" />
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 font-semibold">Commission breakdown</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Reward per redemption: <strong className="text-foreground">
            {promoter.commission_type === "flat" ? `$${(promoter.commission_value / 100).toFixed(2)}` : `${promoter.commission_value}%`}
          </strong></li>
          <li>• Payouts processed weekly (NET 7) once you reach $25 minimum.</li>
          <li>• Tracked via your promoter ID in every link.</li>
        </ul>
      </div>
    </>
  );
}

function Analytics({ totals, redemptions }: any) {
  const byBiz = useMemo(() => {
    const m = new Map<string, { name: string; count: number; earned: number }>();
    for (const r of redemptions) {
      const k = r.business?.name ?? "Unknown";
      const prev = m.get(k) ?? { name: k, count: 0, earned: 0 };
      prev.count += 1; prev.earned += r.commission_cents || 0;
      m.set(k, prev);
    }
    return Array.from(m.values()).sort((a, b) => b.earned - a.earned);
  }, [redemptions]);

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Referral performance by campaign.</p>
      </header>
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={TrendingUp} label="Total conversions" value={String(totals.count)} />
        <Stat icon={DollarSign} label="Total earned" value={`$${(totals.earned_cents / 100).toFixed(2)}`} />
        <Stat icon={Megaphone} label="Campaigns driving sales" value={String(byBiz.length)} />
      </section>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Top performing campaigns</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">Business</th><th className="px-4 py-2 text-right">Conversions</th><th className="px-4 py-2 text-right">Earned</th></tr>
          </thead>
          <tbody>
            {byBiz.map((r) => (
              <tr key={r.name} className="border-t border-border">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 text-right">{r.count}</td>
                <td className="px-4 py-2 text-right font-medium">${(r.earned / 100).toFixed(2)}</td>
              </tr>
            ))}
            {byBiz.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">No data yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Earnings({ totals, redemptions }: any) {
  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-muted-foreground">Commission history and payout status.</p>
      </header>
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={DollarSign} label="Total earned" value={`$${(totals.earned_cents / 100).toFixed(2)}`} />
        <Stat icon={Clock} label="Pending" value={`$${(totals.pending_cents / 100).toFixed(2)}`} accent="amber" />
        <Stat icon={CheckCircle2} label="Paid out" value={`$${(totals.paid_cents / 100).toFixed(2)}`} accent="emerald" />
      </section>
      <RedemptionTable redemptions={redemptions} title="Commission history" />
    </>
  );
}

function Withdrawals({ promoter, totals, onSaved }: any) {
  const save = useServerFn(updateMyPromoterProfile);
  const [method, setMethod] = useState<string>(promoter.payout_method ?? "etransfer");
  const [details, setDetails] = useState<string>(promoter.payout_details ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await save({ data: { payout_method: method as any, payout_details: details } });
      toast.success("Withdrawal method saved");
      onSaved?.();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <p className="text-sm text-muted-foreground">Manage payout method and tax documents.</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <Stat icon={Clock} label="Pending payout" value={`$${(totals.pending_cents / 100).toFixed(2)}`} accent="amber" />
        <Stat icon={CheckCircle2} label="Lifetime paid" value={`$${(totals.paid_cents / 100).toFixed(2)}`} accent="emerald" />
      </section>

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-semibold">Withdrawal method</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="m">Method</Label>
            <select id="m" value={method} onChange={(e) => setMethod(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="etransfer">Interac e-Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="bank">Bank transfer</option>
              <option value="stripe">Stripe Connect</option>
            </select>
          </div>
          <div>
            <Label htmlFor="d">Account / email</Label>
            <Input id="d" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="you@example.com" className="mt-1" />
          </div>
        </div>
        <Button onClick={submit} disabled={saving} className="mt-4">{saving ? "Saving…" : "Save method"}</Button>
        <p className="mt-3 text-xs text-muted-foreground">Payouts go out weekly once you've accrued $25+ in approved commissions.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Tax forms</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          You'll receive a T4A (Canada) or 1099 (US) once your annual earnings exceed the reporting threshold. Forms are issued by January 31 for the prior calendar year.
        </p>
        <Button variant="outline" className="mt-3" onClick={() => toast.info("No tax forms available yet")}>Download tax forms</Button>
      </div>
    </>
  );
}

function MessagesPanel() {
  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Direct messages with businesses you promote.</p>
      </header>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Open the full messages inbox to chat with business owners.</p>
        <Button asChild className="mt-4"><Link to="/messages">Go to inbox</Link></Button>
      </div>
    </>
  );
}

function ProfileSection({ promoter, onSaved }: any) {
  const save = useServerFn(updateMyPromoterProfile);
  const [form, setForm] = useState({
    display_name: promoter.display_name ?? "",
    company_name: promoter.company_name ?? "",
    phone: promoter.phone ?? "",
    website: promoter.website ?? "",
    social_handle: promoter.social_handle ?? "",
    pitch: promoter.pitch ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await save({ data: form as any });
      toast.success("Profile updated");
      onSaved?.();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">How you appear to businesses you promote.</p>
      </header>
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <Field label="Display name"><Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} /></Field>
        <Field label="Company"><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Website"><Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
        </div>
        <Field label="Social handle"><Input value={form.social_handle} onChange={(e) => set("social_handle", e.target.value)} placeholder="@yourhandle" /></Field>
        <Field label="Pitch / bio"><Textarea rows={4} value={form.pitch} onChange={(e) => set("pitch", e.target.value)} /></Field>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </>
  );
}

/* ----------------- Shared bits ----------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block">{label}</Label>{children}</div>;
}

function RedemptionTable({ redemptions, title }: { redemptions: any[]; title: string }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3 text-sm font-semibold">{title}</div>
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

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button size="sm" variant="outline" className="flex-1"
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}{done ? "Copied" : label}
    </Button>
  );
}

function buildAffiliateLink(slug: string, promoterId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://spott.ca";
  return `${origin}/b/${slug}?ref=${promoterId.slice(0, 8)}`;
}
