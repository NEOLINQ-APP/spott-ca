import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

function daysAgoISO(d: number) {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString();
}

/**
 * Weekly Growth KPIs for the 90-day path to 100K listings.
 *  1. Weekly Active Listers (users who posted ≥1 listing in last 7d)
 *  2. Listing Velocity (new listings/day, 7d rolling avg)
 *  3. Activation Rate (signup → first listing within 7d)
 *  4. K-Factor (referrals initiated per active user × referral conversion rate)
 *  5. Time-to-First-Contact (median hours from listing post to first mp_message)
 */
export const getGrowthKPIs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const now = Date.now();
    const d7 = daysAgoISO(7);
    const d30 = daysAgoISO(30);

    const [
      { data: recentListings },
      { count: totalListings },
      { data: recentSignups },
      { data: refs },
      { data: threadStart },
    ] = await Promise.all([
      supabaseAdmin.from("marketplace_listings").select("user_id, created_at").gte("created_at", d30),
      supabaseAdmin.from("marketplace_listings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id, created_at").gte("created_at", d30),
      supabaseAdmin.from("user_referrals").select("id,status,created_at,referrer_user_id").gte("created_at", d30),
      supabaseAdmin.from("mp_threads").select("listing_id, created_at").gte("created_at", d30),
    ]);

    const listings = recentListings ?? [];
    const listingsLast7 = listings.filter((l) => new Date(l.created_at).getTime() >= now - 7 * 86400_000);

    // 1. Weekly Active Listers
    const activeListers7d = new Set(listingsLast7.map((l) => l.user_id)).size;

    // 2. Listing velocity — 7d avg per day
    const velocity7d = listingsLast7.length / 7;

    // 3. Activation Rate — signups in last 30d whose first listing arrived within 7d
    const signups = recentSignups ?? [];
    const listingByUserFirst: Record<string, number> = {};
    for (const l of listings) {
      const t = new Date(l.created_at).getTime();
      if (!listingByUserFirst[l.user_id] || t < listingByUserFirst[l.user_id]) {
        listingByUserFirst[l.user_id] = t;
      }
    }
    let activated = 0;
    for (const s of signups) {
      const first = listingByUserFirst[s.id];
      if (first && first - new Date(s.created_at).getTime() <= 7 * 86400_000) activated++;
    }
    const activationRate = signups.length ? activated / signups.length : 0;

    // 4. K-Factor — referrals per active user × conversion
    const referralRows = refs ?? [];
    const invitedByActive = referralRows.length;
    const qualifiedReferrals = referralRows.filter((r) => r.status === "qualified" || r.status === "rewarded").length;
    const activeUsers30d = new Set(listings.map((l) => l.user_id)).size || 1;
    const invitesPerActive = invitedByActive / activeUsers30d;
    const convRate = referralRows.length ? qualifiedReferrals / referralRows.length : 0;
    const kFactor = invitesPerActive * convRate;

    // 5. Time-to-first-contact — median hours (listing → first mp_thread)
    const firstThreadByListing: Record<string, number> = {};
    for (const t of threadStart ?? []) {
      const ts = new Date(t.created_at).getTime();
      if (!firstThreadByListing[t.listing_id] || ts < firstThreadByListing[t.listing_id]) {
        firstThreadByListing[t.listing_id] = ts;
      }
    }
    const deltas: number[] = [];
    const { data: listingsWithId } = await supabaseAdmin
      .from("marketplace_listings")
      .select("id, created_at")
      .gte("created_at", d30);
    for (const l of listingsWithId ?? []) {
      const t = firstThreadByListing[l.id];
      if (t) deltas.push((t - new Date(l.created_at).getTime()) / 3600_000);
    }
    deltas.sort((a, b) => a - b);
    const medianHours = deltas.length ? deltas[Math.floor(deltas.length / 2)] : null;

    // Trend series (last 30d, daily new listings)
    const dailyBuckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyBuckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const l of listings) {
      const k = l.created_at.slice(0, 10);
      if (dailyBuckets[k] !== undefined) dailyBuckets[k]++;
    }
    const series = Object.entries(dailyBuckets).map(([date, count]) => ({ date, count }));

    return {
      totalListings: totalListings ?? 0,
      target: 100_000,
      kpis: {
        activeListers7d,
        velocity7d,
        activationRate,
        kFactor,
        medianHoursToFirstContact: medianHours,
      },
      series,
      referrals: {
        totalLast30d: referralRows.length,
        qualifiedLast30d: qualifiedReferrals,
      },
    };
  });
