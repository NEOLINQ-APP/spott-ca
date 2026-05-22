import { useState } from "react";
import { ShoppingBag, ExternalLink, Bike, Store } from "lucide-react";

export type OrderingLinks = {
  pickup?: string;
  doordash?: string;
  ubereats?: string;
  skip?: string;
  delivery_other?: string;
};

type Props = {
  links: OrderingLinks | null | undefined;
  businessName: string;
};

const DELIVERY_OPTIONS: { key: keyof OrderingLinks; label: string; badge: string; color: string }[] = [
  { key: "doordash", label: "DoorDash", badge: "DD", color: "bg-[#ff3008] text-white" },
  { key: "ubereats", label: "Uber Eats", badge: "UE", color: "bg-black text-white" },
  { key: "skip", label: "SkipTheDishes", badge: "SK", color: "bg-[#ff8000] text-white" },
  { key: "delivery_other", label: "Other delivery", badge: "•", color: "bg-zinc-700 text-white" },
];

export function OrderingPanel({ links, businessName }: Props) {
  const l = links ?? {};
  const hasPickup = !!l.pickup;
  const deliveryItems = DELIVERY_OPTIONS.filter((o) => !!l[o.key]);
  const hasDelivery = deliveryItems.length > 0;

  const [tab, setTab] = useState<"pickup" | "delivery">(hasPickup ? "pickup" : "delivery");

  if (!hasPickup && !hasDelivery) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShoppingBag className="h-4 w-4 text-primary" /> Order online
        </div>
        <div className="text-[11px] text-muted-foreground">Live fees &amp; ETAs on partner sites</div>
      </div>

      <div className="px-5 pt-4">
        <div className="inline-flex rounded-full border border-border bg-background p-1 text-xs">
          {hasPickup && (
            <button
              type="button"
              onClick={() => setTab("pickup")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                tab === "pickup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Store className="h-3.5 w-3.5" /> Pickup
            </button>
          )}
          {hasDelivery && (
            <button
              type="button"
              onClick={() => setTab("delivery")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                tab === "delivery" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bike className="h-3.5 w-3.5" /> Delivery
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {tab === "pickup" && hasPickup && (
          <a
            href={l.pickup}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-accent/10"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
                {businessName.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="text-sm font-semibold">Order pickup direct</div>
                <div className="text-xs text-muted-foreground">From {businessName} — no service fee</div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {tab === "delivery" && hasDelivery && (
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Place order with:</div>
            {deliveryItems.map((o) => (
              <a
                key={o.key}
                href={l[o.key]}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-bold ${o.color}`}>
                    {o.badge}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{o.label}</div>
                    <div className="text-xs text-muted-foreground">See live fees &amp; ETA on {o.label}</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
