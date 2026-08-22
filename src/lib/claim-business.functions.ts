import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getClaimInvitationPreview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invitation } = await supabaseAdmin
      .from("claim_invitations")
      .select("id, business_id, status, expires_at, contact_email")
      .eq("token", data.token)
      .maybeSingle();
    if (!invitation) return { valid: false as const, reason: "not_found" as const };
    if (invitation.status === "claimed") return { valid: false as const, reason: "already_claimed" as const };
    if (invitation.status === "revoked") return { valid: false as const, reason: "revoked" as const };
    if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
      return { valid: false as const, reason: "expired" as const };
    }

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, name, slug, description, city, province, hero_image_url, is_claimed, category_id, categories(name)")
      .eq("id", invitation.business_id)
      .maybeSingle();
    if (!biz) return { valid: false as const, reason: "not_found" as const };
    if (biz.is_claimed) return { valid: false as const, reason: "already_claimed" as const };

    if (invitation.status === "sent") {
      await supabaseAdmin.from("claim_invitations").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", invitation.id);
      try {
        const { enqueueAcquisitionEvent } = await import("./acquisition-events.server");
        await enqueueAcquisitionEvent("spott.claim.started", biz.id, { business_id: biz.id, name: biz.name });
      } catch (e) {
        console.error("spott.claim.started enqueue failed", biz.id, (e as Error).message);
      }
    }

    return {
      valid: true as const,
      business: {
        id: biz.id,
        name: biz.name,
        slug: biz.slug,
        description: biz.description,
        city: biz.city,
        province: biz.province,
        hero_image_url: biz.hero_image_url,
        category: (biz.categories as { name: string } | null)?.name ?? null,
      },
    };
  });

export const completeClaimInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: invitation } = await supabaseAdmin
      .from("claim_invitations")
      .select("id, business_id, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status === "claimed") throw new Error("This listing has already been claimed");
    if (invitation.status === "revoked") throw new Error("This invitation was revoked");
    if (new Date(invitation.expires_at) < new Date()) throw new Error("This invitation has expired");

    const { data: biz, error: bizError } = await supabaseAdmin
      .from("businesses")
      .select("id, slug, name, is_claimed")
      .eq("id", invitation.business_id)
      .single();
    if (bizError || !biz) throw new Error("Business not found");
    if (biz.is_claimed) throw new Error("This listing has already been claimed");

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("businesses")
      .update({ is_claimed: true, owner_id: userId, claim_status: "claimed" })
      .eq("id", biz.id)
      .eq("is_claimed", false) // race guard: only succeeds if still unclaimed
      .select("id");
    if (updateError) throw new Error(updateError.message);
    if (!updatedRows || updatedRows.length === 0) throw new Error("This listing has already been claimed");

    await supabaseAdmin
      .from("claim_invitations")
      .update({ status: "claimed", claimed_at: new Date().toISOString(), claimed_by_user_id: userId })
      .eq("id", invitation.id);

    try {
      const { enqueueAcquisitionEvent } = await import("./acquisition-events.server");
      await enqueueAcquisitionEvent("spott.claim.completed", biz.id, { business_id: biz.id, name: biz.name, owner_user_id: userId });
    } catch (e) {
      console.error("spott.claim.completed enqueue failed", biz.id, (e as Error).message);
    }

    return { ok: true, slug: biz.slug };
  });
