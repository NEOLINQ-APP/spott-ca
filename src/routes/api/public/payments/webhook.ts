import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function resolvePriceId(item: any): string | undefined {
  return item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
}

async function applyExtraTagsFromSubscription(subscription: any, priceId?: string) {
  if (priceId !== "spott_extra_tags_monthly" && priceId !== "spott_extra_tags_yearly") return;
  const businessId = subscription.metadata?.businessId;
  if (!businessId) return;
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  if (!periodEnd) return;
  const until = new Date(periodEnd * 1000).toISOString();
  await getSupabase().from("businesses").update({ extra_tags_until: until }).eq("id", businessId);
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  await applyExtraTagsFromSubscription(subscription, priceId);
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  // Upsert so in-place plan switches that happened via subscriptions.update
  // (without going through checkout) still land a row.
  const userId = subscription.metadata?.userId;
  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  await applyExtraTagsFromSubscription(subscription, priceId);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

// ─── One-time add-on fulfillment ──────────────────────────────────────────
async function fulfillAddon(session: any, env: StripeEnv) {
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;

  const meta = session.metadata ?? {};
  const userId: string | undefined = meta.userId;
  const businessId: string | undefined = meta.businessId;
  const addonType: string | undefined = meta.addonType;
  if (!userId || !businessId || !addonType) {
    console.log("Skipping addon fulfillment — missing metadata", { sessionId: session.id });
    return;
  }

  const sb = getSupabase();

  // Idempotent insert: stripe_session_id is UNIQUE — second delivery becomes a no-op.
  const { data: existing } = await sb
    .from("addon_purchases")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return;

  // Expand the session to learn the paid amount + payment intent.
  const stripe = createStripeClient(env);
  const full = await stripe.checkout.sessions.retrieve(session.id);

  // Compute boost effect
  const now = new Date();
  let expiresAt: Date | null = null;
  const update: Record<string, any> = {};

  // Read current values so we can extend (not overwrite) active boosts.
  const { data: biz } = await sb
    .from("businesses")
    .select("featured_until, bumped_until, photo_pack_bonus")
    .eq("id", businessId)
    .maybeSingle();

  const baseFeatured = biz?.featured_until && new Date(biz.featured_until) > now
    ? new Date(biz.featured_until)
    : now;
  const baseBumped = biz?.bumped_until && new Date(biz.bumped_until) > now
    ? new Date(biz.bumped_until)
    : now;

  if (addonType === "spott_bump_up_once") {
    expiresAt = new Date(baseBumped.getTime() + 24 * 60 * 60 * 1000);
    update.bumped_until = expiresAt.toISOString();
  } else if (addonType === "spott_feature_7d_once") {
    expiresAt = new Date(baseFeatured.getTime() + 7 * 24 * 60 * 60 * 1000);
    update.featured_until = expiresAt.toISOString();
  } else if (addonType === "spott_photo_pack_once") {
    update.photo_pack_bonus = (biz?.photo_pack_bonus ?? 0) + 10;
  }

  if (Object.keys(update).length > 0) {
    await sb.from("businesses").update(update).eq("id", businessId);
  }

  await sb.from("addon_purchases").insert({
    user_id: userId,
    business_id: businessId,
    addon_type: addonType,
    stripe_session_id: session.id,
    stripe_payment_intent: typeof full.payment_intent === "string"
      ? full.payment_intent
      : full.payment_intent?.id ?? null,
    amount_cents: full.amount_total ?? null,
    currency: full.currency ?? null,
    status: "completed",
    environment: env,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    metadata: { mode: session.mode },
  });
}


// ─── Marketplace order fulfillment ────────────────────────────────────────
async function fulfillMarketplaceOrder(session: any, env: StripeEnv) {
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;
  const meta = session.metadata ?? {};
  if (meta.source !== "marketplace_order") return;
  const orderId: string | undefined = meta.orderId;
  if (!orderId) return;

  const sb = getSupabase();
  const stripe = createStripeClient(env);
  const full = await stripe.checkout.sessions.retrieve(session.id);
  const paymentIntent = typeof full.payment_intent === "string"
    ? full.payment_intent
    : full.payment_intent?.id ?? null;

  await sb
    .from("marketplace_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent: paymentIntent,
    })
    .eq("id", orderId)
    .eq("status", "pending");
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillAddon(event.data.object, env);
      await fulfillMarketplaceOrder(event.data.object, env);
      break;
    default:
      console.log("Unhandled payments webhook event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook missing/invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
