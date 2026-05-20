import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { tierFromPriceId, TIER_LIMITS, type Tier } from "@/lib/entitlements";

interface SubRow {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string;
}

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    setUserId(uid);
    if (!uid) { setSub(null); setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("status,price_id,current_period_end,cancel_at_period_end,stripe_customer_id")
      .eq("user_id", uid)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub(data as SubRow | null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`subs:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const isActive = !!sub && (
    (["active", "trialing", "past_due"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date())) ||
    (sub.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end) > new Date())
  );
  const tier: Tier = isActive ? tierFromPriceId(sub.price_id) : "free";
  const limits = TIER_LIMITS[tier];

  return { loading, sub, isActive, tier, limits, reload: load };
}
