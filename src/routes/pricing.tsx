import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, TIER_RANK } from "@/lib/entitlements";
import { changeSubscriptionPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Spott" },
      { name: "description", content: "Simple monthly plans for local Canadian businesses. Free to start, Pro $19/mo, Business $49/mo." },
    ],
  }),
});

function PricingPage() {
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const { tier, isActive, loading, reload } = useSubscription();
  const switchPlan = useServerFn(changeSubscriptionPlan);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id, email: data.user.email } : null));
  }, []);

  const startCheckout = async (priceId: string) => {
    if (!user) {
      window.location.href = `/auth?next=${encodeURIComponent("/pricing")}`;
      return;
    }
    // Existing subscriber → switch in place with proration.
    if (isActive) {
      setSwitching(priceId);
      try {
        await switchPlan({ data: { priceId, environment: getStripeEnvironment() } });
        toast.success("Plan updated — prorated charges applied.");
        reload();
      } catch (e: any) {
        toast.error(e?.message ?? "Could not switch plan");
      } finally { setSwitching(null); }
      return;
    }
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };


  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Simple, honest pricing</h1>
          <p className="mt-3 text-base text-muted-foreground">Built for local Canadian businesses. Cancel anytime.</p>
        </header>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = isActive ? tier === plan.tier : plan.tier === "free";
            const isDowngrade = TIER_RANK[plan.tier] < TIER_RANK[tier] && isActive;
            const highlight = plan.tier === "pro";
            return (
              <div key={plan.tier} className={`relative flex flex-col rounded-2xl border bg-card p-6 ${highlight ? "border-primary shadow-lg" : "border-border"}`}>
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.price === 0 ? "" : "/ mo CAD"}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {loading ? (
                    <button disabled className="w-full rounded-md bg-secondary px-4 py-2 text-sm">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </button>
                  ) : isCurrent ? (
                    <button disabled className="w-full rounded-md border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
                      Current plan
                    </button>
                  ) : plan.tier === "free" ? (
                    <Link to="/auth" className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm hover:bg-accent/10">
                      Get started
                    </Link>
                  ) : (
                    <button
                      onClick={() => startCheckout(plan.priceId!)}
                      className={`w-full rounded-md px-4 py-2 text-sm font-medium transition ${
                        highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:bg-accent/10"
                      }`}
                    >
                      {isDowngrade ? "Switch" : "Upgrade"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold">One-time add-ons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Boosts, photo packs, and homepage features are purchased per listing. Open a listing from your dashboard and use the Boost panel to buy.
          </p>
        </section>
      </main>
      {checkoutElement}
    </div>
  );
}
