import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchOsm, osmToStaged } from "./osm.server";
import { fetchGooglePlaces, placeToStaged } from "./google-places.server";
import { findDuplicate } from "./dedup.server";
import { enrichBusiness } from "./enrich.server";
import { slugify } from "./normalize";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

// ---------- Run an import source: fetch OSM -> stage rows ----------
export const runImportSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sourceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: src, error } = await supabaseAdmin
      .from("import_sources")
      .select("*")
      .eq("id", data.sourceId)
      .single();
    if (error || !src) throw new Error("Source not found");

    let staged: any[] = [];
    let fetched = 0;
    const cat = src.category_slug ?? "professional-services";

    try {
      if (src.source === "google_places") {
        const q = src.query ?? `${cat.replace(/-/g, " ")} in ${src.city}, ${src.province}`;
        const places = await fetchGooglePlaces(q, 60);
        fetched = places.length;
        staged = places
          .map((p) => placeToStaged(p, src.city, src.province, cat))
          .filter((x): x is NonNullable<typeof x> => !!x);
      } else {
        if (!src.osm_filter) throw new Error("OSM source missing osm_filter");
        const elements = await fetchOsm(src.city, src.osm_filter, 200);
        fetched = elements.length;
        staged = elements
          .map((el) => osmToStaged(el, src.city, src.province, cat))
          .filter((x): x is NonNullable<typeof x> => !!x);
      }
    } catch (e) {
      return { fetched: 0, staged: 0, inserted: 0, error: (e as Error).message };
    }

    let inserted = 0;
    for (const row of staged) {
      const { error: insErr } = await supabaseAdmin
        .from("imported_businesses")
        .upsert(row, { onConflict: "source,source_ref", ignoreDuplicates: true });
      if (!insErr) inserted++;
    }

    await supabaseAdmin
      .from("import_sources")
      .update({ last_run_at: new Date().toISOString(), last_imported_count: inserted })
      .eq("id", src.id);

    return { fetched, staged: staged.length, inserted };
  });

// ---------- Enrich + dedup a batch of pending staged rows ----------
export const enrichPendingBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      limit: z.number().min(1).max(200).default(10),
      categorySlug: z.string().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("imported_businesses")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(data.limit);
    if (data.categorySlug) q = q.eq("category_slug", data.categorySlug);
    const { data: pending } = await q;

    if (!pending || pending.length === 0) return { processed: 0, autoApproved: 0 };

    let processed = 0;
    let autoApproved = 0;

    for (const row of pending) {
      // 1) dedup
      const dup = await findDuplicate({
        phone_normalized: row.phone_normalized,
        website_host: row.website_host,
        name: row.name,
        latitude: row.latitude != null ? Number(row.latitude) : null,
        longitude: row.longitude != null ? Number(row.longitude) : null,
        city: row.city,
      });

      if (dup) {
        await supabaseAdmin
          .from("imported_businesses")
          .update({
            status: "duplicate",
            dedup_match_business_id: dup.businessId,
            dedup_reason: dup.reason,
          })
          .eq("id", row.id);
        processed++;
        continue;
      }

      // 2) enrich
      let enriched;
      try {
        enriched = await enrichBusiness({
          name: row.name,
          address: row.address,
          city: row.city,
          province: row.province,
          phone: row.phone,
          website: row.website,
          keywords: row.keywords ?? [],
          category_hint: row.category_slug ?? "",
        });
      } catch (e) {
        console.error("enrich failed", row.id, (e as Error).message);
        continue;
      }

      // 3) resolve category id
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", enriched.category_slug)
        .single();

      // 4) base confidence + completeness penalty
      let conf = enriched.confidence;
      if (!row.phone_normalized) conf -= 0.1;
      if (!row.website_host) conf -= 0.1;
      if (!row.address) conf -= 0.1;
      conf = Math.max(0, Math.min(1, conf));

      const mergedKeywords = Array.from(
        new Set([...(row.keywords ?? []), ...enriched.keywords]),
      ).slice(0, 15);
      const update: any = {
        ai_description: enriched.description,
        keywords: mergedKeywords,
        category_slug: enriched.category_slug,
        category_id: cat?.id ?? null,
        confidence: conf,
      };

      // 5) auto-promote if confidence >= 0.8
      if (conf >= 0.8 && cat?.id) {
        const { data: biz, error: bizErr } = await supabaseAdmin
          .from("businesses")
          .insert({
            name: row.name,
            slug: slugify(row.name),
            description: enriched.description,
            category_id: cat.id,
            city: row.city,
            province: row.province,
            address: row.address,
            phone: row.phone,
            phone_normalized: row.phone_normalized,
            website: row.website,
            website_host: row.website_host,
            email: row.email,
            latitude: row.latitude,
            longitude: row.longitude,
            keywords: mergedKeywords,
            source: row.source,
            source_ref: row.source_ref,
            import_confidence: conf,
            status: "approved",
            is_claimed: false,
          })
          .select("id")
          .single();

        if (!bizErr && biz) {
          update.status = "promoted";
          update.promoted_business_id = biz.id;
          autoApproved++;
        } else {
          update.status = "approved"; // queued for admin review
          update.notes = bizErr?.message ?? null;
        }
      } else {
        update.status = "approved"; // means "ready for admin review"
      }

      await supabaseAdmin.from("imported_businesses").update(update).eq("id", row.id);
      processed++;
    }

    return { processed, autoApproved };
  });

// ---------- Admin actions on staged rows ----------
export const reviewStaged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["promote", "reject"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.action === "reject") {
      await supabaseAdmin.from("imported_businesses").update({ status: "rejected" }).eq("id", data.id);
      return { ok: true };
    }

    const { data: row, error } = await supabaseAdmin
      .from("imported_businesses")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Staged row not found");
    if (!row.category_id) throw new Error("Run enrichment first");

    const { data: biz, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: row.name,
        slug: slugify(row.name),
        description: row.ai_description,
        category_id: row.category_id,
        city: row.city,
        province: row.province,
        address: row.address,
        phone: row.phone,
        phone_normalized: row.phone_normalized,
        website: row.website,
        website_host: row.website_host,
        email: row.email,
        latitude: row.latitude,
        longitude: row.longitude,
        keywords: row.keywords ?? [],
        source: row.source,
        source_ref: row.source_ref,
        import_confidence: row.confidence,
        status: "approved",
        is_claimed: false,
      })
      .select("id")
      .single();
    if (bizErr || !biz) throw new Error(bizErr?.message ?? "promotion failed");

    await supabaseAdmin
      .from("imported_businesses")
      .update({ status: "promoted", promoted_business_id: biz.id })
      .eq("id", row.id);
    return { ok: true, businessId: biz.id };
  });

// ---------- Read endpoints for admin UI ----------
export const listImportSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("import_sources")
      .select("*")
      .order("province")
      .order("city")
      .order("category_slug");
    return { sources: data ?? [] };
  });

export const listStaged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ status: z.string().default("approved"), limit: z.number().default(50) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("imported_businesses")
      .select("id,name,city,province,address,phone,website,category_slug,confidence,status,dedup_reason,ai_description,created_at")
      .eq("status", data.status)
      .order("confidence", { ascending: false })
      .limit(data.limit);
    return { rows: rows ?? [] };
  });

export const ingestStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const counts: Record<string, number> = {};
    for (const s of ["pending", "approved", "promoted", "duplicate", "rejected"]) {
      const { count } = await supabaseAdmin
        .from("imported_businesses")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    }
    return { counts };
  });
