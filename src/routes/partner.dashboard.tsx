import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { useAuth } from "@/hooks/use-auth";
import { applyAsSpottAutoPartner, getMySpottAutoPartner, getMySpottAutoReferrals, getMySpottAutoLeads, getMyPartnerAnalytics } from "@/lib/spott-auto.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/partner/dashboard")({
  component: PartnerDashboard,
  head: () => ({ meta: [{ title: "Partner Dashboard — SPOTT Auto" }] }),
});

function PartnerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const getPartner = useServerFn(getMySpottAutoPartner);
  const getReferrals = useServerFn(getMySpottAutoReferrals);
  const getLeads = useServerFn(getMySpottAutoLeads);
  const getAnalytics = useServerFn(getMyPartnerAnalytics);

  const [partner, setPartner] = useState<any>(undefined);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  const reload = () => {
    setBusy(true);
    getPartner()
      .then(async (p) => {
        setPartner(p);
        if (p) {
          const [r, l, a] = await Promise.all([getReferrals(), getLeads(), getAnalytics()]);
          setReferrals(r as any[]);
          setLeads(l as any[]);
          setAnalytics(a);
        }
      })
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/auth" }); return; }
    if (!user) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading || busy) {
    return <><SiteHeader /><div className="mx-auto max-w-6xl p-12"><Loader2 className="h-6 w-6 animate-spin" /></div></>;
  }

  if (!partner) return <ApplyForm onApplied={reload} />;

  if (partner.status !== "active") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="mb-2 text-2xl font-bold capitalize">Application {partner.status}</h1>
          <p className="text-muted-foreground">
            {partner.status === "pending" && "We're reviewing your SPOTT Auto partner application — we'll email you once a decision is made."}
            {partner.status === "suspended" && "Your partner account is currently suspended. Contact us if this is a mistake."}
            {partner.status === "inactive" && "Your partner account is inactive. Contact us to reactivate it."}
          </p>
        </main>
      </>
    );
  }

  const countByStatus = (statuses: string[]) => leads.filter((l) => statuses.includes(l.status)).length;
  const leadSummary = {
    total: leads.length,
    new: countByStatus(["submitted", "received"]),
    contacted: countByStatus(["contacted", "under_review"]),
    inProgress: countByStatus(["dealership_assigned", "appointment_requested", "appointment_set", "in_progress"]),
    completed: countByStatus(["completed"]),
    cancelled: countByStatus(["cancelled"]),
  };

  return (
    <PartnerShell displayName={partner.display_name}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Welcome back, {partner.display_name}</h1>
        <p className="text-sm text-muted-foreground">Referral code <span className="font-mono text-foreground">{partner.referral_code}</span></p>
      </header>

      <section className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={FileText} label="Total leads" value={leadSummary.total} />
        <Stat icon={FileText} label="New" value={leadSummary.new} />
        <Stat icon={FileText} label="Contacted" value={leadSummary.contacted} />
        <Stat icon={FileText} label="In progress" value={leadSummary.inProgress} />
        <Stat icon={Users} label="Completed" value={leadSummary.completed} accent="emerald" />
        <Stat icon={FileText} label="Cancelled" value={leadSummary.cancelled} />
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon={TrendingUp} label="Referrals" value={referrals.length} />
        <Stat icon={TrendingUp} label="Clicks" value={analytics?.clicks ?? 0} />
        <Stat icon={Users} label="Unique visitors" value={analytics?.unique_visitors ?? 0} />
        <Stat icon={FileText} label="Applications completed" value={analytics?.applications_completed ?? 0} />
        <Stat icon={TrendingUp} label="Conversion rate" value={analytics?.conversion_rate != null ? `${analytics.conversion_rate}%` : "—"} />
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Recent referrals</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Source</th><th className="px-4 py-2">Status</th></tr>
            </thead>
            <tbody>
              {referrals.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2 text-xs">{new Date(r.first_touch_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{r.source ?? "—"}</td>
                  <td className="px-4 py-2 text-xs capitalize">{r.status}</td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No referrals yet. Share your link from the Referral Center to start.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PartnerShell>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: "emerald" }) {
  const c = accent === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className={`mb-2 h-5 w-5 ${c}`} />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ApplyForm({ onApplied }: { onApplied: () => void }) {
  const { user } = useAuth();
  const apply = useServerFn(applyAsSpottAutoPartner);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!displayName.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      await apply({ data: { display_name: displayName.trim(), email: email.trim(), phone: phone.trim() || undefined } });
      toast.success("Application submitted");
      onApplied();
    } catch (e: any) {
      toast.error(e.message || "Could not submit application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-2 text-2xl font-bold">Become a SPOTT Auto partner</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Refer customers to Spott's vehicle financing flow and track every application through to a funded deal.
        </p>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ph">Phone (optional)</Label>
            <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Submitting…" : "Apply"}
          </Button>
        </div>
      </main>
    </>
  );
}
