import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VinInput = z.object({ vin: z.string().trim().min(11).max(17) });

export type DecodedVin = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body_type: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  fuel_type: string | null;
};

export const decodeVin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VinInput.parse(d))
  .handler(async ({ data }): Promise<DecodedVin> => {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(data.vin)}?format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("VIN service unavailable");
    const json = (await res.json()) as { Results: Array<Record<string, string>> };
    const r = json.Results?.[0] ?? {};
    const pick = (k: string) => (r[k] && r[k].trim() ? r[k].trim() : null);
    const yearStr = pick("ModelYear");
    return {
      vin: data.vin.toUpperCase(),
      year: yearStr ? Number(yearStr) : null,
      make: pick("Make"),
      model: pick("Model"),
      trim: pick("Trim") ?? pick("Series"),
      body_type: pick("BodyClass"),
      engine: pick("DisplacementL") ? `${pick("DisplacementL")}L ${pick("EngineCylinders") ?? ""} cyl`.trim() : pick("EngineModel"),
      transmission: pick("TransmissionStyle"),
      drivetrain: pick("DriveType"),
      fuel_type: pick("FuelTypePrimary"),
    };
  });

const GenInput = z.object({
  year: z.number().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  trim: z.string().nullable(),
  body_type: z.string().nullable(),
  mileage_km: z.number().nullable(),
  condition: z.string().nullable(),
  province: z.string().max(40).nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const generateListingContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");
    const ymm = [data.year, data.make, data.model, data.trim].filter(Boolean).join(" ");
    const prompt = `You are writing a Canadian used-vehicle classified listing. Vehicle: ${ymm}. Body: ${data.body_type ?? "n/a"}. Mileage: ${data.mileage_km ? data.mileage_km + " km" : "unknown"}. Condition: ${data.condition ?? "unspecified"}. Province: ${data.province ?? "n/a"}. Seller notes: ${data.notes ?? "(none)"}.

Return ONLY valid JSON with this exact shape:
{"title":"<60 chars max, includes year/make/model>","description":"<2-3 short paragraphs, friendly, factual, no emojis>","features":["feature 1","feature 2","..."],"hashtags":["#Make","#Model","..."],"price_low":<number CAD>,"price_high":<number CAD>}

Features: 6-10 likely standard features for that vehicle. Do not invent specific options you cannot verify.
Hashtags: 6-10 PascalCase tags starting with #, mixing make, model, trim, body type, drivetrain, and a province tag like #${data.province ?? "Canada"}Vehicles. No spaces in tags.
Price range: a reasonable Canadian private-party asking range in CAD for this vehicle/year/mileage/condition.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("AI is busy, please retry in a moment");
    if (res.status === 402) throw new Error("AI credits exhausted");
    if (!res.ok) throw new Error("AI generation failed");
    const body = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const text = body.choices?.[0]?.message?.content ?? "{}";
    let parsed: { title?: string; description?: string; features?: string[]; hashtags?: string[]; price_low?: number; price_high?: number } = {};
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    const cleanTags = (parsed.hashtags ?? [])
      .map((t) => String(t).trim())
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .map((t) => t.replace(/\s+/g, ""))
      .filter((t) => t.length > 1 && t.length <= 40)
      .slice(0, 10);
    return {
      title: parsed.title ?? ymm ?? "Vehicle for sale",
      description: parsed.description ?? "",
      features: Array.isArray(parsed.features) ? parsed.features.slice(0, 12) : [],
      hashtags: cleanTags,
      price_low: typeof parsed.price_low === "number" ? parsed.price_low : null,
      price_high: typeof parsed.price_high === "number" ? parsed.price_high : null,
    };
  });

const CreateInput = z.object({
  vin: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  trim: z.string().nullable().optional(),
  body_type: z.string().nullable().optional(),
  engine: z.string().nullable().optional(),
  transmission: z.string().nullable().optional(),
  drivetrain: z.string().nullable().optional(),
  fuel_type: z.string().nullable().optional(),
  exterior_color: z.string().max(40).nullable().optional(),
  interior_color: z.string().max(40).nullable().optional(),
  doors: z.number().int().min(0).max(10).nullable().optional(),
  seats: z.number().int().min(0).max(30).nullable().optional(),
  accident_history: z.string().max(500).nullable().optional(),
  clean_title: z.boolean().nullable().optional(),
  rebuilt_status: z.boolean().nullable().optional(),
  financing_available: z.boolean().optional(),
  warranty_available: z.boolean().optional(),
  hashtags: z.array(z.string().max(40)).max(20).optional(),
  title: z.string().min(3).max(120),
  description: z.string().max(5000).optional(),
  features: z.array(z.string().max(80)).max(20).optional(),
  mileage_km: z.number().int().min(0).max(2_000_000).nullable().optional(),
  condition: z.enum(["excellent", "good", "average", "rough"]).nullable().optional(),
  price_cents: z.number().int().min(0).max(100_000_000),
  city: z.string().max(80).nullable().optional(),
  province: z.string().max(40).nullable().optional(),
  postal_code: z.string().max(10).nullable().optional(),
  photo_paths: z.array(z.string()).max(20).optional(),
  disclosure_attestation: z.object({
    accident_history_truthful: z.literal(true),
    odometer_accurate: z.literal(true),
    prior_use_truthful: z.literal(true),
    all_in_price: z.literal(true),
    signature_name: z.string().trim().min(2).max(120),
    user_agent: z.string().max(500).optional(),
  }),
});

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { photo_paths, disclosure_attestation, ...row } = data;

    // Seller-type detection: an approved dealership business owned by the user
    // upgrades the listing from "private" to "dealer" and links it to that
    // dealer profile. Everything else stays "private".
    const { data: dealer } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("status", "approved")
      .eq("business_type", "dealership")
      .limit(1)
      .maybeSingle();
    const seller_type = dealer ? "dealer" : "private";
    const dealer_business_id = dealer?.id ?? null;

    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from("vehicles")
      .insert({
        ...row,
        seller_id: userId,
        seller_type,
        dealer_business_id,
        status: "active",
        disclosure_signed_at: now,
        disclosure_signed_by: userId,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create listing");

    // Append-only audit trail — captures the exact attestation at publish time.
    await supabase.from("vehicle_disclosure_audit").insert({
      vehicle_id: created.id,
      user_id: userId,
      attestation: {
        ...disclosure_attestation,
        seller_type,
        dealer_business_id,
        accident_history_declared: row.accident_history ?? null,
        signed_at: now,
      },
      user_agent: disclosure_attestation.user_agent ?? null,
    });

    if (photo_paths && photo_paths.length > 0) {
      const photos = photo_paths.map((p, i) => ({ vehicle_id: created.id, storage_path: p, sort_order: i }));
      await supabase.from("vehicle_photos").insert(photos);
    }
    return { id: created.id, seller_type };
  });

// ---- Public SEO metadata (no PII) ---------------------------------------
const SeoInput = z.object({ id: z.string().uuid() });
export const getVehiclePublicSeo = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SeoInput.parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: v } = await sb
      .from("vehicles")
      .select("id,title,year,make,model,trim,city,province,status,dealer_business_id,businesses:dealer_business_id(name,city)")
      .eq("id", data.id)
      .eq("status", "active")
      .maybeSingle();
    if (!v) return null;
    const dealer = (v as any).businesses as { name: string | null; city: string | null } | null;
    const nameParts = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
    return {
      name: nameParts || v.title,
      title: v.title as string,
      dealer_name: dealer?.name ?? null,
      city: v.city ?? dealer?.city ?? null,
      province: v.province ?? null,
    };
  });

// ----------------------------------------------------------------------------
// Seller-type aware helpers — single source of truth for dealer/private logic.
// ----------------------------------------------------------------------------

export const getMySellerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: dealer } = await supabase
      .from("businesses")
      .select("id,name,slug,city,province,hero_image_url,status,business_type")
      .eq("owner_id", userId)
      .eq("status", "approved")
      .eq("business_type", "dealership")
      .limit(1)
      .maybeSingle();
    return {
      type: (dealer ? "dealer" : "private") as "dealer" | "private",
      dealer: dealer ?? null,
    };
  });

export const listMyDealerInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("vehicles")
      .select("id,title,year,make,model,price_cents,mileage_km,status,view_count,created_at,seller_type,dealer_business_id,vehicle_photos(storage_path,sort_order)")
      .eq("seller_id", userId)
      .eq("seller_type", "dealer")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Public: list a dealership's active inventory by business slug.
// Powers /vehicles/dealer/$slug — used by buyers, no auth required.
export const listDealerInventoryBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dealer, error: dErr } = await supabaseAdmin
      .from("businesses")
      .select("id,name,slug,description,hero_image_url,city,province,phone,website,business_type")
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!dealer) return { dealer: null, vehicles: [] };
    const { data: vehicles, error: vErr } = await supabaseAdmin
      .from("vehicles")
      .select(
        "id,title,year,make,model,trim,price_cents,currency,mileage_km,city,province,seller_type,condition,created_at,vehicle_photos(storage_path,sort_order)",
      )
      .eq("dealer_business_id", dealer.id)
      .eq("seller_type", "dealer")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(120);
    if (vErr) throw new Error(vErr.message);
    return { dealer, vehicles: vehicles ?? [] };
  });

export const listMyDealerLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Leads on vehicles this user sells as a dealer.
    const { data: invIds } = await supabase
      .from("vehicles")
      .select("id")
      .eq("seller_id", userId)
      .eq("seller_type", "dealer");
    const ids = (invIds ?? []).map((r) => r.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("vehicle_leads")
      .select("id,lead_type,status,full_name,email,phone,preferred_date,preferred_time,message,vehicle_id,created_at")
      .in("vehicle_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ListInput = z.object({
  q: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),
  year_min: z.number().optional(),
  year_max: z.number().optional(),
  price_min_cents: z.number().optional(),
  price_max_cents: z.number().optional(),
  mileage_max_km: z.number().optional(),
  condition: z.enum(["excellent", "good", "average", "rough"]).optional(),
  body_type: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  drivetrain: z.string().optional(),
  seller_type: z.enum(["private", "dealer"]).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  hashtag: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "mileage_asc", "year_desc"]).optional(),
  limit: z.number().int().min(1).max(60).default(30),
}).partial();

export const listVehicles = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("vehicles")
      .select("id,title,year,make,model,trim,price_cents,currency,mileage_km,city,province,seller_type,exterior_color,condition,created_at,dealer_business_id,hashtags,dealer:businesses!vehicles_dealer_business_id_fkey(id,name,slug),vehicle_photos(storage_path,sort_order)")
      .eq("status", "active")
      .limit(data.limit ?? 30);
    const sort = data.sort ?? "newest";
    if (sort === "price_asc") q = q.order("price_cents", { ascending: true });
    else if (sort === "price_desc") q = q.order("price_cents", { ascending: false });
    else if (sort === "mileage_asc") q = q.order("mileage_km", { ascending: true, nullsFirst: false });
    else if (sort === "year_desc") q = q.order("year", { ascending: false, nullsFirst: false });
    else q = q.order("created_at", { ascending: false });
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.make) q = q.ilike("make", `%${data.make}%`);
    if (data.model) q = q.ilike("model", `%${data.model}%`);
    if (data.trim) q = q.ilike("trim", `%${data.trim}%`);
    if (data.year_min) q = q.gte("year", data.year_min);
    if (data.year_max) q = q.lte("year", data.year_max);
    if (data.price_min_cents) q = q.gte("price_cents", data.price_min_cents);
    if (data.price_max_cents) q = q.lte("price_cents", data.price_max_cents);
    if (data.mileage_max_km) q = q.lte("mileage_km", data.mileage_max_km);
    if (data.condition) q = q.eq("condition", data.condition);
    if (data.body_type) q = q.ilike("body_type", `%${data.body_type}%`);
    if (data.fuel_type) q = q.ilike("fuel_type", `%${data.fuel_type}%`);
    if (data.transmission) q = q.ilike("transmission", `%${data.transmission}%`);
    if (data.drivetrain) q = q.ilike("drivetrain", `%${data.drivetrain}%`);
    if (data.seller_type) q = q.eq("seller_type", data.seller_type);
    if (data.city) q = q.ilike("city", `%${data.city}%`);
    if (data.province) q = q.ilike("province", `%${data.province}%`);
    if (data.hashtag) q = q.contains("hashtags", [data.hashtag]);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getVehicle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: v, error } = await supabaseAdmin
      .from("vehicles")
      .select("*,vehicle_photos(id,storage_path,sort_order),dealer:businesses!vehicles_dealer_business_id_fkey(id,name,slug,city,province,hero_image_url)")
      .eq("id", data.id)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!v) return null;
    // Bump view count (fire and forget)
    void supabaseAdmin.from("vehicles").update({ view_count: (v.view_count ?? 0) + 1 }).eq("id", data.id);
    return v;
  });

export const signVehiclePhotoUrls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ paths: z.array(z.string()).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.paths.length === 0) return {} as Record<string, string>;

    // Identify the caller (if any) so owners/admins can access their own
    // non-active photos, while everyone else is restricted to active listings.
    const { getRequest } = await import("@tanstack/react-start/server");
    let callerId: string | null = null;
    let isAdmin = false;
    const request = getRequest();
    const authHeader = request?.headers.get("authorization") ?? "";
    const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
    if (token) {
      const { data: userRes } = await supabaseAdmin.auth.getUser(token);
      callerId = userRes?.user?.id ?? null;
      if (callerId) {
        const { data: adminRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = !!adminRow;
      }
    }

    // Look up every requested path in vehicle_photos + its parent vehicle,
    // and only sign paths that pass the visibility check.
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from("vehicle_photos")
      .select("storage_path,vehicle:vehicles!inner(status,seller_id)")
      .in("storage_path", data.paths);
    if (rowsErr) throw new Error(rowsErr.message);

    const allowed = new Set<string>();
    for (const r of (rows ?? []) as Array<{ storage_path: string; vehicle: { status: string; seller_id: string } | Array<{ status: string; seller_id: string }> }>) {
      const v = Array.isArray(r.vehicle) ? r.vehicle[0] : r.vehicle;
      if (!v) continue;
      if (isAdmin) allowed.add(r.storage_path);
      else if (v.status === "active") allowed.add(r.storage_path);
      else if (callerId && v.seller_id === callerId) allowed.add(r.storage_path);
    }

    const filtered = data.paths.filter((p) => allowed.has(p));
    if (filtered.length === 0) return {} as Record<string, string>;

    const { data: signed, error } = await supabaseAdmin.storage
      .from("vehicle-photos")
      .createSignedUrls(filtered, 60 * 60);
    if (error) throw new Error(error.message);
    const out: Record<string, string> = {};
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
    }
    return out;
  });
