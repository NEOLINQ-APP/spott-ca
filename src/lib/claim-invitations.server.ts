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

// Real, brand-matched shell for the step-1 "introduction" email -- the one
// that actually matters most for first impressions. Table-based layout
// (not flexbox/grid) since those aren't reliably supported across real
// email clients, especially Outlook. Colors/logo are the same real,
// sampled brand assets from the earlier design-review pass (real
// spott-logo pixel colors + the "Midnight Indigo" theme tokens in
// src/styles.css), not invented -- see [[spott_ca_claim_listing_campaign]].
// Dark-mode handled the same proven way as that pass: colors re-locked
// under prefers-color-scheme rather than left to an email client's guess.
function brandedIntroShell(biz: Biz, claimHref: string, unsubscribeUrl: string) {
  const logoHeader = "https://storage.bario.ca/bario-storage/spott/images/campaign-assets/spott-logo-plated-header.png";
  const logoFooter = "https://storage.bario.ca/bario-storage/spott/images/campaign-assets/spott-logo-plated-footer.png";
  const cityLine = biz.city ? ` in ${biz.city}` : "";
  return `<!--[if mso]><style>table{border-collapse:collapse}</style><![endif]-->
<style>
  @media (prefers-color-scheme: dark) {
    .spott-shell, .spott-header, .spott-logo-plate { background:#ffffff !important; }
    .spott-body-text { color:#333a4d !important; }
    .spott-heading { color:#051d53 !important; }
    .spott-card { background:#ebedfc !important; border-color:#dadef5 !important; }
    .spott-footer-text, .spott-footer-text a { color:#9aa2b8 !important; }
  }
</style>
<div style="background:#eef1f8;padding:32px 12px;">
<table role="presentation" class="spott-shell" width="100%" style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border-collapse:collapse;" cellpadding="0" cellspacing="0">
  <tr><td class="spott-header" style="background:#ffffff;padding:24px 32px;">
    <span class="spott-logo-plate" style="background:#ffffff;border-radius:8px;display:inline-block;padding:6px 10px;">
      <img src="${logoHeader}" width="127" height="44" alt="Spott.ca" style="display:block;border:0;height:44px;width:auto;" />
    </span>
  </td></tr>
  <tr><td style="background:linear-gradient(160deg,#4340d6 0%,#1272f3 62%,#1272f3 100%);padding:40px 32px;text-align:center;">
    <span style="display:inline-block;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:6px 14px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Free forever</span>
    <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;margin:16px 0 0;">Your business is already<br/>online on Spott.ca</h1>
  </td></tr>
  <tr><td style="padding:32px 32px 8px;">
    <p class="spott-heading" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#051d53;margin:0 0 14px;">Hi ${biz.name} 👋</p>
    <p class="spott-body-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#333a4d;margin:0 0 18px;">
      Good news — while building out Spott.ca's directory of Canadian businesses, we found <strong>${biz.name}</strong> and created a free listing so people searching${cityLine} can already discover you.
    </p>
    <table role="presentation" class="spott-card" width="100%" style="background:#ebedfc;border:1px solid #dadef5;border-radius:12px;margin:0 0 20px;border-collapse:collapse;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 18px;">
        <div style="font-weight:700;font-size:15px;color:#051d53;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${biz.name}</div>
        <div style="font-size:13px;color:#525466;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Live on Spott.ca${cityLine} · Unclaimed</div>
      </td></tr>
    </table>
    <p class="spott-body-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#333a4d;margin:0 0 24px;">
      Right now it's just the basics. <strong>Claiming it is free</strong> and takes about two minutes — you can add photos, hours and contact info, and reply to customer reviews directly.
    </p>
  </td></tr>
  <tr><td style="text-align:center;padding:0 32px 28px;">
    <a href="${claimHref}" style="display:inline-block;background:#4340d6;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:700;font-size:15px;text-decoration:none;padding:15px 34px;border-radius:10px;">Claim My Free Listing</a>
    <p class="spott-body-text" style="font-size:12.5px;color:#525466;margin:12px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">No credit card needed — just confirm it's your business.</p>
  </td></tr>
  <tr><td style="padding:0 36px;"><div style="height:1px;background:#e7eaf3;"></div></td></tr>
  <tr><td style="padding:24px 36px 32px;text-align:center;">
    <img src="${logoFooter}" width="87" height="30" alt="Spott.ca" style="display:block;margin:0 auto 12px;border:0;height:30px;width:auto;" />
    <p class="spott-footer-text" style="font-size:12px;color:#9aa2b8;line-height:1.6;margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">You're receiving this because ${biz.name} appears in Spott.ca's public business directory.</p>
    <p class="spott-footer-text" style="font-size:12px;color:#9aa2b8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Spott.ca · Canada &nbsp;·&nbsp; <a href="${unsubscribeUrl}" style="color:#9aa2b8;">Unsubscribe</a></p>
  </td></tr>
</table>
</div>`;
}

type Biz = { id: string; name: string; slug: string; city: string | null; email: string | null };

function claimUrl(token: string) {
  return `${SITE_URL}/claim-business/${token}`;
}

function emailStep1(biz: Biz, firstName: string, claimHref: string, unsubHref: string) {
  return {
    subject: `${biz.name}, your Spott.ca listing is live — claim it free`,
    html: brandedIntroShell(biz, claimHref, unsubHref),
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
