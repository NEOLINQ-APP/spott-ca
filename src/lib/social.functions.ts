import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const deleteBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ business_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr || !biz) throw new Error("Business not found");
    if (biz.owner_id !== userId) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) throw new Error("Not authorized");
    }
    // Best-effort: remove storage files and child rows via service role.
    const { data: photos } = await supabaseAdmin
      .from("business_photos")
      .select("storage_path")
      .eq("business_id", data.business_id);
    const paths = (photos ?? []).map((p: any) => p.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from("business-photos").remove(paths).catch(() => {});
    }
    await supabaseAdmin.from("business_photos").delete().eq("business_id", data.business_id);
    await supabaseAdmin.from("specials").delete().eq("business_id", data.business_id);
    await supabaseAdmin.from("business_follows").delete().eq("business_id", data.business_id);
    await supabaseAdmin.from("business_views").delete().eq("business_id", data.business_id);
    await supabaseAdmin.from("reviews").delete().eq("business_id", data.business_id);
    const { error } = await supabaseAdmin.from("businesses").delete().eq("id", data.business_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ business_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("business_follows")
      .select("id")
      .eq("user_id", userId)
      .eq("business_id", data.business_id)
      .maybeSingle();
    if (existing) {
      await supabase.from("business_follows").delete().eq("id", existing.id);
      return { following: false };
    }
    const { error } = await supabase
      .from("business_follows")
      .insert({ user_id: userId, business_id: data.business_id });
    if (error) throw new Error(error.message);
    return { following: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ review_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("review_likes")
      .select("id")
      .eq("user_id", userId)
      .eq("review_id", data.review_id)
      .maybeSingle();
    if (existing) {
      await supabase.from("review_likes").delete().eq("id", existing.id);
      return { liked: false };
    }
    const { error } = await supabase
      .from("review_likes")
      .insert({ user_id: userId, review_id: data.review_id });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const trackView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ business_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("business_views").insert({ user_id: userId, business_id: data.business_id });
    return { ok: true };
  });

export const replyToReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ review_id: z.string().uuid(), reply: z.string().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("reviews")
      .update({ owner_reply: data.reply, owner_reply_at: new Date().toISOString() })
      .eq("id", data.review_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCustomerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [myReviews, follows, views, likes] = await Promise.all([
      supabase
        .from("reviews")
        .select("id,rating,body,created_at,business_id,businesses(name,slug,city,province)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("business_follows")
        .select("created_at,businesses(id,name,slug,city,province,hero_image_url)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("business_views")
        .select("viewed_at,businesses(id,name,slug,city,province)")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(20),
      supabase
        .from("review_likes")
        .select("created_at,reviews(id,body,rating,business_id,businesses(name,slug))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      reviews: myReviews.data ?? [],
      follows: follows.data ?? [],
      views: views.data ?? [],
      likes: likes.data ?? [],
    };
  });

export const getOwnerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id,name,slug,status,is_claimed,city,province,address,postal_code,phone,email,website,hero_image_url,owner_id,created_at,referral_code,ordering_links,featured_highlights_until")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    const ids = (businesses ?? []).map((b) => b.id);
    let reviews: any[] = [];
    let followCounts: Record<string, number> = {};
    if (ids.length) {
      const [{ data: rData }, { data: fData }] = await Promise.all([
        supabase
          .from("reviews")
          .select("id,rating,body,created_at,owner_reply,owner_reply_at,business_id,user_id,profiles(display_name,avatar_url)")
          .in("business_id", ids)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("business_follows").select("business_id").in("business_id", ids),
      ]);
      reviews = rData ?? [];
      for (const row of fData ?? []) {
        followCounts[row.business_id] = (followCounts[row.business_id] ?? 0) + 1;
      }
    }
    return { businesses: businesses ?? [], reviews, followCounts };
  });
