import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

export const getAcquisitionOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [total, unclaimed, invited, claimed, verified, suspended] = await Promise.all([
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("claim_status", "unclaimed"),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("claim_status", "invited"),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("claim_status", "claimed"),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("claim_status", "verified"),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("claim_status", "suspended"),
    ]);

    const [sent, opened, claimStarted, claimedInvites, expired, suppressedCount] = await Promise.all([
      supabaseAdmin.from("claim_invitations").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("claim_invitations").select("id", { count: "exact", head: true }).not("opened_at", "is", null),
      supabaseAdmin.from("claim_invitations").select("id", { count: "exact", head: true }).eq("status", "claim_started"),
      supabaseAdmin.from("claim_invitations").select("id", { count: "exact", head: true }).eq("status", "claimed"),
      supabaseAdmin.from("claim_invitations").select("id", { count: "exact", head: true }).eq("status", "expired"),
      supabaseAdmin.from("suppressed_emails").select("id", { count: "exact", head: true }),
    ]);

    const { data: cityRows } = await supabaseAdmin
      .from("businesses")
      .select("city, claim_status")
      .not("city", "is", null)
      .limit(5000);
    const cityMap = new Map<string, { total: number; claimed: number }>();
    for (const row of cityRows ?? []) {
      const city = row.city as string;
      const entry = cityMap.get(city) ?? { total: 0, claimed: 0 };
      entry.total++;
      if (row.claim_status === "claimed" || row.claim_status === "verified") entry.claimed++;
      cityMap.set(city, entry);
    }
    const topCities = Array.from(cityMap.entries())
      .map(([city, v]) => ({ city, ...v, rate: v.total ? Math.round((v.claimed / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      businesses: {
        total: total.count ?? 0,
        unclaimed: unclaimed.count ?? 0,
        invited: invited.count ?? 0,
        claimed: claimed.count ?? 0,
        verified: verified.count ?? 0,
        suspended: suspended.count ?? 0,
      },
      campaign: {
        sent: sent.count ?? 0,
        opened: opened.count ?? 0,
        claimStarted: claimStarted.count ?? 0,
        claimed: claimedInvites.count ?? 0,
        expired: expired.count ?? 0,
        openRate: sent.count ? Math.round(((opened.count ?? 0) / sent.count) * 100) : 0,
        claimRate: sent.count ? Math.round(((claimedInvites.count ?? 0) / sent.count) * 100) : 0,
      },
      suppressed: suppressedCount.count ?? 0,
      topCities,
    };
  });
