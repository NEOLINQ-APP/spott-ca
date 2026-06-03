import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/contexts/CartContext";
import { SiteHeader } from "@/components/site-header";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Your cart — Spott.ca" }] }),
});

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
}

function CartPage() {
  const { items, remove, clear, subtotalCents } = useCart();
  const navigate = useNavigate();
  const currency = items[0]?.currency ?? "CAD";

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Your cart</h1>
        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Your cart is empty.</p>
            <Link to="/marketplace" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Browse the marketplace →
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 p-4">
                  {it.image && <img src={it.image} alt={it.title} className="h-16 w-16 rounded-md object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{it.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmt(it.price_cents, it.currency)} × {it.qty}
                    </div>
                  </div>
                  <div className="font-semibold">{fmt(it.price_cents * it.qty, it.currency)}</div>
                  <button
                    onClick={() => remove(it.id)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Subtotal</div>
                <div className="text-2xl font-semibold">{fmt(subtotalCents, currency)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Taxes and shipping calculated at checkout.</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate({ to: "/checkout" })} size="lg" className="gap-2">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Button>
                <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">
                  Clear cart
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              🛡️ <strong className="text-foreground">Buyer protection:</strong> Spott holds your payment in escrow and only releases it to the seller after you confirm the item was received as described. You arrange delivery or pickup directly with the seller.
            </p>
          </>
        )}
      </div>
    </>
  );
}
