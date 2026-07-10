import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";


const envSchema = z.enum(["sandbox", "live"]);

// Resolve a Stripe `discounts` array from a promo code. Handles both:
//  1) promoter-issued SPOTT-* codes (public.promo_codes, owner_type='promoter')
//  2) legacy admin universal coupons (public.admin_coupons)
// The DB trigger `trg_enforce_promoter_code_scope` guarantees promoter codes
// only ever attach to subscription or featured_addon redemptions.
async function resolvePromoCode(
  stripe: ReturnType<typeof createStripeClient>,
  rawCode: string | undefined,
  userId: string,
  addonType: "subscription" | "featured_addon" | "universal_percent",
): Promise<{ discounts?: { coupon: string }[] }> {
  if (!rawCode) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const code = rawCode.toUpperCase().trim();

  // 1) Promoter code path
  const { data: pc } = await (supabaseAdmin.from("promo_codes") as any)
    .select("id, owner_type, owner_id, discount_type, discount_value, status, expires_at, usage_limit, usage_count, metadata")
    .eq("code", code).maybeSingle();
  if (pc) {
    if (pc.status !== "active") throw new Error("Promo code is no longer active");
    if (pc.expires_at && new Date(pc.expires_at) < new Date()) throw new Error("Promo code has expired");
    if (pc.usage_limit != null && (pc.usage_count ?? 0) >= pc.usage_limit) throw new Error("Promo code usage limit reached");
    if (pc.discount_type !== "percent" || !pc.discount_value) throw new Error("Invalid promo code");
    if (pc.owner_type === "promoter" && addonType === "universal_percent") {
      throw new Error("Promoter codes only apply to subscriptions or featured add-ons");
    }

    const stripeCoupon = await stripe.coupons.create({
      percent_off: pc.discount_value,
      duration: "once",
      name: `Spott ${code}`,
      metadata: { spott_promo_code_id: pc.id, spott_code: code, spott_source: pc.owner_type },
    });

    // Insert redemption; DB trigger enforces addon_type scope for promoter codes.
    await (supabaseAdmin.from("coupon_redemptions") as any).insert({
      code,
      promo_code_id: pc.id,
      redeemed_by_user: userId,
      addon_type: addonType,
      source_type: pc.owner_type,
      promoter_id: pc.owner_type === "promoter" ? pc.owner_id : null,
      commission_cents: 0,
      commission_status: pc.owner_type === "promoter" ? "pending" : "void",
    });

    await (supabaseAdmin.from("promo_codes") as any)
      .update({ usage_count: (pc.usage_count ?? 0) + 1 })
      .eq("id", pc.id);

    return { discounts: [{ coupon: stripeCoupon.id }] };
  }

  // 2) Legacy admin_coupons universal code path
  const { data: c } = await (supabaseAdmin.from("admin_coupons") as any)
    .select("id, is_universal, status, expires_at, max_uses, uses_count, discount_kind, discount_value, code, promoter_id")
    .eq("code", code).maybeSingle();
  if (!c || !c.is_universal) throw new Error("Invalid promo code");
  if (c.status !== "active") throw new Error("Promo code is no longer active");
  if (c.expires_at && new Date(c.expires_at) < new Date()) throw new Error("Promo code has expired");
  if (c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses) throw new Error("Promo code usage limit reached");
  if (c.discount_kind !== "percent_off" || !c.discount_value) throw new Error("Invalid promo code");

  const stripeCoupon = await stripe.coupons.create({
    percent_off: c.discount_value,
    duration: "once",
    name: `Spott ${c.code}`,
    metadata: { spott_coupon_id: c.id, spott_code: c.code },
  });

  await (supabaseAdmin.from("coupon_redemptions") as any).insert({
    coupon_id: c.id,
    code: c.code,
    redeemed_by_user: userId,
    addon_type: addonType,
    source_type: "admin",
    promoter_id: c.promoter_id ?? null,
    commission_cents: 0,
    commission_status: "void",
  });

  const newCount = (c.uses_count ?? 0) + 1;
  const newStatus = c.max_uses != null && newCount >= c.max_uses ? "exhausted" : "active";
  await (supabaseAdmin.from("admin_coupons") as any).update({
    uses_count: newCount,
    last_redeemed_at: new Date().toISOString(),
    status: newStatus,
  }).eq("id", c.id);

  return { discounts: [{ coupon: stripeCoupon.id }] };
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

// ─── Subscription checkout (Pro / Business) ──────────────────────────────────
// SECURITY: requires authenticated user — userId/email are sourced from the
// verified JWT, never trusted from client input.
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    quantity?: number;
    returnUrl: string;
    environment: StripeEnv;
    businessId?: string;
    couponCode?: string;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    if (data.businessId && !/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    if (data.couponCode && !/^[A-Z0-9_-]{4,32}$/i.test(data.couponCode)) throw new Error("Invalid coupon code");
    envSchema.parse(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: { user } } = await supabase.auth.getUser();
    const customerEmail = user?.email ?? undefined;

    const stripe = createStripeClient(data.environment);

    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: customerEmail,
      userId,
    });

    let productDescription: string | undefined;
    if (!isRecurring) {
      const productId = typeof stripePrice.product === "string"
        ? stripePrice.product
        : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);
      productDescription = product.name;
    }

    // Founding Member: 90-day free trial on all recurring plans.
    const FOUNDING_TRIAL_DAYS = 90;

    const { discounts } = await resolvePromoCode(stripe, data.couponCode, userId, "subscription");

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      ...(discounts && { discounts }),
      ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
      metadata: { userId, ...(data.businessId && { businessId: data.businessId }), ...(data.couponCode && { spott_coupon_code: data.couponCode.toUpperCase() }) },
      ...(isRecurring && {
        subscription_data: {
          trial_period_days: FOUNDING_TRIAL_DAYS,
          metadata: {
            userId,
            founding_member: "true",
            ...(data.businessId && { businessId: data.businessId }),
            ...(data.couponCode && { spott_coupon_code: data.couponCode.toUpperCase() }),
          },
        },
      }),
      managed_payments: { enabled: true },
    } as any);

    return session.client_secret;
  });

// ─── One-time add-on checkout (always tied to a business) ────────────────────
const addonSchema = z.object({
  priceId: z.enum(["spott_bump_up_once", "spott_photo_pack_once", "spott_feature_7d_once"]),
  businessId: z.string().uuid(),
  returnUrl: z.string().url(),
  environment: envSchema,
  couponCode: z.string().min(4).max(32).regex(/^[A-Z0-9_-]+$/i).optional(),
});

export const createAddonCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => addonSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, owner_id, name")
      .eq("id", data.businessId)
      .maybeSingle();
    if (!biz || biz.owner_id !== userId) throw new Error("Not your business");

    const { data: { user } } = await supabase.auth.getUser();

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Add-on not found");
    const stripePrice = prices.data[0];

    const customerId = await resolveOrCreateCustomer(stripe, {
      userId,
      email: user?.email ?? undefined,
    });

    const productId = typeof stripePrice.product === "string"
      ? stripePrice.product
      : stripePrice.product.id;
    const product = await stripe.products.retrieve(productId);

    const { discounts } = await resolvePromoCode(stripe, data.couponCode, userId, "subscription");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      customer: customerId,
      ...(discounts && { discounts }),
      payment_intent_data: { description: `${product.name} — ${biz.name}` },
      metadata: {
        userId,
        businessId: data.businessId,
        addonType: data.priceId,
        ...(data.couponCode && { spott_coupon_code: data.couponCode.toUpperCase() }),
      },
      managed_payments: { enabled: true },
    } as any);

    return session.client_secret;
  });

// ─── Customer Portal ────────────────────────────────────────────────────────
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => {
    envSchema.parse(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError || !sub?.stripe_customer_id) throw new Error("No subscription found");

    const stripe = createStripeClient(data.environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      ...(data.returnUrl && { return_url: data.returnUrl }),
    });
    return portal.url;
  });

// ─── In-place plan switch with proration ────────────────────────────────────
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { priceId: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(d.priceId)) throw new Error("Invalid priceId");
    envSchema.parse(d.environment);
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id,status,current_period_end,price_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) throw new Error("No active subscription to change");
    if (sub.price_id === data.priceId) return { ok: true, unchanged: true };

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Target price not found");
    const targetPrice = prices.data[0];

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string);
    const currentItem = stripeSub.items.data[0];

    await stripe.subscriptions.update(sub.stripe_subscription_id as string, {
      items: [{ id: currentItem.id, price: targetPrice.id }],
      proration_behavior: "always_invoice",
      cancel_at_period_end: false,
      metadata: { ...stripeSub.metadata, userId },
    });

    return { ok: true };
  });
