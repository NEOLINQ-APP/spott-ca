import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

const CartItemSchema = z.object({
  listing_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

const CreateCheckoutSchema = z.object({
  items: z.array(CartItemSchema).min(1).max(20),
  fulfillment: z.enum(["pickup", "delivery"]).default("pickup"),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(40).optional(),
  shipping_address: z
    .object({
      line1: z.string().max(120).optional(),
      city: z.string().max(80).optional(),
      province: z.string().max(40).optional(),
      postal_code: z.string().max(20).optional(),
    })
    .optional(),
  notes: z.string().max(500).optional(),
  promoter_code: z.string().max(32).optional(),
  return_url: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

type CheckoutResult = { clientSecret: string; orderId: string } | { error: string };

export const createMarketplaceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateCheckoutSchema.parse(i))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const buyerId = context.userId;
      const env = data.environment as StripeEnv;

      // Load listings + sellers
      const ids = data.items.map((i) => i.listing_id);
      const { data: listings, error: lErr } = await supabaseAdmin
        .from("marketplace_listings")
        .select("id, title, price_cents, currency, commission_cents, user_id, status")
        .in("id", ids);
      if (lErr) throw new Error(lErr.message);
      if (!listings || listings.length !== ids.length) throw new Error("Some listings are no longer available");
      const inactive = listings.find((l) => l.status !== "active");
      if (inactive) throw new Error(`Listing "${inactive.title}" is no longer available`);

      const byId = new Map(listings.map((l) => [l.id, l]));
      let subtotal = 0;
      let commission = 0;
      const currency = (listings[0].currency || "CAD").toLowerCase();

      const lineItems: any[] = [];
      const itemRows: any[] = [];
      for (const cartItem of data.items) {
        const listing = byId.get(cartItem.listing_id)!;
        if ((listing.currency || "CAD").toLowerCase() !== currency)
          throw new Error("Cart contains listings in mixed currencies — please check out one currency at a time.");
        const unitPrice = listing.price_cents;
        if (unitPrice <= 0) throw new Error(`"${listing.title}" has no price set`);
        subtotal += unitPrice * cartItem.quantity;
        const itemCommission = (listing.commission_cents ?? 0) * cartItem.quantity;
        commission += itemCommission;
        lineItems.push({
          price_data: {
            currency,
            product_data: {
              name: listing.title,
              tax_code: "txcd_99999999",
            },
            unit_amount: unitPrice,
            tax_behavior: "exclusive",
          },
          quantity: cartItem.quantity,
        });

        itemRows.push({
          listing_id: listing.id,
          seller_id: listing.user_id,
          title: listing.title,
          unit_price_cents: unitPrice,
          quantity: cartItem.quantity,
          commission_cents: itemCommission,
        });
      }

      // Promoter attribution from referral code
      let promoterId: string | null = null;
      if (data.promoter_code) {
        const code = data.promoter_code.trim().toUpperCase();
        const { data: promoter } = await supabaseAdmin
          .from("promoters")
          .select("id")
          .eq("status", "approved")
          .ilike("id", `${code}%`)
          .maybeSingle();
        if (promoter) promoterId = promoter.id;
      }

      const total = subtotal; // shipping/tax handled by Stripe automatic_tax if needed later

      // Create pending order first
      const { data: order, error: oErr } = await supabaseAdmin
        .from("marketplace_orders")
        .insert({
          buyer_id: buyerId,
          promoter_id: promoterId,
          promoter_code: data.promoter_code ?? null,
          status: "pending",
          fulfillment: data.fulfillment,
          subtotal_cents: subtotal,
          total_cents: total,
          commission_cents: commission,
          currency: currency.toUpperCase(),
          contact_email: data.contact_email ?? null,
          contact_phone: data.contact_phone ?? null,
          shipping_address: data.shipping_address ?? null,
          notes: data.notes ?? null,
          environment: env,
        })
        .select("id")
        .single();
      if (oErr || !order) throw new Error(oErr?.message ?? "Could not create order");

      const itemsToInsert = itemRows.map((r) => ({ ...r, order_id: order.id }));
      const { error: iErr } = await supabaseAdmin.from("marketplace_order_items").insert(itemsToInsert);
      if (iErr) throw new Error(iErr.message);

      // Stripe embedded checkout (tax calculated & collected by Stripe; remittance handled by you)
      const stripe = createStripeClient(env);
      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.return_url,
        ...(data.contact_email && { customer_email: data.contact_email }),
        billing_address_collection: "required",
        automatic_tax: { enabled: true },
        payment_intent_data: { description: `Spott order ${order.id.slice(0, 8)}` },
        metadata: {
          userId: buyerId,
          orderId: order.id,
          source: "marketplace_order",
        },
      });


      await supabaseAdmin
        .from("marketplace_orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);

      return { clientSecret: session.client_secret ?? "", orderId: order.id };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const listMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: orders } = await supabaseAdmin
      .from("marketplace_orders")
      .select("*")
      .eq("buyer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = (orders ?? []).map((o) => o.id);
    let items: any[] = [];
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from("marketplace_order_items")
        .select("*")
        .in("order_id", ids);
      items = data ?? [];
    }
    return {
      orders: (orders ?? []).map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })),
    };
  });

export const listSellerOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: items } = await supabaseAdmin
      .from("marketplace_order_items")
      .select("*")
      .eq("seller_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const orderIds = Array.from(new Set((items ?? []).map((i) => i.order_id)));
    let orders: any[] = [];
    if (orderIds.length) {
      const { data } = await supabaseAdmin
        .from("marketplace_orders")
        .select("id, buyer_id, status, fulfillment, total_cents, currency, created_at, paid_at, fulfilled_at, contact_email, contact_phone, shipping_address, notes")
        .in("id", orderIds)
        .neq("status", "pending")
        .order("created_at", { ascending: false });
      orders = data ?? [];
    }
    return {
      orders: orders.map((o) => ({ ...o, items: (items ?? []).filter((i) => i.order_id === o.id) })),
    };
  });

export const markOrderFulfilled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ order_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // Verify seller has at least one item in this order
    const { data: own } = await supabaseAdmin
      .from("marketplace_order_items")
      .select("id")
      .eq("order_id", data.order_id)
      .eq("seller_id", context.userId)
      .limit(1);
    if (!own?.length) throw new Error("Not allowed");
    const { error } = await supabaseAdmin
      .from("marketplace_orders")
      .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const confirmOrderReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ order_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: order } = await supabaseAdmin
      .from("marketplace_orders")
      .select("id, buyer_id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.buyer_id !== context.userId) throw new Error("Not allowed");
    if (!["paid", "fulfilled"].includes(order.status))
      throw new Error("Order is not eligible for release");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("marketplace_orders")
      .update({ status: "released", buyer_confirmed_at: now, released_at: now })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      reason: z.string().min(3).max(120),
      details: z.string().max(2000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: order } = await supabaseAdmin
      .from("marketplace_orders")
      .select("id, buyer_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.buyer_id !== context.userId) throw new Error("Not allowed");
    const { error } = await supabaseAdmin.from("marketplace_disputes").insert({
      order_id: data.order_id,
      opened_by: context.userId,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("marketplace_orders").update({ status: "disputed" }).eq("id", data.order_id);
    return { ok: true };
  });
