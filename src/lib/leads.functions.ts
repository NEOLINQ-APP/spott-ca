import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const LeadInput = z.object({
  lead_type: z.enum(["test_drive", "trade_in", "cash_offer", "contact"]),
  vehicle_id: z.string().uuid().nullable().optional(),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  province: z.string().trim().max(60).optional().nullable(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  preferred_time: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  vin: z.string().trim().max(17).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  make: z.string().trim().max(60).optional().nullable(),
  model: z.string().trim().max(80).optional().nullable(),
  trim: z.string().trim().max(80).optional().nullable(),
  mileage_km: z.number().int().min(0).max(10_000_000).optional().nullable(),
  condition: z.string().trim().max(40).optional().nullable(),
  asking_price_cents: z.number().int().min(0).max(1_000_000_000).optional().nullable(),
});

export type LeadInputT = z.infer<typeof LeadInput>;

async function getAiValuation(input: LeadInputT) {
  if (!input.year || !input.make || !input.model) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const prompt = `Estimate fair market value range in CAD for this used vehicle in Canada.
Year: ${input.year}
Make: ${input.make}
Model: ${input.model}
Trim: ${input.trim ?? "unknown"}
Mileage: ${input.mileage_km ? `${input.mileage_km} km` : "unknown"}
Condition: ${input.condition ?? "unknown"}
Context: ${input.lead_type === "trade_in" ? "trade-in to a dealer (wholesale)" : input.lead_type === "cash_offer" ? "instant cash offer from a buyer" : "private sale"}
Respond in strict JSON: {"low":<int CAD>,"high":<int CAD>,"notes":"<1-2 sentence rationale>"}`;
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a Canadian used vehicle valuation expert. Always return strict JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text: string = j?.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const low = Number(parsed.low);
    const high = Number(parsed.high);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    return {
      low_cents: Math.round(low * 100),
      high_cents: Math.round(high * 100),
      notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 1000) : null,
    };
  } catch {
    return null;
  }
}

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LeadInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let ai_estimate_low_cents: number | null = null;
    let ai_estimate_high_cents: number | null = null;
    let ai_notes: string | null = null;
    if (data.lead_type === "trade_in" || data.lead_type === "cash_offer") {
      const v = await getAiValuation(data);
      if (v) {
        ai_estimate_low_cents = v.low_cents;
        ai_estimate_high_cents = v.high_cents;
        ai_notes = v.notes;
      }
    }

    const insertRow = {
      lead_type: data.lead_type,
      vehicle_id: data.vehicle_id ?? null,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      city: data.city ?? null,
      province: data.province ?? null,
      preferred_date: data.preferred_date ?? null,
      preferred_time: data.preferred_time ?? null,
      message: data.message ?? null,
      vin: data.vin ?? null,
      year: data.year ?? null,
      make: data.make ?? null,
      model: data.model ?? null,
      trim: data.trim ?? null,
      mileage_km: data.mileage_km ?? null,
      condition: data.condition ?? null,
      asking_price_cents: data.asking_price_cents ?? null,
      ai_estimate_low_cents,
      ai_estimate_high_cents,
      ai_notes,
    };

    const { data: lead, error } = await supabaseAdmin
      .from("vehicle_leads")
      .insert(insertRow)
      .select("id, ai_estimate_low_cents, ai_estimate_high_cents, ai_notes")
      .single();
    if (error) throw new Error(error.message);

    // TODO: email notification (queued once email domain is set up).

    return {
      id: lead.id,
      ai_estimate_low_cents: lead.ai_estimate_low_cents,
      ai_estimate_high_cents: lead.ai_estimate_high_cents,
      ai_notes: lead.ai_notes,
    };
  });

const ListInput = z.object({
  status: z.enum(["new", "contacted", "qualified", "closed_won", "closed_lost"]).optional(),
  lead_type: z.enum(["test_drive", "trade_in", "cash_offer", "contact"]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
}).optional();

export const listLeadsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("vehicle_leads").select("*").order("created_at", { ascending: false }).limit(data?.limit ?? 100);
    if (data?.status) q = q.eq("status", data.status);
    if (data?.lead_type) q = q.eq("lead_type", data.lead_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "closed_won", "closed_lost"]).optional(),
  admin_notes: z.string().max(4000).optional().nullable(),
});

export const updateLeadAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { status?: typeof data.status; admin_notes?: string | null } = {};
    if (data.status) patch.status = data.status;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await supabaseAdmin.from("vehicle_leads").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
