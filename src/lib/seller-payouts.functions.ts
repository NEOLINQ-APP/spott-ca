import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin only");
}

// List released items that have NOT been paid out yet, grouped by seller.
export const listOwedToSellers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: items, error } = await supabaseAdmin
      .from("marketplace_order_items")
      .select("id, seller_id, title, quantity, unit_price_cents, commission_cents, created_at, order_id, payout_id")
      .is("payout_id", null);
    if (error) throw new Error(error.message);

    // Filter to items whose order status === "released"
    const orderIds = Array.from(new Set((items ?? []).map((i) => i.order_id)));
    if (orderIds.length === 0) return { sellers: [] as Array<any> };

    const { data: orders, error: oErr } = await supabaseAdmin
      .from("marketplace_orders")
      .select("id, status, currency, released_at")
      .in("id", orderIds);
    if (oErr) throw new Error(oErr.message);
    const released = new Map((orders ?? []).filter((o) => o.status === "released").map((o) => [o.id, o]));

    const eligible = (items ?? []).filter((i) => released.has(i.order_id));
    const sellerIds = Array.from(new Set(eligible.map((i) => i.seller_id)));

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", sellerIds.length ? sellerIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const grouped = new Map<string, { seller_id: string; display_name: string | null; items: any[]; gross_cents: number; commission_cents: number; net_cents: number; currency: string }>();
    for (const it of eligible) {
      const ord = released.get(it.order_id)!;
      const gross = (it.unit_price_cents ?? 0) * (it.quantity ?? 1);
      const comm = it.commission_cents ?? 0;
      const existing = grouped.get(it.seller_id) ?? {
        seller_id: it.seller_id,
        display_name: profileMap.get(it.seller_id)?.display_name ?? null,
        items: [],
        gross_cents: 0,
        commission_cents: 0,
        net_cents: 0,
        currency: ord.currency ?? "CAD",
      };
      existing.items.push({
        id: it.id,
        title: it.title,
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        commission_cents: comm,
        gross_cents: gross,
        net_cents: gross - comm,
        order_id: it.order_id,
        released_at: ord.released_at,
      });
      existing.gross_cents += gross;
      existing.commission_cents += comm;
      existing.net_cents += gross - comm;
      grouped.set(it.seller_id, existing);
    }

    return { sellers: Array.from(grouped.values()).sort((a, b) => b.net_cents - a.net_cents) };
  });

export const listSellerPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ seller_id: z.string().uuid().optional() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("marketplace_seller_payouts")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(500);
    if (data.seller_id) q = q.eq("seller_id", data.seller_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const sellerIds = Array.from(new Set((rows ?? []).map((r) => r.seller_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", sellerIds.length ? sellerIds : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    return (rows ?? []).map((r) => ({ ...r, seller_name: pmap.get(r.seller_id) ?? null }));
  });

export const recordSellerPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      seller_id: z.string().uuid(),
      item_ids: z.array(z.string().uuid()).min(1).max(500),
      method: z.string().max(40).optional(),
      reference: z.string().max(200).optional(),
      notes: z.string().max(1000).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Re-validate items: must belong to seller, be unpaid, and order released.
    const { data: items, error } = await supabaseAdmin
      .from("marketplace_order_items")
      .select("id, seller_id, unit_price_cents, quantity, commission_cents, order_id, payout_id")
      .in("id", data.item_ids);
    if (error) throw new Error(error.message);
    if (!items || items.length !== data.item_ids.length) throw new Error("Some items not found");

    const wrong = items.find((i) => i.seller_id !== data.seller_id || i.payout_id);
    if (wrong) throw new Error("Items must be unpaid and owned by the selected seller");

    const orderIds = Array.from(new Set(items.map((i) => i.order_id)));
    const { data: orders } = await supabaseAdmin
      .from("marketplace_orders")
      .select("id, status, currency")
      .in("id", orderIds);
    const okOrders = new Set((orders ?? []).filter((o) => o.status === "released").map((o) => o.id));
    if (items.some((i) => !okOrders.has(i.order_id))) throw new Error("All items must be in released orders");

    const amount = items.reduce((s, i) => s + (i.unit_price_cents ?? 0) * (i.quantity ?? 1) - (i.commission_cents ?? 0), 0);
    const currency = (orders ?? [])[0]?.currency ?? "CAD";

    const { data: payout, error: pErr } = await supabaseAdmin
      .from("marketplace_seller_payouts")
      .insert({
        seller_id: data.seller_id,
        amount_cents: amount,
        currency,
        item_count: items.length,
        method: data.method ?? null,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        status: "paid",
        created_by: context.userId,
      })
      .select()
      .single();
    if (pErr) throw new Error(pErr.message);

    const { error: uErr } = await supabaseAdmin
      .from("marketplace_order_items")
      .update({ payout_id: payout.id })
      .in("id", data.item_ids);
    if (uErr) throw new Error(uErr.message);

    return { payout };
  });
