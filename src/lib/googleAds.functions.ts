import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildGoogleAdsAuthUrl } from "@/lib/googleAdsOAuth.server";

// Real caller-owned-business lookup, shared by both functions below --
// only a business's actual owner can start or check a Google Ads
// connection for it, never an arbitrary logged-in user passing any id.
async function requireOwnedBusiness(supabase: any, userId: string, businessId: string) {
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz || biz.owner_id !== userId) throw new Error("Not authorized for this business");
  return biz;
}

export const startGoogleAdsConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ businessId: z.string().uuid(), origin: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireOwnedBusiness(context.supabase, context.userId, data.businessId);
    return { url: buildGoogleAdsAuthUrl(data.origin, data.businessId) };
  });

export const getGoogleAdsConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ businessId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireOwnedBusiness(context.supabase, context.userId, data.businessId);
    const { data: row } = await (context.supabase as any).from("google_ads_connections")
      .select("connected_at, google_ads_customer_id")
      .eq("business_id", data.businessId)
      .maybeSingle();
    return { connected: !!row, connectedAt: (row?.connected_at as string | undefined) ?? null };
  });
