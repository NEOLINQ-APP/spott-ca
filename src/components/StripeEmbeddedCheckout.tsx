import { useState, useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";
import { previewUniversalCoupon } from "@/lib/coupons.functions";
import { Loader2, Check, X, Tag } from "lucide-react";

interface Props {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
  businessId?: string;
}

export function StripeEmbeddedCheckout({ priceId, quantity, returnUrl, businessId }: Props) {
  const preview = useServerFn(previewUniversalCoupon);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; percent_off: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proceed, setProceed] = useState(false);

  const onApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res: any = await preview({ data: { code: code.trim() } });
      if (res.valid) {
        setApplied({ code: res.code, percent_off: res.percent_off });
      } else {
        setError(res.reason || "Invalid code");
        setApplied(null);
      }
    } catch (err: any) {
      setError(err?.message || "Could not validate code");
    } finally {
      setChecking(false);
    }
  };

  const fetchClientSecret = async (): Promise<string> => {
    const cs = await createCheckoutSession({
      data: {
        priceId,
        quantity,
        returnUrl: returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
        ...(businessId && { businessId }),
        ...(applied && { couponCode: applied.code }),
      },
    });
    if (!cs) throw new Error("Could not start checkout");
    return cs;
  };

  // Re-mount Stripe iframe when applied changes so the fresh client secret carries the discount
  const stripeKey = useMemo(() => `${priceId}:${applied?.code ?? "none"}`, [priceId, applied?.code]);

  if (!proceed) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <form onSubmit={onApply} className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <Tag className="h-4 w-4 text-muted-foreground" /> Have a promo code?
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder="e.g. SPOTT"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase"
              disabled={!!applied}
            />
            {!applied ? (
              <button type="submit" disabled={checking || !code.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </button>
            ) : (
              <button type="button" onClick={() => { setApplied(null); setCode(""); }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                <X className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          {applied && (
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" /> <span className="font-mono font-semibold">{applied.code}</span> applied — {applied.percent_off}% off
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
        </form>

        <button
          type="button"
          onClick={() => setProceed(true)}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Continue to payment{applied && ` (${applied.percent_off}% off)`}
        </button>
      </div>
    );
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider key={stripeKey} stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
