import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SparqSettings = {
  id: string;
  enabled: boolean;
  model: string;
  temperature: number;
  system_prompt_override: string | null;
  additional_instructions: string | null;
  offtopic_redirect: string;
  voice_default: string;
  voice_speed: number;
  business_strict_mode: boolean;
  business_additional_rules: string | null;
  updated_at: string;
};

export const getSparqSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("sparq_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as unknown as SparqSettings | null;
  });

export const updateSparqSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<SparqSettings>) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const payload = {
      enabled: data.enabled ?? true,
      model: data.model ?? "google/gemini-3-flash-preview",
      temperature: data.temperature ?? 0.7,
      system_prompt_override: data.system_prompt_override ?? null,
      additional_instructions: data.additional_instructions ?? null,
      offtopic_redirect:
        data.offtopic_redirect ??
        "I'm built to help you with Spott.ca and the businesses on it.",
      voice_default: data.voice_default ?? "alloy",
      voice_speed: data.voice_speed ?? 1.0,
      business_strict_mode: data.business_strict_mode ?? true,
      business_additional_rules: data.business_additional_rules ?? null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase
      .from("sparq_settings")
      .update(payload)
      .eq("id", "global")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as SparqSettings;
  });
