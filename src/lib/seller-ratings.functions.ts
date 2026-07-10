import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mark a marketplace listing as sold. Optionally records the buyer so both sides
 * can rate each other. Only the listing owner (seller) can call this.
 */
export const markListingSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      listing_id: z.string().uuid(),
      buyer_id: z.string().uuid().nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: listing, error } = await supabase
      .from("marketplace_listings")
      .update({
        status: "sold",
        sold_at: new Date().toISOString(),
        sold_to_user_id: data.buyer_id ?? null,
      })
      .eq("id", data.listing_id)
      .eq("user_id", userId)
      .select("id, title")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing not found or you are not the owner");

    // Best-effort notification to the buyer prompting them to leave a rating.
    if (data.buyer_id) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: buyer } = await supabaseAdmin.auth.admin.getUserById(data.buyer_id);
        const email = buyer?.user?.email;
        if (email) {
          const { notifyRateTransaction } = await import("./notifications.server");
          await notifyRateTransaction(email, listing.title, listing.id);
        }
      } catch (e) {
        console.warn("[markListingSold] notify buyer failed:", e);
      }
    }
    return { ok: true, id: listing.id };
  });

/** List thread participants (buyers) for a listing — used to pick who was sold to. */
export const listListingBuyers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ listing_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("mp_threads")
      .select("buyer_id, seller_id, last_message_at, profiles:profiles!mp_threads_buyer_id_fkey(display_name, avatar_url)")
      .eq("listing_id", data.listing_id)
      .eq("seller_id", userId)
      .order("last_message_at", { ascending: false });
    return {
      buyers: (rows ?? []).map((r: any) => ({
        buyer_id: r.buyer_id,
        display_name: r.profiles?.display_name ?? "Buyer",
        avatar_url: r.profiles?.avatar_url ?? null,
        last_message_at: r.last_message_at,
      })),
    };
  });

/** Create or update a rating from rater → ratee for a given listing. */
export const rateTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      listing_id: z.string().uuid(),
      ratee_id: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
      role: z.enum(["buyer", "seller"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.ratee_id) throw new Error("You can't rate yourself");

    const { error } = await supabase
      .from("seller_ratings")
      .upsert(
        {
          listing_id: data.listing_id,
          rater_id: userId,
          ratee_id: data.ratee_id,
          rating: data.rating,
          comment: data.comment ?? null,
          role: data.role,
        },
        { onConflict: "rater_id,ratee_id,listing_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Aggregate rating summary for a user profile. Publicly readable. */
export const getUserRatingSummary = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("seller_ratings")
      .select("rating")
      .eq("ratee_id", data.user_id);
    const list = rows ?? [];
    const count = list.length;
    const avg = count > 0 ? list.reduce((s, r: any) => s + r.rating, 0) / count : 0;
    return { count, average: Math.round(avg * 10) / 10 };
  });
