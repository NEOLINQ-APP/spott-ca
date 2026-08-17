// Public cron endpoint. Bypasses edge auth via /api/public/*.
// Verifies the Supabase anon/publishable key in the `apikey` header before
// doing any work, then runs ONE ingest tick: pick the next enabled source
// (oldest last_run_at first), fetch from OSM, stage rows, then enrich up to
// 20 pending rows. Designed to be called every 10 minutes by pg_cron.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchOsm, osmToStaged } from "@/lib/ingest/osm.server";
import { fetchGooglePlaces, placeToStaged } from "@/lib/ingest/google-places.server";
import { findDuplicate } from "@/lib/ingest/dedup.server";
import { enrichBusiness } from "@/lib/ingest/enrich.server";
import { slugify } from "@/lib/ingest/normalize";
import { fetchAndStoreGooglePhoto, backfillGooglePhotosBatch } from "@/lib/ingest/google-photo.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function runOneSource() {
  const { data: src } = await supabaseAdmin
    .from("import_sources")
    .select("*")
    .eq("enabled", true)
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();
  if (!src) return { ran: null, inserted: 0 };
  const cat = src.category_slug ?? "professional-services";

  let inserted = 0;
  let fetchError: string | null = null;
  let staged: any[] = [];
  try {
    if (src.source === "google_places") {
      const q = src.query ?? `${cat.replace(/-/g, " ")} in ${src.city}, ${src.province}`;
      const places = await fetchGooglePlaces(q, 60);
      staged = places
        .map((p) => placeToStaged(p, src.city, src.province, cat))
        .filter((x): x is NonNullable<typeof x> => !!x);
    } else if (src.osm_filter) {
      const elements = await fetchOsm(src.city, src.osm_filter, 150);
      staged = elements
        .map((el) => osmToStaged(el, src.city, src.province, cat))
        .filter((x): x is NonNullable<typeof x> => !!x);
    }
  } catch (e) {
    fetchError = (e as Error).message;
    console.error("ingest-tick fetch failed", src.id, fetchError);
  }

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

  return {
    ran: { id: src.id, city: src.city, category: src.category_slug },
    inserted,
    staged: staged.length,
    fetchError,
  };
}

async function enrichBatch(limit = 20) {
  const { data: pending } = await supabaseAdmin
    .from("imported_businesses")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
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
        // Fetch a real cover photo from Google Places for this new business
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

// Runs one full ingest tick and returns its result. Used to be fired
// without awaiting (relying on Cloudflare Workers' waitUntil to keep the
// task alive after the response was sent) — but this app runs on Netlify,
// where a serverless function's execution freezes as soon as it returns a
// response, same as plain AWS Lambda. That silently killed every "fire and
// forget" tick before it ever got to import anything — confirmed via a
// real run: 20 requests all returned 202 "queued", but zero businesses and
// zero updated last_run_at timestamps resulted. Now awaited directly by
// the handler instead; the response takes longer (real network + AI calls
// in the request path), but it actually completes.
async function runIngestTickBackground() {
  const started = Date.now();
  try {
    const source = await runOneSource();
    const enrich = await enrichBatch(20);
    let photoBackfill = { processed: 0, updated: 0 };
    try {
      photoBackfill = await backfillGooglePhotosBatch(15);
    } catch (e) {
      console.error("photo backfill failed", (e as Error).message);
    }
    const result = {
      ms: Date.now() - started,
      source: source.ran?.id ?? null,
      inserted: source.inserted,
      enrich,
      photoBackfill,
    };
    console.log("ingest-tick done", result);
    return result;
  } catch (e) {
    console.error("ingest-tick failed", (e as Error).message);
    return { error: (e as Error).message };
  }
}

export const Route = createFileRoute("/api/public/hooks/ingest-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("x-cron-secret") ??
          request.headers.get("apikey") ??
          request.headers.get("x-api-key");
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const result = await runIngestTickBackground();
        return json({ ok: true, result });
      },
    },
  },
});
