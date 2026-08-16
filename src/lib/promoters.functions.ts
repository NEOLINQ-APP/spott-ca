import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

const applySchema = z.object({
  display_name: z.string().min(2).max(120),
  company_name: z.string().max(200).optional().nullable(),
  email: z.string().email().max(255),
  phone: z.string().max(40).optional().nullable(),
  website: z.string().url().max(500).optional().or(z.literal("")).nullable(),
  social_handle: z.string().max(200).optional().nullable(),
  pitch: z.string().max(2000).optional().nullable(),
  business_number: z
    .string()
    .trim()
    .min(9, "Canadian Business Number is required (min 9 characters)")
    .max(20)
    .regex(/^[A-Za-z0-9\s\-]+$/, "Use letters, numbers, spaces or dashes only"),
});

export const applyAsPromoter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => applySchema.parse(i))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Require a business account: owner role OR at least one owned business
    const [{ data: ownerRole }, { count: bizCount }] = await Promise.all([
      (supabaseAdmin.from("user_roles") as any)
        .select("role").eq("user_id", userId).eq("role", "owner").maybeSingle(),
      (supabaseAdmin.from("businesses") as any)
        .select("id", { count: "exact", head: true }).eq("owner_id", userId),
    ]);
    if (!ownerRole && (bizCount ?? 0) === 0) {
      throw new Error("You need a business account to apply as a promoter. Sign up as a business or claim/list your business first.");
    }

    const { data: existing } = await (supabaseAdmin.from("promoters") as any)
      .select("id, status").eq("user_id", userId).maybeSingle();
    if (existing) throw new Error(`You already applied (status: ${existing.status})`);
    const { data: row, error } = await (supabaseAdmin.from("promoters") as any).insert({
      user_id: userId,
      display_name: data.display_name,
      company_name: data.company_name || null,
      email: data.email,
      phone: data.phone || null,
      website: data.website || null,
      social_handle: data.social_handle || null,
      pitch: data.pitch || null,
      business_number: data.business_number.trim(),
      status: "pending",
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyPromoter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (supabaseAdmin.from("promoters") as any)
      .select("*").eq("user_id", context.userId).maybeSingle();
    return data ?? null;
  });

export const getMyPromoterStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: promoter } = await (supabaseAdmin.from("promoters") as any)
      .select("id").eq("user_id", context.userId).maybeSingle();
    if (!promoter) return { promoter: null, redemptions: [], totals: { count: 0, earned_cents: 0, pending_cents: 0, paid_cents: 0 } };

    const { data: reds } = await (supabaseAdmin.from("coupon_redemptions") as any)
      .select("*")
      .eq("promoter_id", promoter.id)
      .order("redeemed_at", { ascending: false })
      .limit(500);

    const rawList = reds ?? [];
    const bizIds = Array.from(new Set(rawList.map((r: any) => r.redeemed_by_business).filter(Boolean)));
    const { data: bizRows } = bizIds.length
      ? await (supabaseAdmin.from("businesses") as any).select("id, name, slug").in("id", bizIds)
      : { data: [] as any[] };
    const bizMap = new Map((bizRows ?? []).map((b: any) => [b.id, b]));
    const list = rawList.map((r: any) => ({ ...r, business: bizMap.get(r.redeemed_by_business) ?? null }));
    const earned = list.reduce((s: number, r: any) => s + (r.commission_cents || 0), 0);
    const pending = list.filter((r: any) => r.commission_status === "pending").reduce((s: number, r: any) => s + (r.commission_cents || 0), 0);
    const paid = list.filter((r: any) => r.commission_status === "paid").reduce((s: number, r: any) => s + (r.commission_cents || 0), 0);

    return {
      promoter,
      redemptions: list,
      totals: { count: list.length, earned_cents: earned, pending_cents: pending, paid_cents: paid },
    };
  });

export const getPromotableBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    q: z.string().max(120).optional(),
    category_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(60).optional(),
  }).parse(i ?? {}))
  .handler(async ({ data }) => {
    let q = (supabaseAdmin.from("businesses") as any)
      .select("id, name, slug, city, province, hero_image_url, category_id, featured_until, bumped_until")
      .eq("status", "approved")
      .order("bumped_until", { ascending: false, nullsFirst: false })
      .order("featured_until", { ascending: false, nullsFirst: false })
      .limit(data.limit ?? 30);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateMyPromoterProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    display_name: z.string().min(2).max(120).optional(),
    company_name: z.string().max(200).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    website: z.string().url().max(500).nullable().or(z.literal("")).optional(),
    social_handle: z.string().max(200).nullable().optional(),
    pitch: z.string().max(2000).nullable().optional(),
    payout_method: z.enum(["paypal", "etransfer", "bank", "stripe"]).nullable().optional(),
    payout_details: z.string().max(500).nullable().optional(),
  }).parse(i)).handler(async ({ data, context }) => {
    const patch: any = { ...data };
    if (patch.website === "") patch.website = null;
    const { error } = await (supabaseAdmin.from("promoters") as any)
      .update(patch).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin ----------

export const listPromoters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ status: z.enum(["pending", "approved", "suspended", "all"]).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = (supabaseAdmin.from("promoters") as any).select("*").order("created_at", { ascending: false }).limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updatePromoter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "suspended", "rejected"]).optional(),
    commission_type: z.enum(["flat", "percent"]).optional(),
    commission_value: z.number().int().min(0).max(100000).optional(),
    customer_discount_pct: z.number().int().min(25).max(50).optional(),
    payout_method: z.string().max(40).optional().nullable(),
    payout_details: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, status, ...rest } = data;

    const { data: current } = await (supabaseAdmin.from("promoters") as any)
      .select("*").eq("id", id).maybeSingle();
    if (!current) throw new Error("Promoter not found");

    const patch: any = { ...rest };
    let generatedCode: string | null = null;

    if (status) {
      patch.status = status;
      if (status === "approved") {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = context.userId;

        // Auto-generate SPOTT-XXXXXXXX code once, on first approval
        if (!current.promo_code_str) {
          const commissionPct = patch.commission_value ?? current.commission_value ?? 15;
          const discountPct = patch.customer_discount_pct ?? current.customer_discount_pct ?? 25;
          for (let attempt = 0; attempt < 6; attempt++) {
            const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
            const candidate = `SPOTT-${suffix}`;
            const { data: codeRow, error: codeErr } = await (supabaseAdmin.from("promo_codes") as any)
              .insert({
                code: candidate,
                owner_type: "promoter",
                owner_id: id,
                discount_type: "percent",
                discount_value: discountPct,
                status: "active",
                metadata: {
                  scope: "promoter",
                  applies_to: ["subscription", "featured_addon"],
                  commission_pct: commissionPct,
                },
                created_by: context.userId,
              })
              .select().single();
            if (!codeErr && codeRow) {
              generatedCode = candidate;
              patch.promo_code_str = candidate;
              patch.promo_code_id = codeRow.id;
              break;
            }
            if (codeErr && !String(codeErr.message).toLowerCase().includes("duplicate")) {
              throw new Error(codeErr.message);
            }
          }
        } else if (patch.customer_discount_pct != null) {
          // Keep existing promoter code's discount in sync
          await (supabaseAdmin.from("promo_codes") as any)
            .update({ discount_value: patch.customer_discount_pct })
            .eq("owner_type", "promoter").eq("owner_id", id);
        }
      }
    }

    const { error } = await (supabaseAdmin.from("promoters") as any).update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    await (supabaseAdmin.from("admin_audit_log") as any).insert({
      actor_id: context.userId,
      action: `promoter.${status ?? "update"}`,
      target_type: "promoter",
      target_id: id,
      before: current,
      after: { ...current, ...patch, ...(generatedCode ? { generated_code: generatedCode } : {}) },
    });

    return { ok: true, generated_code: generatedCode };
  });

export const listAllRedemptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    promoter_id: z.string().uuid().optional(),
    status: z.enum(["pending", "paid", "void", "all"]).optional(),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = (supabaseAdmin.from("coupon_redemptions") as any)
      .select("*")
      .order("redeemed_at", { ascending: false })
      .limit(1000);
    if (data.promoter_id) q = q.eq("promoter_id", data.promoter_id);
    if (data.status && data.status !== "all") q = q.eq("commission_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const bizIds = Array.from(new Set(list.map((r: any) => r.redeemed_by_business).filter(Boolean)));
    const promIds = Array.from(new Set(list.map((r: any) => r.promoter_id).filter(Boolean)));
    const [bizRes, promRes] = await Promise.all([
      bizIds.length ? (supabaseAdmin.from("businesses") as any).select("id, name, slug").in("id", bizIds) : Promise.resolve({ data: [] }),
      promIds.length ? (supabaseAdmin.from("promoters") as any).select("id, display_name, company_name").in("id", promIds) : Promise.resolve({ data: [] }),
    ]);
    const bizMap = new Map((bizRes.data ?? []).map((b: any) => [b.id, b]));
    const promMap = new Map((promRes.data ?? []).map((p: any) => [p.id, p]));
    return list.map((r: any) => ({
      ...r,
      business: bizMap.get(r.redeemed_by_business) ?? null,
      promoter: promMap.get(r.promoter_id) ?? null,
    }));
  });

export const markRedemptionsPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(500),
    payout_ref: z.string().max(200).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("coupon_redemptions") as any)
      .update({
        commission_status: "paid",
        commission_paid_at: new Date().toISOString(),
        commission_payout_ref: data.payout_ref ?? null,
      })
      .in("id", data.ids)
      .eq("commission_status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

// ---------- Promoter notifications / outreach ----------

const aiMessageSchema = z.object({
  promoter_id: z.string().uuid(),
  code: z.string().min(2).max(64),
  discount_label: z.string().max(120).optional(),
  tone: z.enum(["friendly", "professional", "exciting"]).optional(),
  channel: z.enum(["in_app", "email", "sms"]).optional(),
});

export const generatePromoterMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => aiMessageSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: p } = await (supabaseAdmin.from("promoters") as any)
      .select("display_name, company_name").eq("id", data.promoter_id).maybeSingle();
    const name = p?.display_name || "there";
    const channel = data.channel ?? "in_app";
    const tone = data.tone ?? "friendly";
    const maxChars = channel === "sms" ? 320 : channel === "email" ? 900 : 600;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const body = `Hi ${name}, this is the Spott.ca team reaching out with your exclusive promo code: ${data.code}${data.discount_label ? ` (${data.discount_label})` : ""}. Share it with your audience — every redemption earns you commission. Thank you for partnering with Spott.ca!`;
      return { subject: "Your Spott.ca promo code is ready", body };
    }
    const prompt = `Write a ${tone} ${channel === "sms" ? "SMS" : "short message"} (max ${maxChars} characters) from the Spott.ca team to a promoter named "${name}"${p?.company_name ? ` from ${p.company_name}` : ""}. Tell them we're reaching out to share their personal promo code "${data.code}"${data.discount_label ? ` which gives ${data.discount_label}` : ""}. Encourage them to share it with their audience. Mention Spott.ca by name. Plain text only — no subject line, signatures, or markdown.`;
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You write concise, warm outreach messages for Spott.ca. Plain text only." },
            { role: "user", content: prompt },
          ],
        }),
      });
      const j: any = await r.json();
      const body = (j?.choices?.[0]?.message?.content ?? "").toString().trim()
        || `Hi ${name}, your Spott.ca promo code is ${data.code}.`;
      return { subject: `Your Spott.ca promo code: ${data.code}`, body };
    } catch {
      return { subject: `Your Spott.ca promo code: ${data.code}`, body: `Hi ${name}, your Spott.ca promo code is ${data.code}. — The Spott.ca Team` };
    }
  });

export const sendPromoterNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    promoter_id: z.string().uuid(),
    channels: z.array(z.enum(["in_app", "email", "sms"])).min(1),
    subject: z.string().max(200).optional(),
    body: z.string().min(2).max(4000),
    coupon_code: z.string().max(64).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: p } = await (supabaseAdmin.from("promoters") as any)
      .select("id, user_id, email, phone").eq("id", data.promoter_id).maybeSingle();
    if (!p) throw new Error("Promoter not found");

    const results: { channel: string; status: string; error?: string }[] = [];
    for (const channel of data.channels) {
      let status: "sent" | "queued" | "failed" = "queued";
      let error: string | null = null;
      if (channel === "in_app") {
        status = "sent";
      } else if (channel === "email") {
        if (!p.email) { status = "failed"; error = "Promoter has no email on file"; }
      } else if (channel === "sms") {
        if (!p.phone) { status = "failed"; error = "Promoter has no phone on file"; }
      }
      const { error: insErr } = await (supabaseAdmin.from("promoter_notifications") as any).insert({
        promoter_id: p.id,
        user_id: p.user_id,
        channel,
        subject: data.subject ?? null,
        body: data.body,
        coupon_code: data.coupon_code ?? null,
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
        error,
        created_by: context.userId,
      });
      if (insErr) results.push({ channel, status: "failed", error: insErr.message });
      else results.push({ channel, status, error: error ?? undefined });
    }
    return { ok: true, results };
  });

export const listMyPromoterNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (supabaseAdmin.from("promoter_notifications") as any)
      .select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const markPromoterNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (supabaseAdmin.from("promoter_notifications") as any)
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
