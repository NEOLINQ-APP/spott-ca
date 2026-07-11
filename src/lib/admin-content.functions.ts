import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { generateObject } from "ai";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

async function audit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    before: before as never,
    after: after as never,
    reason: reason ?? null,
  });
}

/* ---------------- MARKETPLACE LISTINGS ---------------- */

const LISTING_FIELDS = [
  "title",
  "description",
  "price_cents",
  "currency",
  "condition",
  "listing_type",
  "city",
  "province",
  "postal_code",
  "status",
  "contact_email",
  "contact_phone",
  "tags",
  "category_id",
  "is_featured",
  "is_boosted",
  "featured_until",
  "boosted_until",
  "compare_at_price_cents",
] as const;

export const adminListListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("marketplace_listings")
      .select(
        "id, user_id, title, price_cents, currency, status, city, province, is_featured, created_at, updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status) q = q.eq("status", data.status);
    if (data.search && data.search.trim()) {
      q = q.ilike("title", `%${data.search.trim()}%`);
    }
    const { data: rows, count } = await q;
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const adminGetListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: listing } = await supabaseAdmin
      .from("marketplace_listings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!listing) throw new Error("Listing not found");
    const { data: photos } = await supabaseAdmin
      .from("marketplace_listing_photos")
      .select("id, storage_path, sort_order")
      .eq("listing_id", data.id)
      .order("sort_order", { ascending: true });
    return { listing, photos: photos ?? [] };
  });

export const adminUpdateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.record(z.string(), z.unknown()),
        reason: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = {};
    for (const k of LISTING_FIELDS) {
      if (k in data.patch) patch[k] = data.patch[k];
    }
    if (Object.keys(patch).length === 0) throw new Error("No fields to update");

    const { data: before } = await supabaseAdmin
      .from("marketplace_listings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    const { data: after, error } = await supabaseAdmin
      .from("marketplace_listings")
      .update(patch as never)
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw error;

    await audit(
      context.userId,
      "admin_edit",
      "marketplace_listing",
      data.id,
      before,
      after,
      data.reason,
    );
    return { listing: after };
  });

export const adminDeleteListingPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), listing_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: photo } = await supabaseAdmin
      .from("marketplace_listing_photos")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    await supabaseAdmin.from("marketplace_listing_photos").delete().eq("id", data.id);
    if (photo?.storage_path) {
      await supabaseAdmin.storage.from("marketplace-photos").remove([photo.storage_path]);
    }
    await audit(context.userId, "admin_delete_photo", "marketplace_listing", data.listing_id, photo, null);
    return { ok: true };
  });

export const adminReorderListingPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        order: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() })),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    for (const o of data.order) {
      await supabaseAdmin
        .from("marketplace_listing_photos")
        .update({ sort_order: o.sort_order })
        .eq("id", o.id)
        .eq("listing_id", data.listing_id);
    }
    return { ok: true };
  });

/* ---------------- VEHICLES ---------------- */

const VEHICLE_FIELDS = [
  "title",
  "description",
  "vin",
  "year",
  "make",
  "model",
  "trim",
  "body_type",
  "engine",
  "transmission",
  "drivetrain",
  "fuel_type",
  "mileage_km",
  "condition",
  "price_cents",
  "currency",
  "city",
  "province",
  "postal_code",
  "status",
  "features",
  "hashtags",
  "exterior_color",
  "interior_color",
  "doors",
  "seats",
  "accident_history",
  "clean_title",
  "rebuilt_status",
  "prior_use",
  "odometer_status",
  "is_featured",
  "is_boosted",
  "featured_until",
  "boosted_until",
] as const;

export const adminListVehicles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("vehicles")
      .select(
        "id, seller_id, seller_type, year, make, model, trim, price_cents, mileage_km, status, city, province, is_featured, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status) q = q.eq("status", data.status);
    if (data.search && data.search.trim()) {
      const term = data.search.trim();
      q = q.or(
        `title.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%,vin.ilike.%${term}%`,
      );
    }
    const { data: rows, count } = await q;
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const adminGetVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!vehicle) throw new Error("Vehicle not found");
    const { data: photos } = await supabaseAdmin
      .from("vehicle_photos")
      .select("id, storage_path, sort_order")
      .eq("vehicle_id", data.id)
      .order("sort_order", { ascending: true });
    return { vehicle, photos: photos ?? [] };
  });

export const adminUpdateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.record(z.string(), z.unknown()),
        reason: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = {};
    for (const k of VEHICLE_FIELDS) {
      if (k in data.patch) patch[k] = data.patch[k];
    }
    if (Object.keys(patch).length === 0) throw new Error("No fields to update");

    const { data: before } = await supabaseAdmin
      .from("vehicles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    const { data: after, error } = await supabaseAdmin
      .from("vehicles")
      .update(patch as never)
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw error;

    await audit(context.userId, "admin_edit", "vehicle", data.id, before, after, data.reason);
    return { vehicle: after };
  });

export const adminDeleteVehiclePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), vehicle_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: photo } = await supabaseAdmin
      .from("vehicle_photos")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    await supabaseAdmin.from("vehicle_photos").delete().eq("id", data.id);
    if (photo?.storage_path) {
      await supabaseAdmin.storage.from("vehicle-photos").remove([photo.storage_path]);
    }
    await audit(context.userId, "admin_delete_photo", "vehicle", data.vehicle_id, photo, null);
    return { ok: true };
  });

export const adminReorderVehiclePhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        vehicle_id: z.string().uuid(),
        order: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() })),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    for (const o of data.order) {
      await supabaseAdmin
        .from("vehicle_photos")
        .update({ sort_order: o.sort_order })
        .eq("id", o.id)
        .eq("vehicle_id", data.vehicle_id);
    }
    return { ok: true };
  });

export const adminSignVehiclePhotoUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ paths: z.array(z.string()).max(20) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const out: Record<string, string> = {};
    for (const p of data.paths) {
      const { data: signed } = await supabaseAdmin.storage
        .from("vehicle-photos")
        .createSignedUrl(p, 3600);
      if (signed?.signedUrl) out[p] = signed.signedUrl;
    }
    return { urls: out };
  });

/* ---------------- AI IMAGE ↔ TEXT VALIDATION ---------------- */

const VisionResult = z.object({
  detected_make: z.string().nullable(),
  detected_model: z.string().nullable(),
  detected_body_type: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const ValidationInput = z.object({
  vehicle_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  image_urls: z.array(z.string().url()).min(1).max(4),
  stated_make: z.string().nullable().optional(),
  stated_model: z.string().nullable().optional(),
  stated_body_type: z.string().nullable().optional(),
  stated_title: z.string().optional(),
  stated_description: z.string().optional(),
  auto_flag: z.boolean().default(true),
});

export const validateListingImageText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ValidationInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");
    const gateway = createLovableAiGatewayProvider(key);

    const statedText = [
      data.stated_title,
      data.stated_description,
      data.stated_make && `Make: ${data.stated_make}`,
      data.stated_model && `Model: ${data.stated_model}`,
      data.stated_body_type && `Body: ${data.stated_body_type}`,
    ]
      .filter(Boolean)
      .join("\n");

    const models = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    let vision: z.infer<typeof VisionResult> | null = null;
    let lastErr: unknown = null;
    for (const m of models) {
      try {
        const { object } = await generateObject({
          model: gateway(m),
          schema: VisionResult,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Identify the primary vehicle shown. Return detected_make, detected_model, detected_body_type (sedan/suv/truck/coupe/van/hatchback/etc), confidence 0-1, and short reasoning. If not a vehicle, set fields null and confidence 0.`,
                },
                ...data.image_urls.map((u) => ({ type: "image" as const, image: u })),
              ],
            },
          ],
        });
        vision = object;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!vision) throw new Error(`Vision failed: ${(lastErr as Error)?.message ?? "unknown"}`);

    const norm = (s: string | null | undefined) =>
      (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const discrepancies: string[] = [];
    if (data.stated_make && vision.detected_make) {
      if (norm(data.stated_make) !== norm(vision.detected_make)) {
        discrepancies.push(
          `Text says make "${data.stated_make}" but image looks like "${vision.detected_make}"`,
        );
      }
    }
    if (data.stated_body_type && vision.detected_body_type) {
      if (norm(data.stated_body_type) !== norm(vision.detected_body_type)) {
        discrepancies.push(
          `Text says body "${data.stated_body_type}" but image looks like "${vision.detected_body_type}"`,
        );
      }
    }
    // Cross-check text for a competing make mentioned that differs from image
    if (vision.detected_make && statedText) {
      const commonMakes = [
        "toyota","honda","ford","chevrolet","chevy","gmc","dodge","ram","jeep","bmw","mercedes","audi","volkswagen","vw","subaru","nissan","hyundai","kia","mazda","lexus","acura","infiniti","tesla","porsche","volvo","cadillac","buick","chrysler","fiat","mitsubishi","land rover","jaguar","mini",
      ];
      const detected = norm(vision.detected_make);
      for (const m of commonMakes) {
        if (norm(m) === detected) continue;
        if (statedText.toLowerCase().includes(m)) {
          discrepancies.push(
            `Description mentions "${m}" but image looks like "${vision.detected_make}"`,
          );
          break;
        }
      }
    }

    const needs_review = discrepancies.length > 0 && vision.confidence >= 0.4;

    if (needs_review && data.auto_flag && data.vehicle_id) {
      const { data: current } = await supabaseAdmin
        .from("vehicles")
        .select("compliance_flags, status")
        .eq("id", data.vehicle_id)
        .maybeSingle();
      const flags = new Set<string>((current?.compliance_flags as string[] | null) ?? []);
      flags.add("image_text_mismatch");
      const newStatus =
        current?.status === "active" || current?.status === "featured" ? "draft" : current?.status;
      await supabaseAdmin
        .from("vehicles")
        .update({ compliance_flags: Array.from(flags) as never, status: newStatus })
        .eq("id", data.vehicle_id);
      await audit(
        context.userId,
        "ai_flag_mismatch",
        "vehicle",
        data.vehicle_id,
        current,
        { flags: Array.from(flags), status: newStatus },
        discrepancies.join("; "),
      );
    }

    return { vision, discrepancies, needs_review };
  });
