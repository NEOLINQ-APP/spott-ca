// The claim-invitation drip: mirrors welcome-sequence.server.ts's proven
// shape (day-windowed steps, idempotent via a *_log table with a unique
// (id, step) constraint) rather than inventing a generalized campaign
// engine — there wasn't one to reuse (confirmed: no campaign/drip/sequence
// infra exists anywhere else in this codebase).
import { randomBytes } from "node:crypto";
import { isSuppressed, getOrCreateUnsubscribeToken } from "./suppression.server";

const SITE_URL = "https://www.spott.ca";

function shell(title: string, bodyHtml: string, cta: { label: string; href: string }, unsubscribeUrl: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:580px;margin:0 auto;padding:28px;color:#111">
    <h1 style="font-size:22px;margin:0 0 14px;color:#ea580c">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#333">${bodyHtml}</div>
    <p style="margin:28px 0"><a href="${cta.href}" style="background:#ea580c;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${cta.label}</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0" />
    <p style="font-size:12px;color:#888">Spott.ca — Canada's local marketplace · <a href="https://spott.ca" style="color:#ea580c">spott.ca</a><br/>
    Sent by Spott Team. <a href="${unsubscribeUrl}" style="color:#888">Unsubscribe</a> from these emails.</p>
  </div>`;
}

type Biz = { id: string; name: string; slug: string; city: string | null; email: string | null };

function claimUrl(token: string) {
  return `${SITE_URL}/claim-business/${token}`;
}

function emailStep1(biz: Biz, firstName: string, claimHref: string, unsubHref: string) {
  return {
    subject: "Your business is already on Spott.ca — claim your listing",
    html: shell(
      "Your business is already on Spott",
      `Hi ${firstName},<br/><br/>
       We're reaching out because <strong>${biz.name}</strong> is already listed on Spott.ca — a growing marketplace where customers can discover local businesses.<br/><br/>
       We created a listing for your business so customers can find information about ${biz.name} when searching Spott.<br/><br/>
       We'd like to invite you to claim it.<br/><br/>
       When you claim your listing, you can take control of your business profile and make sure customers see accurate information about your business.<br/><br/>
       With a claimed listing, you can:<br/>
       • Update your business information<br/>
       • Add photos, services and products<br/>
       • Add your website and social links<br/>
       • Showcase what makes your business different<br/>
       • Receive genuine customer feedback<br/>
       • Explore promotional tools available through Spott<br/><br/>
       Your listing is already waiting for you. You don't need to create your listing from scratch — we've already created it for you.<br/><br/>
       Welcome to Spott.ca.<br/><br/>
       Spott Team`,
      { label: "Claim your business", href: claimHref },
      unsubHref,
    ),
  };
}
function emailStep2(biz: Biz, firstName: string, claimHref: string, unsubHref: string) {
  return {
    subject: `Did you know ${biz.name} is already on Spott?`,
    html: shell(
      "Your listing is still waiting",
      `Hi ${firstName},<br/><br/>
       Just checking in — <strong>${biz.name}</strong> is live on Spott${biz.city ? ` in ${biz.city}` : ""}, and customers can already see it. Right now it's showing our default info, not yours.<br/><br/>
       Claiming takes a couple of minutes and lets you control what customers see — photos, hours, services, and how you respond to reviews.`,
      { label: "Claim your listing", href: claimHref },
      unsubHref,
    ),
  };
}
function emailStep3(biz: Biz, firstName: string, claimHref: string, unsubHref: string) {
  return {
    subject: `Take control of your Spott listing, ${firstName}`,
    html: shell(
      "Take control of your Spott listing",
      `Hi ${firstName},<br/><br/>
       Unclaimed listings on Spott can be edited by anyone reporting outdated info — claiming ${biz.name} means only you control what customers see.<br/><br/>
       It also unlocks replying to reviews, adding real photos, and creating offers customers can find directly on your page.`,
      { label: "Claim my business", href: claimHref },
      unsubHref,
    ),
  };
}
function emailStep4(biz: Biz, firstName: string, claimHref: string, unsubHref: string) {
  return {
    subject: `Last call — claim ${biz.name} on Spott.ca`,
    html: shell(
      "Final invitation",
      `Hi ${firstName},<br/><br/>
       This is our last note about claiming <strong>${biz.name}</strong> on Spott.ca. The listing stays live either way — but claiming it is free and takes about two minutes.<br/><br/>
       If now isn't the right time, no worries — you can always claim it later from your listing page.`,
      { label: "Claim your business", href: claimHref },
      unsubHref,
    ),
  };
}

const STEP_BUILDERS = [emailStep1, emailStep2, emailStep3, emailStep4];
// Days after the invitation's sent_at before each step becomes eligible.
const STEP_DAY_OFFSETS = [0, 3, 7, 14];

async function sendStep(supabaseAdmin: any, invitation: { id: string; token: string; contact_email: string; contact_name: string | null }, biz: Biz, step: number): Promise<boolean> {
  if (await isSuppressed(invitation.contact_email)) return false;

  const { sendEmail } = await import("./notifications.server");
  const unsubToken = await getOrCreateUnsubscribeToken(invitation.contact_email);
  const unsubHref = `${SITE_URL}/unsubscribe/${unsubToken}`;
  const href = claimUrl(invitation.token);
  const firstName = invitation.contact_name?.split(" ")[0] ?? "there";

  const msg = STEP_BUILDERS[step - 1](biz, firstName, href, unsubHref);
  const result = await sendEmail({ to: invitation.contact_email, toName: invitation.contact_name ?? undefined, subject: msg.subject, html: msg.html });
  if (!result.ok) return false;

  await supabaseAdmin.from("claim_invitation_log").insert({ invitation_id: invitation.id, step });
  await supabaseAdmin.from("claim_invitations").update({ campaign_step: step }).eq("id", invitation.id);
  return true;
}

export async function runClaimCampaign(opts: { newInvitationLimit?: number; followUpLimit?: number } = {}): Promise<{ started: number; followUpsSent: number; expired: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const newInvitationLimit = opts.newInvitationLimit ?? 20;
  const followUpLimit = opts.followUpLimit ?? 100;

  // 1. Start new invitations for eligible, never-invited businesses.
  const { data: eligible } = await supabaseAdmin
    .from("businesses")
    .select("id, name, slug, city, email")
    .eq("claim_status", "unclaimed")
    .eq("status", "approved")
    .not("email", "is", null)
    .limit(newInvitationLimit * 3); // overfetch; some will be filtered by suppression/existing invitation below

  let started = 0;
  for (const biz of (eligible ?? []) as Biz[]) {
    if (started >= newInvitationLimit) break;
    if (!biz.email) continue;
    if (await isSuppressed(biz.email)) continue;

    const { data: existingInvite } = await supabaseAdmin
      .from("claim_invitations")
      .select("id")
      .eq("business_id", biz.id)
      .not("status", "in", "(expired,revoked,claimed)")
      .maybeSingle();
    if (existingInvite) continue;

    const token = randomBytes(24).toString("hex");
    const { data: invitation, error } = await supabaseAdmin
      .from("claim_invitations")
      .insert({ business_id: biz.id, token, contact_email: biz.email, status: "sent" })
      .select("id, token, contact_email, contact_name")
      .single();
    if (error || !invitation) continue;

    const sent = await sendStep(supabaseAdmin, invitation, biz, 1);
    if (sent) {
      await supabaseAdmin.from("businesses").update({ claim_status: "invited" }).eq("id", biz.id);
      started++;
      try {
        const { enqueueAcquisitionEvent } = await import("./acquisition-events.server");
        await enqueueAcquisitionEvent("spott.business.created", biz.id, { business_id: biz.id, name: biz.name });
      } catch (e) {
        console.error("acquisition event enqueue failed", biz.id, (e as Error).message);
      }
    }
  }

  // 2. Follow-ups for existing active invitations whose next step is due.
  const { data: activeInvitations } = await supabaseAdmin
    .from("claim_invitations")
    .select("id, token, contact_email, contact_name, campaign_step, sent_at, business_id, businesses(id, name, slug, city, email)")
    .in("status", ["sent", "opened", "claim_started"])
    .lt("campaign_step", 4)
    .limit(followUpLimit);

  let followUpsSent = 0;
  let expired = 0;
  for (const inv of (activeInvitations ?? []) as any[]) {
    const biz = inv.businesses as Biz | null;
    if (!biz) continue;
    const nextStep = inv.campaign_step + 1;
    const dueAt = new Date(inv.sent_at).getTime() + STEP_DAY_OFFSETS[nextStep - 1] * 24 * 60 * 60 * 1000;
    if (Date.now() < dueAt) continue;

    const sent = await sendStep(supabaseAdmin, inv, biz, nextStep);
    if (sent) followUpsSent++;
  }

  // 3. Expire invitations that hit step 4 long enough ago with no claim.
  const { data: staleRows } = await supabaseAdmin
    .from("claim_invitations")
    .select("id")
    .eq("campaign_step", 4)
    .in("status", ["sent", "opened", "claim_started"])
    .lt("expires_at", new Date().toISOString());
  for (const row of (staleRows ?? []) as { id: string }[]) {
    await supabaseAdmin.from("claim_invitations").update({ status: "expired" }).eq("id", row.id);
    expired++;
  }

  return { started, followUpsSent, expired };
}
