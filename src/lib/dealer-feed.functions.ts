// Dealer Feed Mapper — CSV/XML inventory ingestion with header mapping.
// Flow: upload -> parse headers + sample -> map fields -> preview -> commit as draft vehicles.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Fields the dealer can map their headers TO.
export const FEED_TARGET_FIELDS = [
  "year", "make", "model", "trim", "price_cents", "mileage_km", "vin",
  "body_type", "fuel_type", "transmission", "drivetrain", "exterior_color",
  "city", "province", "description",
] as const;
export type FeedTargetField = (typeof FEED_TARGET_FIELDS)[number];

async function ownedBusiness(supabase: any, userId: string, businessId: string) {
  const { data } = await supabase
    .from("businesses").select("id,owner_id").eq("id", businessId).maybeSingle();
  if (!data || data.owner_id !== userId) throw new Error("Not authorized for this business.");
  return data;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Minimal RFC4180-ish parser — supports quoted fields with escaped quotes.
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].every((v) => v === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (rows[i][idx] ?? "").trim(); });
    out.push(obj);
  }
  return { headers, rows: out };
}

function parseXML(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Support common feed shapes: <vehicles><vehicle>...</vehicle></vehicles>
  // Extract each first-level child of <vehicle>/<listing>/<item>/<row>/<car>.
  const itemRegex = /<(vehicle|listing|item|row|car)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const fieldRegex = /<([a-zA-Z0-9_:-]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
  const rows: Record<string, string>[] = [];
  const headerSet = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(text)) !== null) {
    const inner = m[2];
    const obj: Record<string, string> = {};
    let fm: RegExpExecArray | null;
    while ((fm = fieldRegex.exec(inner)) !== null) {
      const key = fm[1];
      const val = fm[2]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/<[^>]+>/g, "")
        .trim();
      obj[key] = val;
      headerSet.add(key);
    }
    if (Object.keys(obj).length) rows.push(obj);
  }
  return { headers: Array.from(headerSet), rows };
}

function autoMap(headers: string[]): Record<string, FeedTargetField | ""> {
  const map: Record<string, FeedTargetField | ""> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const rules: Array<[FeedTargetField, string[]]> = [
    ["year", ["year", "modelyear"]],
    ["make", ["make", "manufacturer", "brand"]],
    ["model", ["model"]],
    ["trim", ["trim", "series", "package"]],
    ["price_cents", ["price", "askingprice", "listprice", "pricecents"]],
    ["mileage_km", ["mileage", "km", "odometer", "kilometers"]],
    ["vin", ["vin", "vinnumber"]],
    ["body_type", ["bodytype", "body", "style"]],
    ["fuel_type", ["fuel", "fueltype"]],
    ["transmission", ["transmission", "trans"]],
    ["drivetrain", ["drive", "drivetrain", "drivetype"]],
    ["exterior_color", ["color", "exteriorcolor", "extcolor"]],
    ["city", ["city"]],
    ["province", ["province", "state"]],
    ["description", ["description", "comments", "notes"]],
  ];
  for (const h of headers) {
    const n = norm(h);
    const hit = rules.find(([, keys]) => keys.some((k) => n === k || n.includes(k)));
    map[h] = hit ? hit[0] : "";
  }
  return map;
}

// -------- upload + parse --------
const UploadInput = z.object({
  business_id: z.string().uuid(),
  source_type: z.enum(["csv", "xml"]),
  filename: z.string().max(255).optional().nullable(),
  content: z.string().min(1).max(4_000_000), // ~4MB text cap
});

export const uploadFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ownedBusiness(supabase, userId, data.business_id);

    const parsed = data.source_type === "csv" ? parseCSV(data.content) : parseXML(data.content);
    if (!parsed.rows.length) throw new Error("No rows detected in the uploaded file.");

    const mapping = autoMap(parsed.headers);
    const sample = parsed.rows.slice(0, 5);

    const { data: row, error } = await supabase
      .from("dealer_feed_imports")
      .insert({
        business_id: data.business_id,
        uploaded_by: userId,
        source_type: data.source_type,
        original_filename: data.filename ?? null,
        row_count: parsed.rows.length,
        headers: parsed.headers,
        sample_rows: sample,
        raw_rows: parsed.rows,
        field_mapping: mapping,
        status: "mapping",
      })
      .select("id,headers,sample_rows,field_mapping,row_count,status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// -------- update mapping --------
const MappingInput = z.object({
  import_id: z.string().uuid(),
  mapping: z.record(z.string(), z.string()),
});

export const updateFeedMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MappingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: imp } = await supabase
      .from("dealer_feed_imports").select("business_id").eq("id", data.import_id).maybeSingle();
    if (!imp) throw new Error("Import not found.");
    await ownedBusiness(supabase, userId, imp.business_id);
    const { error } = await supabase
      .from("dealer_feed_imports")
      .update({ field_mapping: data.mapping, status: "previewing" })
      .eq("id", data.import_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- commit --------
function coerceRow(raw: Record<string, string>, mapping: Record<string, string>) {
  const out: Record<string, any> = {};
  for (const [src, target] of Object.entries(mapping)) {
    if (!target) continue;
    const val = raw[src];
    if (val === undefined || val === null || val === "") continue;
    if (target === "year") {
      const n = parseInt(String(val).replace(/\D/g, ""), 10);
      if (!Number.isNaN(n) && n >= 1900 && n <= 2100) out.year = n;
    } else if (target === "price_cents") {
      const clean = String(val).replace(/[^0-9.]/g, "");
      const num = parseFloat(clean);
      if (!Number.isNaN(num)) out.price_cents = Math.round(num > 10000 ? num : num * 100);
    } else if (target === "mileage_km") {
      const n = parseInt(String(val).replace(/\D/g, ""), 10);
      if (!Number.isNaN(n)) out.mileage_km = n;
    } else {
      out[target] = String(val).trim();
    }
  }
  return out;
}

const CommitInput = z.object({ import_id: z.string().uuid() });

export const commitFeedImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CommitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: imp } = await supabase
      .from("dealer_feed_imports")
      .select("*")
      .eq("id", data.import_id)
      .maybeSingle();
    if (!imp) throw new Error("Import not found.");
    await ownedBusiness(supabase, userId, imp.business_id);

    await supabase.from("dealer_feed_imports").update({ status: "processing" }).eq("id", imp.id);

    const rows: Record<string, string>[] = imp.raw_rows ?? [];
    const mapping: Record<string, string> = imp.field_mapping ?? {};
    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const coerced = coerceRow(rows[i], mapping);
      if (!coerced.year || !coerced.make || !coerced.model) {
        errors.push({ row: i + 1, reason: "Missing year/make/model" });
        continue;
      }
      const title = coerced.title ??
        `${coerced.year} ${coerced.make} ${coerced.model}${coerced.trim ? " " + coerced.trim : ""}`;
      const payload = {
        ...coerced,
        title,
        dealer_business_id: imp.business_id,
        seller_type: "dealer",
        status: "draft",
      };
      const { error } = await supabase.from("vehicles").insert(payload);
      if (error) errors.push({ row: i + 1, reason: error.message });
      else imported++;
    }

    await supabase
      .from("dealer_feed_imports")
      .update({
        status: errors.length && !imported ? "failed" : "complete",
        imported_count: imported,
        error_count: errors.length,
        errors,
      })
      .eq("id", imp.id);

    return { imported, errors };
  });

// -------- list imports --------
export const listFeedImports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ business_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ownedBusiness(supabase, userId, data.business_id);
    const { data: rows } = await supabase
      .from("dealer_feed_imports")
      .select("id,source_type,original_filename,row_count,imported_count,error_count,status,created_at")
      .eq("business_id", data.business_id)
      .order("created_at", { ascending: false })
      .limit(50);
    return rows ?? [];
  });
