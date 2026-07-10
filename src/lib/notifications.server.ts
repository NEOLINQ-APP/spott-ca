/**
 * Brevo notification dispatcher.
 * Server-only. Gracefully no-ops when BREVO_API_KEY is not configured
 * so calling code never breaks the transaction path.
 */

type SendEmailArgs = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

const FROM_EMAIL = process.env.NOTIFICATIONS_FROM_EMAIL || "notifications@spott.ca";
const FROM_NAME = "Spott.ca";

async function callBrevo(path: string, body: unknown): Promise<{ ok: boolean; status: number; text: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  if (!lovableKey || !brevoKey) {
    return { ok: false, status: 0, text: "brevo_not_configured" };
  }
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": brevoKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export async function sendEmail(args: SendEmailArgs): Promise<{ ok: boolean; reason?: string }> {
  if (!args.to) return { ok: false, reason: "no_recipient" };
  try {
    const r = await callBrevo("/smtp/email", {
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: args.to, name: args.toName }],
      subject: args.subject,
      htmlContent: args.html,
      replyTo: args.replyTo ? { email: args.replyTo } : undefined,
    });
    if (!r.ok) {
      console.warn(`[notifications] Brevo send failed [${r.status}]: ${r.text}`);
      return { ok: false, reason: r.text };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[notifications] Brevo dispatch error:", err);
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
