/**
 * Resend notification dispatcher.
 * Server-only. Gracefully no-ops when RESEND_API_KEY is not configured
 * so calling code never breaks the transaction path.
 *
 * Switched from Brevo 2026-08-24 — real events pulled from Brevo's own API
 * showed 100% of sends since at least 2026-08-21 were rejected at the
 * sender-validation step ("notifications@spott.ca is not valid — validate
 * your sender or authenticate your domain"): spott.ca was never added as a
 * verified sender or authenticated domain on that Brevo account (confirmed
 * via /v3/senders and /v3/senders/domains, both empty of spott.ca). Brevo's
 * synchronous API response still returned success for these, which is why
 * DB-logged "sent" counts looked real even though nothing was delivered —
 * the actual rejection only shows up as a separate async event. Resend
 * already has spott.ca fully verified (DKIM/MX/SPF, confirmed via
 * /domains), so this reuses existing working infrastructure instead of
 * fixing/paying for a second ESP.
 */

type SendEmailArgs = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
  bcc?: string | string[];
};

const RESEND_API_BASE = "https://api.resend.com";

const FROM_EMAIL = process.env.NOTIFICATIONS_FROM_EMAIL || "notifications@spott.ca";
const FROM_NAME = "Spott.ca";

export async function sendEmail(args: SendEmailArgs): Promise<{ ok: boolean; reason?: string }> {
  if (!args.to) return { ok: false, reason: "no_recipient" };
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, reason: "resend_not_configured" };
  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [args.toName ? `${args.toName} <${args.to}>` : args.to],
        subject: args.subject,
        html: args.html,
        reply_to: args.replyTo,
        bcc: args.bcc ? (Array.isArray(args.bcc) ? args.bcc : [args.bcc]) : undefined,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(`[notifications] Resend send failed [${res.status}]: ${text}`);
      return { ok: false, reason: text };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[notifications] Resend dispatch error:", err);
    return { ok: false, reason: String(err) };
  }
}

function shell(title: string, body: string, cta?: { label: string; href: string }) {
  const btn = cta
    ? `<p style="margin:24px 0"><a href="${cta.href}" style="background:#ea580c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${cta.label}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
    <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.5;color:#333">${body}</div>
    ${btn}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="font-size:12px;color:#666">Sent by Spott.ca · <a href="https://spott.ca" style="color:#ea580c">spott.ca</a></p>
  </div>`;
}

/** Welcome email on signup. */
export function notifyWelcome(to: string, name?: string) {
  return sendEmail({
    to,
    toName: name,
    subject: "Welcome to Spott.ca 🎉",
    html: shell(
      `Welcome to Spott${name ? `, ${name}` : ""}!`,
      "You now have access to the local marketplace, verified business directory, vehicle listings and your Sparq AI assistant. Let's get you set up — post a listing, claim your business, or explore local deals.",
      { label: "Open Spott", href: "https://spott.ca/" },
    ),
  });
}

/** Buyer receipt after checkout paid. */
export function notifyOrderPaidBuyer(to: string, orderId: string, totalCents: number, currency = "CAD") {
  const amount = new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(totalCents / 100);
  return sendEmail({
    to,
    subject: `Payment received — order ${orderId.slice(0, 8)}`,
    html: shell(
      "Your payment is held safely in escrow",
      `We've received your payment of <strong>${amount}</strong>. The seller has been notified. Your funds stay protected by Spott until you confirm receipt of the item.`,
      { label: "View order", href: `https://spott.ca/orders` },
    ),
  });
}

/** Seller alert after order paid. */
export function notifyOrderPaidSeller(to: string, orderId: string) {
  return sendEmail({
    to,
    subject: `You've made a sale on Spott! Order ${orderId.slice(0, 8)}`,
    html: shell(
      "You've got a paid order",
      "A buyer has paid for one of your listings. Payment is held in escrow — arrange delivery/pickup, then the buyer confirms receipt to release the funds.",
      { label: "Open seller dashboard", href: "https://spott.ca/dashboard" },
    ),
  });
}

/**
 * Alert a business owner that a real lead came in (business_leads row).
 * Previously these rows were written with zero signal to the owner —
 * they'd only ever discover a lead by manually checking a dashboard tab
 * that, until now, didn't even exist. See leads.functions.ts's
 * submitBusinessLead.
 */
export function notifyNewBusinessLead(to: string, businessName: string, leadName: string, message?: string | null) {
  return sendEmail({
    to,
    subject: `New lead for ${businessName} on Spott`,
    html: shell(
      `${leadName} is interested in ${businessName}`,
      message ? `<em>"${message.slice(0, 300)}"</em>` : "They'd like to hear from you — check your Leads tab for their contact details.",
      { label: "View lead", href: "https://spott.ca/dashboard" },
    ),
  });
}

/** Alert when a marketplace message is received. */
export function notifyNewMessage(to: string, senderName: string, snippet: string, threadUrl?: string) {
  return sendEmail({
    to,
    subject: `New message from ${senderName} on Spott`,
    html: shell(
      `${senderName} sent you a message`,
      `<em>"${snippet.slice(0, 200)}"</em>`,
      { label: "Open conversation", href: threadUrl || "https://spott.ca/dashboard" },
    ),
  });
}

/** Prompt buyer to rate a completed transaction. */
export function notifyRateTransaction(to: string, listingTitle: string, listingId: string) {
  return sendEmail({
    to,
    subject: `How was your purchase of "${listingTitle}"?`,
    html: shell(
      "Rate this transaction",
      `Your seller marked "${listingTitle}" as sold. Leave a quick rating — it helps other buyers and sellers on Spott trust each other.`,
      { label: "Rate the seller", href: `https://spott.ca/marketplace/${listingId}` },
    ),
  });
}

/** Real Spott owner is asked to approve a BARIO CRM connection request. */
export function notifyCrmConnectionRequest(to: string, orgName: string, approveUrl: string) {
  return sendEmail({
    to,
    subject: `${orgName} wants to connect a CRM to your Spott listing`,
    html: shell(
      "A business management tool wants to connect",
      `<strong>${orgName}</strong> is asking to connect their CRM to your Spott business listing, so your leads and listing updates can flow into it automatically. Only approve this if you recognize and trust ${orgName}.`,
      { label: "Review the request", href: approveUrl },
    ),
  });
}

/** Alert user about new listings matching a saved search. */
export function notifySavedSearchMatches(
  to: string,
  label: string,
  matches: Array<{ title: string; price_cents: number | null; city: string | null; id: string }>,
) {
  const rows = matches
    .slice(0, 8)
    .map((m) => {
      const price =
        typeof m.price_cents === "number"
          ? `$${(m.price_cents / 100).toLocaleString("en-CA")}`
          : "";
      const city = m.city ? ` · ${m.city}` : "";
      return `<li style="margin:8px 0"><a href="https://spott.ca/marketplace/${m.id}" style="color:#ea580c;text-decoration:none;font-weight:600">${m.title}</a> <span style="color:#666">${price}${city}</span></li>`;
    })
    .join("");
  return sendEmail({
    to,
    subject: `${matches.length} new match${matches.length === 1 ? "" : "es"} for "${label}"`,
    html: shell(
      `New listings for "${label}"`,
      `We found ${matches.length} new listing${matches.length === 1 ? "" : "s"} matching your saved search since we last checked:<ul style="padding-left:18px;margin:12px 0">${rows}</ul>`,
      { label: "See all matches", href: "https://spott.ca/marketplace" },
    ),
  });
}
