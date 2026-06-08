import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CreditCard,
  Loader2,
  Sparkles,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/business/billing")({
  component: BillingPage,
  head: () => ({
    meta: [
      { title: "Billing & Subscription — Spott.ca" },
      {
        name: "description",
        content:
          "Manage your Spott.ca business subscription, payment methods, invoices, and Founding Member trial.",
      },
    ],
  }),
});

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Featured Business / Pro",
  business: "Business Pro",
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function daysUntil(d?: string | null) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function BillingPage() {
  const { loading, sub, isActive, tier } = useSubscription();
  const openPortal = useServerFn(createPortalSession);
  const [portalLoading, setPortalLoading] = useState(false);

  const renewsIn = daysUntil(sub?.current_period_end);
  const isTrialing = sub?.status === "trialing";

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const url = await openPortal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/business/billing`,
        },
      });
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span>Billing</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Billing & Subscription
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your plan, payment methods, and invoices in one place.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Current plan card */}
            <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Current plan
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-semibold">
                    {TIER_LABEL[tier] ?? "Free"}
                  </h2>
                  {sub?.status && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {isActive ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      <span className="capitalize">{sub.status.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent/10"
                >
                  Change plan <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {isTrialing && (
                <div className="mt-5 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <div className="font-semibold">
                        Founding Member trial — {renewsIn ?? 0} days left
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your trial ends {formatDate(sub?.current_period_end)}. After that, your
                        locked-in introductory price renews automatically. Cancel anytime before
                        then to avoid charges.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-4">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {isTrialing ? "Trial ends" : sub?.cancel_at_period_end ? "Ends on" : "Renews on"}
                  </dt>
                  <dd className="mt-1 text-base font-semibold">
                    {formatDate(sub?.current_period_end)}
                  </dd>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    Auto-renew
                  </dt>
                  <dd className="mt-1 text-base font-semibold">
                    {sub?.cancel_at_period_end ? "Off (will cancel)" : isActive ? "On" : "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                {sub?.stripe_customer_id ? (
                  <button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Manage payment & invoices
                  </button>
                ) : (
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Sparkles className="h-4 w-4" /> Start a 90-day free trial
                  </Link>
                )}
              </div>
            </section>

            {/* Sidebar: quick links */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5">
                <div className="font-semibold">Founding Member benefits</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    90 days free on every paid plan
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Locked-in introductory pricing for life
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Cancel anytime, no questions asked
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="font-semibold">Quick links</div>
                <div className="mt-3 grid gap-2 text-sm">
                  <Link to="/pricing" className="text-primary hover:underline">
                    Compare plans →
                  </Link>
                  <Link to="/business/featured" className="text-primary hover:underline">
                    Featured placement →
                  </Link>
                  <Link to="/business/featured/analytics" className="text-primary hover:underline">
                    Placement analytics →
                  </Link>
                  <Link to="/for-business" className="text-primary hover:underline">
                    Why businesses choose Spott →
                  </Link>
                  <Link to="/contact" className="text-primary hover:underline">
                    Contact support →
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Add-ons */}
        <section className="mt-10 rounded-2xl border border-border bg-card/40 p-6">
          <h2 className="font-display text-xl font-semibold">One-time add-ons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Boosts, photo packs, and homepage features are purchased per listing from your Boost
            panel on each listing's edit page.
          </p>
          <div className="mt-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent/10"
            >
              Go to my listings <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
