import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIAL_DAYS = 7;
const TRIAL_SECONDS = 20 * 60; // 20 minutes

export type VoiceTrialStatus = {
  allowed: boolean;
  reason: "active_trial" | "card_on_file" | "subscribed" | "expired_time" | "expired_minutes";
  secondsUsed: number;
  secondsLimit: number;
  secondsRemaining: number;
  daysRemaining: number;
  trialEndsAt: string;
  cardOnFile: boolean;
};

export const getVoiceTrial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VoiceTrialStatus> => {
    const { supabase, userId } = context;

    // Bypass if user has an active paid subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      return {
        allowed: true,
        reason: "subscribed",
        secondsUsed: 0,
        secondsLimit: TRIAL_SECONDS,
        secondsRemaining: TRIAL_SECONDS,
        daysRemaining: TRIAL_DAYS,
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString(),
        cardOnFile: true,
      };
    }

    let { data: row } = await supabase
      .from("sparq_voice_trials")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!row) {
      const ins = await supabase
        .from("sparq_voice_trials")
        .insert({ user_id: userId })
        .select("*")
        .single();
      row = ins.data;
    }

    const firstUsedAt = new Date(row!.first_used_at as string).getTime();
    const trialEnds = firstUsedAt + TRIAL_DAYS * 86400000;
    const now = Date.now();
    const daysRemaining = Math.max(0, Math.ceil((trialEnds - now) / 86400000));
    const secondsUsed = row!.seconds_used as number;
    const secondsRemaining = Math.max(0, TRIAL_SECONDS - secondsUsed);
    const cardOnFile = !!row!.card_on_file;

    if (cardOnFile) {
      return {
        allowed: true, reason: "card_on_file",
        secondsUsed, secondsLimit: TRIAL_SECONDS, secondsRemaining,
        daysRemaining, trialEndsAt: new Date(trialEnds).toISOString(), cardOnFile,
      };
    }

    if (now > trialEnds) {
      return {
        allowed: false, reason: "expired_time",
        secondsUsed, secondsLimit: TRIAL_SECONDS, secondsRemaining,
        daysRemaining: 0, trialEndsAt: new Date(trialEnds).toISOString(), cardOnFile,
      };
    }
    if (secondsRemaining <= 0) {
      return {
        allowed: false, reason: "expired_minutes",
        secondsUsed, secondsLimit: TRIAL_SECONDS, secondsRemaining: 0,
        daysRemaining, trialEndsAt: new Date(trialEnds).toISOString(), cardOnFile,
      };
    }
    return {
      allowed: true, reason: "active_trial",
      secondsUsed, secondsLimit: TRIAL_SECONDS, secondsRemaining,
      daysRemaining, trialEndsAt: new Date(trialEnds).toISOString(), cardOnFile,
    };
  });

export const recordVoiceSeconds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { seconds: number }) => ({
    seconds: Math.max(0, Math.min(120, Math.round(data.seconds || 0))),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.seconds <= 0) return { ok: true };
    const { data: row } = await supabase
      .from("sparq_voice_trials")
      .select("seconds_used")
      .eq("user_id", userId)
      .maybeSingle();
    const current = (row?.seconds_used as number | undefined) ?? 0;
    await supabase.from("sparq_voice_trials").upsert({
      user_id: userId,
      seconds_used: current + data.seconds,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });
