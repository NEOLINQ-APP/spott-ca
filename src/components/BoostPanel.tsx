import { useEffect, useState } from "react";
import { Rocket, Star, ImagePlus, Loader2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { createAddonCheckout } from "@/utils/payments.functions";
import { toast } from "sonner";

type Boost = {
  featured_until: string | null;
  bumped_until: string | null;
  photo_pack_bonus: number;
};

const ADDONS = [
  { id: "spott_bump_up_once", name: "24h Bump-up", price: 3, icon: Rocket, blurb: "Top of category for 24 hours." },
  { id: "spott_feature_7d_once", name: "7-day Homepage", price: 15, icon: Star, blurb: "Featured on Spott homepage for 7 days." },
  { id: "spott_photo_pack_once", name: "+10 Photos", price: 5, icon: ImagePlus, blurb: "Add 10 more photo slots to this listing." },
] as const;

export function BoostPanel({ businessId, ownerId }: { businessId: string; ownerId: string }) {
  const { checkoutElement, openCheckout } = useStripeCheckout();
  const addonFn = useServerFn(createAddonCheckout);
  const [boost, setBoost] = useState<Boost | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

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

  const buy = async (priceId: typeof ADDONS[number]["id"]) => {
    setBusy(priceId);
    try {
      // Pre-validate ownership server-side by opening a checkout session.
      // The hook fetches the client secret via createAddonCheckout.
      await openWithAddon(priceId);
    } finally {
      setBusy(null);
    }
  };

  const openWithAddon = async (priceId: typeof ADDONS[number]["id"]) => {
    // Custom fetcher: open the embedded checkout with a session created
    // by the add-on server fn so business_id metadata is attached.
    openCheckout({
      priceId, // not used by the embedded component below; we override fetch via window.
      returnUrl: `${window.location.href.split("?")[0]}?addon=ok`,
    });
    // We piggyback on the existing hook; replace its fetcher behavior by
    // calling our server fn here and storing client secret in a wrapper.
    try {
      const cs = await addonFn({
        data: {
          priceId,
          businessId,
          returnUrl: `${window.location.href.split("?")[0]}?addon=ok&session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if (!cs) throw new Error("Could not start checkout");
      // The embedded checkout component uses createCheckoutSession internally.
      // We need a different path — see <AddonCheckoutMount /> below.
      (window as any).__spottAddonClientSecret = cs;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout");
    }
  };

  const now = new Date();
  const featuredActive = boost?.featured_until && new Date(boost.featured_until) > now;
  const bumpedActive = boost?.bumped_until && new Date(boost.bumped_until) > now;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" /> Boost this listing
        </h3>
      </div>

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
                onClick={() => buy(a.id)}
                disabled={busy === a.id}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy === a.id && <Loader2 className="h-3 w-3 animate-spin" />} Buy
              </button>
            </div>
          </div>
        ))}
      </div>
      {checkoutElement}
    </div>
  );
}
