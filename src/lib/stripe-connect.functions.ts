// Stripe Connect Express onboarding for promoters + payout requests.
// Uses the shared gateway-routed Stripe client (createStripeClient).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";
import { z } from "zod";

function envFromToken(): StripeEnv {
  // Server-side: derive from what env we have keys for. Prefer live if configured.
  return process.env.STRIPE_LIVE_API_KEY ? "live" : "sandbox";
}

async function loadPromoter(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("promoters")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You are not a registered promoter.");
  if (data.status !== "approved") throw new Error("Your promoter application must be approved before setting up payouts.");
  return data;
}

export const startConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ return_url: z.string().url(), refresh_url: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    try {
      const promoter = await loadPromoter(supabase, userId);
      const env = envFromToken();
      const stripe = createStripeClient(env);

      let accountId: string | null = promoter.stripe_connect_account_id ?? null;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "CA",
          email: promoter.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: promoter.company_name ? "company" : "individual",
          metadata: {
            promoter_id: promoter.id,
            user_id: userId,
          },
        });
        accountId = account.id;
        await supabase
          .from("promoters")
          .update({
            stripe_connect_account_id: accountId,
            stripe_connect_status: "onboarding",
            stripe_connect_last_synced_at: new Date().toISOString(),
          })
          .eq("id", promoter.id);
      }

      const link = await stripe.accountLinks.create({
        account: accountId!,
        return_url: data.return_url,
        refresh_url: data.refresh_url,
        type: "account_onboarding",
      });

      return { url: link.url, account_id: accountId };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const refreshConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    try {
      const promoter = await loadPromoter(supabase, userId);
      if (!promoter.stripe_connect_account_id) {
        return { connected: false };
      }
      const env = envFromToken();
      const stripe = createStripeClient(env);
      const account = await stripe.accounts.retrieve(promoter.stripe_connect_account_id);
      const status = account.details_submitted
        ? account.charges_enabled && account.payouts_enabled
          ? "active"
          : "pending_verification"
        : "onboarding";

      await supabase
        .from("promoters")
        .update({
          stripe_connect_status: status,
          stripe_connect_charges_enabled: !!account.charges_enabled,
          stripe_connect_payouts_enabled: !!account.payouts_enabled,
          stripe_connect_details_submitted: !!account.details_submitted,
          stripe_connect_last_synced_at: new Date().toISOString(),
        })
        .eq("id", promoter.id);

      return {
        connected: true,
        status,
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
        details_submitted: !!account.details_submitted,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ amount_cents: z.number().int().min(5000).max(500000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const promoter = await loadPromoter(supabase, userId);
    if (!promoter.stripe_connect_payouts_enabled) {
      throw new Error("Complete Stripe payout onboarding before requesting a payout.");
    }

    // Compute available balance: sum earned_cents - already-requested (non-rejected).
    const { data: earnings } = await supabase
      .from("promoter_earnings")
      .select("amount_cents,status")
      .eq("promoter_id", promoter.id);
    const earned = (earnings ?? [])
      .filter((r: any) => r.status !== "reversed")
      .reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0);
    const { data: requests } = await supabase
      .from("promoter_payout_requests")
      .select("amount_cents,status")
      .eq("promoter_id", promoter.id);
    const locked = (requests ?? [])
      .filter((r: any) => r.status !== "rejected")
      .reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0);
    const available = Math.max(0, earned - locked);

    if (data.amount_cents > available) {
      throw new Error(
        `Available balance is $${(available / 100).toFixed(2)}. Requested $${(data.amount_cents / 100).toFixed(2)}.`,
      );
    }

    const { data: row, error } = await supabase
      .from("promoter_payout_requests")
      .insert({
        promoter_id: promoter.id,
        amount_cents: data.amount_cents,
        currency: "CAD",
        status: "requested",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyPayoutRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: promoter } = await supabase
      .from("promoters")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!promoter) return [];
    const { data } = await supabase
      .from("promoter_payout_requests")
      .select("*")
      .eq("promoter_id", promoter.id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });
