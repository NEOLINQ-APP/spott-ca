import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

const envSchema = z.enum(["sandbox", "live"]);

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
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    if (data.businessId && !/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
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

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
      metadata: { userId, ...(data.businessId && { businessId: data.businessId }) },
      ...(isRecurring && { subscription_data: { metadata: { userId, ...(data.businessId && { businessId: data.businessId }) } } }),
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
});

export const createAddonCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => addonSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the caller owns the target business.
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      customer: customerId,
      payment_intent_data: { description: `${product.name} — ${biz.name}` },
      metadata: {
        userId,
        businessId: data.businessId,
        addonType: data.priceId,
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
