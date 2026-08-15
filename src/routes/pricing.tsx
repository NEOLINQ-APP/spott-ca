import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Sparkles, Crown, Rocket, Star } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { changeSubscriptionPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Business Pricing — Spott.ca" },
      {
        name: "description",
        content:
          "Simple plans for Canadian businesses on Spott.ca. Free, Featured Business, Business Pro, and Enterprise. Founding Members get 90 days free and locked-in introductory pricing for life.",
      },
      { property: "og:title", content: "Business Pricing — Spott.ca" },
      {
        property: "og:description",
        content:
          "Free to start. Founding Members get 90 days free and keep their introductory pricing for life.",
      },
      { property: "og:url", content: "https://spott.ca/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://spott.ca/pricing" }],
  }),
});

type PlanTier = "free" | "featured" | "pro" | "enterprise";

interface PricingPlan {
  tier: PlanTier;
  name: string;
  price: number;
  futurePrice: string;
  blurb: string;
  features: string[];
  priceId: string | null; // Stripe lookup_key (null for Free / Enterprise)
  cta: string;
  highlight?: boolean;
  icon: any;
}

const PLANS: PricingPlan[] = [
  {
    tier: "free",
    name: "Free",
    price: 0,
    futurePrice: "Always free",
    blurb: "Get listed on Canada's modern business directory.",
    features: [
      "Basic profile",
      "Contact information",
      "Photos",
      "Business description",
    ],
    priceId: null,
    cta: "Get started free",
    icon: Star,
  },
  {
    tier: "featured",
    name: "Featured Business",
    price: 19,
    futurePrice: "Future: $29–$39 / mo",
    blurb: "Stand out and get seen by more local customers.",
    features: [
      "Everything in Free",
      "Featured placement",
      "Priority search ranking",
      "Featured badge",
    ],
    // NOTE: reuses the existing "spott_pro_monthly" Stripe price.
    priceId: "spott_pro_monthly",
    cta: "Start 90-day free trial",
    icon: Sparkles,
    highlight: true,
  },
  {
    tier: "pro",
    name: "Business Pro",
    price: 49,
    futurePrice: "Future: $79–$99 / mo",
    blurb: "Built for growing Canadian businesses.",
    features: [
      "Everything in Featured",
      "Advanced analytics",
      "Videos on your profile",
      "Promotions",
      "Events",
      "Lead tracking",
    ],
    // NOTE: reuses the existing "spott_business_monthly" Stripe price.
    priceId: "spott_business_monthly",
    cta: "Start 90-day free trial",
    icon: Crown,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: 149,
    futurePrice: "Future: $249–$499 / mo",
    blurb: "For multi-location brands, franchises and large operators.",
    features: [
      "Everything in Business Pro",
      "Multiple locations",
      "Advanced marketing tools",
      "Premium placement",
      "Dedicated account support",
    ],
    priceId: null,
    cta: "Talk to sales",
    icon: Rocket,
  },
];

function PricingPage() {
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const { tier, isActive, loading, reload } = useSubscription();
  const switchPlan = useServerFn(changeSubscriptionPlan);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null),
    );
  }, []);

  const startCheckout = async (priceId: string) => {
    if (!user) {
      window.location.href = `/auth?next=${encodeURIComponent("/pricing")}`;
      return;
    }
    if (isActive) {
      setSwitching(priceId);
      try {
        await switchPlan({ data: { priceId, environment: getStripeEnvironment() } });
        toast.success("Plan updated — prorated charges applied.");
        reload();
      } catch (e: any) {
        toast.error(e?.message ?? "Could not switch plan");
      } finally {
        setSwitching(null);
      }
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
        {/* Hero */}
        <header className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Founding Member Offer — Limited Time
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Grow your business with Spott.ca
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
            Simple, honest pricing built for Canadian businesses. Start free, upgrade anytime,
            cancel anytime.
          </p>
        </header>

        {/* Founding Member callout */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent p-6 sm:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">
                🎉 Founding Member Offer: 90 Days Free
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-foreground/90 sm:text-base">
                No charge today. Cancel anytime before your trial ends.
                <strong> Founding Members keep their introductory pricing for life</strong> — even
                as Spott.ca grows.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Pick a plan and create your account
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Add a credit card or bank account
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Enjoy 90 days completely free
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Auto-renews at your locked-in price unless cancelled
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Friendly reminders sent at 30, 14, 7, 3 and 1 day before your trial ends.
              </p>
            </div>
            <div>
              <Link
                to="/business-signup"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Become a Founding Member
              </Link>
            </div>
          </div>
        </section>

        {/* Plans grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent =
              isActive && plan.priceId
                ? (plan.tier === "featured" && tier === "pro") ||
                  (plan.tier === "pro" && tier === "business")
                : !isActive && plan.tier === "free";
            const isHighlight = plan.highlight;
            return (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 transition ${
                  isHighlight
                    ? "border-primary shadow-lg ring-1 ring-primary/30"
                    : "border-border"
                }`}
              >
                {isHighlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                )}
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">
                    {plan.price === 0
                      ? ""
                      : plan.tier === "enterprise"
                        ? "+ / mo CAD"
                        : "/ mo CAD"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  {plan.futurePrice}
                </p>

                {plan.priceId && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <Sparkles className="h-3 w-3" /> 90 days free, then ${plan.price}/mo
                  </p>
                )}

                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {loading ? (
                    <button
                      disabled
                      className="w-full rounded-md bg-secondary px-4 py-2 text-sm"
                    >
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </button>
                  ) : isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-md border border-border bg-muted px-4 py-2 text-sm text-muted-foreground"
                    >
                      Current plan
                    </button>
                  ) : plan.tier === "free" ? (
                    <Link
                      to="/business-signup"
                      className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm hover:bg-accent/10"
                    >
                      {plan.cta}
                    </Link>
                  ) : plan.tier === "enterprise" ? (
                    <Link
                      to="/contact"
                      className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm hover:bg-accent/10"
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      onClick={() => plan.priceId && startCheckout(plan.priceId)}
                      disabled={switching === plan.priceId}
                      className={`w-full rounded-md px-4 py-2 text-sm font-medium transition ${
                        isHighlight
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border hover:bg-accent/10"
                      }`}
                    >
                      {switching === plan.priceId ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        plan.cta
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Signup flow explainer */}
        <section className="mt-16 rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">How the 90-day free trial works</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { n: "1", t: "Pick a plan", d: "Choose Featured, Pro, or Enterprise." },
              { n: "2", t: "Create your account", d: "Set up your Spott.ca business profile." },
              {
                n: "3",
                t: "Add payment method",
                d: "Credit card or bank account — no charge today.",
              },
              { n: "4", t: "Enjoy 90 days free", d: "Full access. Cancel anytime." },
              {
                n: "5",
                t: "Auto-renew",
                d: "At your locked-in Founding Member price, unless cancelled.",
              },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-background p-4">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.n}
                </div>
                <div className="mt-3 text-sm font-semibold">{s.t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </ol>
          <p className="mt-5 text-sm text-muted-foreground">
            We'll send friendly reminders at <strong>30, 14, 7, 3, and 1 day</strong> remaining so
            nothing sneaks up on you.
          </p>
        </section>

        {/* One-time add-ons */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">One-time add-ons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Boosts, photo packs, and homepage features are purchased per listing. Open a listing
            from your dashboard and use the Boost panel to buy.
          </p>
        </section>
      </main>
      {checkoutElement}
    </div>
  );
}
