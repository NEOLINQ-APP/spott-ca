import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Rocket, Star, ImagePlus, Loader2, Check, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createAddonCheckout } from "@/utils/payments.functions";
import { toast } from "sonner";

type Boost = {
  featured_until: string | null;
  bumped_until: string | null;
  photo_pack_bonus: number;
};

type AddonId = "spott_bump_up_once" | "spott_feature_7d_once" | "spott_photo_pack_once";

const ADDONS: { id: AddonId; name: string; price: number; icon: any; blurb: string }[] = [
  { id: "spott_bump_up_once", name: "24h Bump-up", price: 3, icon: Rocket, blurb: "Top of category for 24 hours." },
  { id: "spott_feature_7d_once", name: "7-day Homepage", price: 15, icon: Star, blurb: "Featured on Spott homepage for 7 days." },
  { id: "spott_photo_pack_once", name: "+10 Photos", price: 5, icon: ImagePlus, blurb: "Add 10 more photo slots to this listing." },
];

export function BoostPanel({ businessId, ownerId }: { businessId: string; ownerId: string }) {
  const addonFn = useServerFn(createAddonCheckout);
  const [boost, setBoost] = useState<Boost | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [openId, setOpenId] = useState<AddonId | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("featured_until,bumped_until,photo_pack_bonus")
      .eq("id", businessId)
      .maybeSingle();
    setBoost((data as Boost) ?? null);
  };
  useEffect(() => { load(); }, [businessId]);

  if (me !== ownerId) return null;

  const fetchClientSecret = async (priceId: AddonId): Promise<string> => {
    const cs = await addonFn({
      data: {
        priceId,
        businessId,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if (!cs) throw new Error("Could not start checkout");
    return cs;
  };

  const now = new Date();
  const featuredActive = boost?.featured_until && new Date(boost.featured_until) > now;
  const bumpedActive = boost?.bumped_until && new Date(boost.bumped_until) > now;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2">
        <Rocket className="h-4 w-4 text-primary" /> Boost this listing
      </h3>

      {(featuredActive || bumpedActive || (boost?.photo_pack_bonus ?? 0) > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {bumpedActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
              <Check className="h-3 w-3" /> Bumped until {new Date(boost!.bumped_until!).toLocaleString()}
            </span>
          )}
          {featuredActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
              <Check className="h-3 w-3" /> Featured until {new Date(boost!.featured_until!).toLocaleDateString()}
            </span>
          )}
          {(boost?.photo_pack_bonus ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
              <Check className="h-3 w-3" /> +{boost!.photo_pack_bonus} extra photo slots
            </span>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {ADDONS.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><a.icon className="h-4 w-4" /> {a.name}</div>
            <p className="mt-1 text-xs text-muted-foreground">{a.blurb}</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-xl font-semibold">${a.price}</span>
              <button
                onClick={() => setOpenId(a.id)}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Buy
              </button>
            </div>
          </div>
        ))}
      </div>

      {openId && (
        <Modal onClose={() => { setOpenId(null); load(); }}>
          <AddonCheckout priceId={openId} fetcher={() => fetchClientSecret(openId)} />
        </Modal>
      )}
    </div>
  );
}

function AddonCheckout({ priceId, fetcher }: { priceId: AddonId; fetcher: () => Promise<string> }) {
  // priceId in the key forces a fresh provider per addon (cannot reuse clientSecret).
  return (
    <div id={`checkout-${priceId}`} key={priceId}>
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: fetcher }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full bg-secondary p-1.5 hover:bg-secondary/80">
          <X className="h-4 w-4" />
        </button>
        <div className="max-h-[85vh] overflow-y-auto p-4 pt-12">{children}</div>
      </div>
    </div>
  );
}
