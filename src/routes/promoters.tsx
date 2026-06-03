import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { applyAsPromoter, getMyPromoter } from "@/lib/promoters.functions";
import { toast } from "sonner";
import { Loader2, DollarSign, Megaphone, TrendingUp, CheckCircle2, Building2 } from "lucide-react";

export const Route = createFileRoute("/promoters")({
  component: PromotersPage,
  head: () => ({
    meta: [
      { title: "Become a Spott.ca Promoter — Earn money referring businesses" },
      { name: "description", content: "Join the Spott.ca promoter program. Get a custom promo code, share it with local businesses, and earn commission on every signup." },
    ],
  }),
});

function PromotersPage() {
  const { user, loading } = useAuth();
  const { isOwner, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const apply = useServerFn(applyAsPromoter);
  const fetchMine = useServerFn(getMyPromoter);

  const [existing, setExisting] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    company_name: "",
    email: "",
    phone: "",
    website: "",
    social_handle: "",
    pitch: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setChecked(true); return; }
    fetchMine().then((r) => { setExisting(r); setChecked(true); }).catch(() => setChecked(true));
    setForm((f) => ({ ...f, email: f.email || user.email || "" }));
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try {
      await apply({ data: { ...form, website: form.website || undefined } as any });
      toast.success("Application submitted! We'll review it soon.");
      const r = await fetchMine();
      setExisting(r);
    } catch (e: any) {
      toast.error(e?.message || "Could not submit");
    } finally { setBusy(false); }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <section className="mb-12 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Megaphone className="h-3.5 w-3.5" /> Spott.ca Promoter Program
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Earn money helping local businesses get found</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Get your own promo code, share it with restaurants, shops and service businesses in your network, and earn commission every time one signs up or unlocks a paid feature.
          </p>
        </section>

        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: DollarSign, title: "Real commissions", body: "Flat fee or percentage on every redemption. We track everything and pay out monthly." },
            { icon: TrendingUp, title: "Full transparency", body: "Live dashboard shows every use of your code: who, when, and how much you've earned." },
            { icon: CheckCircle2, title: "Easy to share", body: "Custom branded code (e.g. JOE10). Drop it in your bio, send to clients, or print on flyers." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="mb-1 text-2xl font-bold">Apply to become a promoter</h2>
          <p className="mb-6 text-sm text-muted-foreground">We review every application personally. Due to the high volume of promoter interest, approvals currently take 7–30 days. Approved promoters get a unique code and full dashboard access once review is complete. Questions? Email <a href="mailto:ads@spott.ca" className="text-primary hover:underline">ads@spott.ca</a>.</p>

          {!checked || loading || rolesLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : !user ? (
            <div className="rounded-lg bg-muted/40 p-6 text-center">
              <p className="mb-1 text-sm font-medium">Business account required</p>
              <p className="mb-3 text-xs text-muted-foreground">Promoters must sign up as a business — regular customer accounts can't apply.</p>
              <Link to="/auth" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Sign up as a business
              </Link>
            </div>
          ) : !isOwner && !existing ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-center">
              <Building2 className="mx-auto mb-2 h-6 w-6 text-amber-600 dark:text-amber-400" />
              <p className="mb-1 text-sm font-medium">You need a business account</p>
              <p className="mb-4 text-xs text-muted-foreground">
                The promoter program is only open to verified business owners. List or claim a business to unlock your application.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/new-listing" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  List my business
                </Link>
                <Link to="/browse" className="inline-flex rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
                  Claim an existing one
                </Link>
              </div>
            </div>
          ) : existing ? (
            <div className="rounded-lg border border-border bg-muted/30 p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  existing.status === "approved" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                  existing.status === "pending" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                  "bg-muted text-muted-foreground"
                }`}>{existing.status}</span>
                <span className="text-sm font-medium">{existing.display_name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {existing.status === "pending" && "Your application is under review."}
                {existing.status === "approved" && "You're approved! "}
                {existing.status === "suspended" && "Your account is suspended. Contact us if this is a mistake."}
              </p>
              {existing.status === "approved" && (
                <Link to="/promoter" className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Open promoter dashboard →
                </Link>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Full name *</span>
                <input required maxLength={120} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Company / brand</span>
                <input maxLength={200} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Email *</span>
                <input required type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Phone</span>
                <input maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Website</span>
                <input type="url" maxLength={500} placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Social handle</span>
                <input maxLength={200} placeholder="@yourhandle (IG, TikTok, etc.)" value={form.social_handle} onChange={(e) => setForm({ ...form, social_handle: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Tell us how you'll promote Spott</span>
                <textarea maxLength={2000} rows={4} value={form.pitch} onChange={(e) => setForm({ ...form, pitch: e.target.value })}
                  placeholder="Local business contacts, social audience, newsletter, in-person events…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={busy}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit application
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
