// Shared enrichment loop: pull pending staged rows, dedup, enrich with AI,
// auto-promote if confidence is high, and fetch a Google Places cover photo
// for newly promoted businesses. Used by both the cron tick and the admin
// drain endpoint.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findDuplicate } from "./dedup.server";
import { enrichBusiness } from "./enrich.server";
import { slugify } from "./normalize";
import { fetchAndStoreGooglePhoto } from "./google-photo.server";

export type EnrichBatchOptions = {
  limit?: number;
  categorySlug?: string | null;
};

export async function enrichBatch(opts: EnrichBatchOptions = {}) {
  const limit = Math.max(1, Math.min(200, opts.limit ?? 20));

  let q = supabaseAdmin
    .from("imported_businesses")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (opts.categorySlug) q = q.eq("category_slug", opts.categorySlug);

  const { data: pending } = await q;
  if (!pending || pending.length === 0) return { processed: 0, autoApproved: 0 };

  let processed = 0;
  let autoApproved = 0;

  for (const row of pending) {
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

    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("slug", enriched.category_slug)
      .single();

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
        try {
          await fetchAndStoreGooglePhoto(biz.id, {
            name: row.name,
            address: row.address,
            city: row.city,
            province: row.province,
          });
        } catch (e) {
          console.error("photo fetch failed", biz.id, (e as Error).message);
        }
      } else {
        update.status = "approved";
        update.notes = bizErr?.message ?? null;
      }
    } else {
      update.status = "approved";
    }

    await supabaseAdmin.from("imported_businesses").update(update).eq("id", row.id);
    processed++;
  }

  return { processed, autoApproved };
}
