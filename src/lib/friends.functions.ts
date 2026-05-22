import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const toggleFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ friend_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.friend_id === userId) throw new Error("Can't add yourself");
    const { data: existing } = await supabase
      .from("user_friends")
      .select("id")
      .eq("user_id", userId)
      .eq("friend_id", data.friend_id)
      .maybeSingle();
    if (existing) {
      await supabase.from("user_friends").delete().eq("id", existing.id);
      return { friend: false };
    }
    const { error } = await supabase
      .from("user_friends")
      .insert({ user_id: userId, friend_id: data.friend_id });
    if (error) throw new Error(error.message);
    return { friend: true };
  });

export const listMyFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_friends")
      .select("friend_id,created_at,profiles!user_friends_friend_id_fkey(display_name,avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    // Fallback: foreign-key alias may not exist; do a manual join.
    if (!data) {
      const { data: rows } = await supabase
        .from("user_friends")
        .select("friend_id,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const ids = (rows ?? []).map((r) => r.friend_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (rows ?? []).map((r) => ({
        friend_id: r.friend_id,
        created_at: r.created_at,
        profile: map.get(r.friend_id) ?? null,
      }));
    }
    return (data ?? []).map((r: any) => ({
      friend_id: r.friend_id,
      created_at: r.created_at,
      profile: r.profiles ?? null,
    }));
  });

export const getSuggestedBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Pull signals: recent searches + saved searches + recent views + follows.
    const [{ data: searches }, { data: saved }, { data: views }, { data: follows }] = await Promise.all([
      supabase
        .from("search_history")
        .select("query,city,category_slug,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("saved_searches")
        .select("query,city,category_slug")
        .eq("user_id", userId),
      supabase
        .from("business_views")
        .select("business_id")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(50),
      supabase
        .from("business_follows")
        .select("business_id")
        .eq("user_id", userId),
    ]);

    const cities = new Set<string>();
    const categorySlugs = new Set<string>();
    const queries = new Set<string>();
    for (const s of [...(searches ?? []), ...(saved ?? [])]) {
      if (s.city) cities.add(s.city);
      if (s.category_slug) categorySlugs.add(s.category_slug);
      if (s.query) queries.add(String(s.query).toLowerCase());
    }

    const excludeIds = new Set<string>([
      ...(views ?? []).map((v) => v.business_id as string),
      ...(follows ?? []).map((f) => f.business_id as string),
    ]);

    // Resolve category slugs → ids.
    let categoryIds: string[] = [];
    if (categorySlugs.size) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id,slug")
        .in("slug", Array.from(categorySlugs));
      categoryIds = (cats ?? []).map((c) => c.id);
    }

    // Build candidate query.
    let q = supabase
      .from("businesses")
      .select("id,slug,name,city,province,description,hero_image_url,category_id,keywords")
      .eq("status", "approved")
      .limit(40);

    // Prefer city match if we have one; otherwise any approved listing.
    if (cities.size) {
      q = q.in("city", Array.from(cities));
    }
    const { data: cityMatches } = await q;

    // Also pull category matches (across any city).
    let catMatches: any[] = [];
    if (categoryIds.length) {
      const { data } = await supabase
        .from("businesses")
        .select("id,slug,name,city,province,description,hero_image_url,category_id,keywords")
        .eq("status", "approved")
        .in("category_id", categoryIds)
        .limit(40);
      catMatches = data ?? [];
    }

    // Score and dedupe.
    type Row = any;
    const seen = new Map<string, { row: Row; score: number; reasons: string[] }>();
    const consider = (row: Row, baseScore: number, reason: string) => {
      if (excludeIds.has(row.id)) return;
      const cur = seen.get(row.id);
      if (cur) {
        cur.score += baseScore;
        if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
      } else {
        seen.set(row.id, { row, score: baseScore, reasons: [reason] });
      }
    };
    for (const row of cityMatches ?? []) consider(row, 2, `Near ${row.city}`);
    for (const row of catMatches) consider(row, 3, "Matches your interests");
    // Keyword/query boost.
    for (const { row } of seen.values()) {
      const hay = `${row.name} ${row.description ?? ""} ${(row.keywords ?? []).join(" ")}`.toLowerCase();
      for (const qStr of queries) {
        if (qStr.length >= 3 && hay.includes(qStr)) {
          const entry = seen.get(row.id)!;
          entry.score += 4;
          if (!entry.reasons.includes(`Matches "${qStr}"`)) entry.reasons.push(`Matches "${qStr}"`);
        }
      }
    }

    let suggestions = Array.from(seen.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ row, reasons }) => ({ ...row, reasons }));

    // Cold start: no signals → show recently added approved listings.
    if (suggestions.length === 0) {
      const { data } = await supabase
        .from("businesses")
        .select("id,slug,name,city,province,description,hero_image_url")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(8);
      suggestions = (data ?? [])
        .filter((b) => !excludeIds.has(b.id))
        .map((b) => ({ ...b, reasons: ["New on Spott"] }));
    }

    return { suggestions };
  });
