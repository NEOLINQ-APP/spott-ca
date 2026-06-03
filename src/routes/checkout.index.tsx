import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/use-auth";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createMarketplaceCheckout } from "@/lib/orders.functions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout/")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — Spott.ca" }] }),
});

function CheckoutPage() {
  const { items, clear } = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const createCheckout = useServerFn(createMarketplaceCheckout);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const promoterCode = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("spott_ref") ?? "";
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (!user) return null;
  if (items.length === 0 && !clientSecret) {
    return (
      <>
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-20 text-center text-sm text-muted-foreground">
          Your cart is empty.
        </div>
      </>
    );
  }

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createCheckout({
        data: {
          items: items.map((i) => ({ listing_id: i.id, quantity: i.qty })),
          fulfillment,
          contact_email: user.email ?? undefined,
          contact_phone: phone || undefined,
          notes: notes || undefined,
          promoter_code: promoterCode || undefined,
          environment: getStripeEnvironment(),
          return_url: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      setClientSecret(result.clientSecret);
      setOrderId(result.orderId);
      clear();
    } catch (e: any) {
      setError(e?.message ?? "Could not start checkout");
      toast.error(e?.message ?? "Could not start checkout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Checkout</h1>
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-foreground/80">
          🛡️ <strong>Spott Buyer Protection.</strong> Your payment is held in escrow and is only released to the seller after you confirm the item was received as described. Delivery, pickup and product questions are handled directly between you and the seller. If something goes wrong, open a dispute from your orders page within 7 days of delivery and our team will step in.
        </div>


        {!clientSecret ? (
          <div className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Fulfillment</div>
              <div className="grid grid-cols-2 gap-2">
                {(["pickup", "delivery"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFulfillment(opt)}
                    className={`rounded-md border p-3 text-sm capitalize ${
                      fulfillment === opt ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contact phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(416) 555-1234"
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Order notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                placeholder="Pickup time, gift wrap, etc."
              />
            </div>
            {promoterCode && (
              <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                Promoter referral applied: <code className="font-mono">{promoterCode}</code>
              </div>
            )}
            {error && <div className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</div>}
            <button
              onClick={start}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue to payment
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Order ref: <code className="font-mono">{orderId?.slice(0, 8)}</code>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
