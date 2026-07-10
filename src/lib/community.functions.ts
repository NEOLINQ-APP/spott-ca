import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

/** Public read: fetch a profile by @username (no auth required). */
export const getProfileByUsername = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) =>
    z.object({ username: z.string().min(1).max(24) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profileRaw, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url,cover_url,bio,location,contact_pref,contact_email,contact_phone,created_at",
      )
      .eq("username", data.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profileRaw) return { profile: null, roles: [], counts: { followers: 0, following: 0 } };

    // Honor the user's contact preference: never leak email/phone unless the
    // profile explicitly opted to share that channel publicly.
    const profile = {
      ...profileRaw,
      contact_email: profileRaw.contact_pref === "email" ? profileRaw.contact_email : null,
      contact_phone: profileRaw.contact_pref === "phone" ? profileRaw.contact_phone : null,
    };

    const [{ data: roles }, { count: followers }, { count: following }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", profile.id),
      supabaseAdmin
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("followee_id", profile.id),
      supabaseAdmin
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

    return {
      profile,
      roles: (roles ?? []).map((r: any) => r.role as string),
      counts: { followers: followers ?? 0, following: following ?? 0 },
    };
  });

/** Update current user's profile (community fields). */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        username: z
          .string()
          .regex(USERNAME_RE, "3–24 chars, letters/numbers/underscore only")
          .optional(),
        display_name: z.string().min(1).max(80).optional(),
        bio: z.string().max(500).nullish(),
        location: z.string().max(120).nullish(),
        cover_url: z.string().url().nullish(),
        avatar_url: z.string().url().nullish(),
        contact_pref: z.enum(["chat", "email", "phone"]).optional(),
        contact_email: z.string().email().nullish(),
        contact_phone: z.string().max(40).nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.username) {
      // Uniqueness check (case-insensitive)
      const { data: clash } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", data.username)
        .neq("id", userId)
        .maybeSingle();
      if (clash) throw new Error("That username is already taken");
    }

    const patch: Record<string, unknown> = {};
    for (const k of [
      "username",
      "display_name",
      "bio",
      "location",
      "cover_url",
      "avatar_url",
      "contact_pref",
      "contact_email",
      "contact_phone",
    ] as const) {
      if (k in data) patch[k] = (data as any)[k];
    }

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: updated };
  });

/** Load current user's full profile including private contact fields. */
export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url,cover_url,bio,location,contact_pref,contact_email,contact_phone",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

/** Are user A and user B following each other? Used to gate Spott Chat. */
export const checkMutualFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ other_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.other_id === userId) {
      return { mutual: true, iFollow: true, theyFollow: true };
    }
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("followee_id", data.other_id)
        .maybeSingle(),
      supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", data.other_id)
        .eq("followee_id", userId)
        .maybeSingle(),
    ]);
    const iFollow = !!a;
    const theyFollow = !!b;
    return { mutual: iFollow && theyFollow, iFollow, theyFollow };
  });
