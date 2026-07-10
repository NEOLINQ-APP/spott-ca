/**
 * 3-step Founding Member welcome sequence.
 * Called by /api/public/cron/welcome-sequence hourly (or manually).
 * Idempotent via welcome_sequence_log unique(user_id, step).
 */
import { sendEmail } from "./notifications.server";

type QueueUser = { id: string; email: string; display_name: string | null; created_at: string };

function shell(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  const btn = cta
    ? `<p style="margin:28px 0"><a href="${cta.href}" style="background:#ea580c;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${cta.label}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:580px;margin:0 auto;padding:28px;color:#111">
    <h1 style="font-size:24px;margin:0 0 14px;color:#ea580c">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#333">${bodyHtml}</div>
    ${btn}
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0" />
    <p style="font-size:12px;color:#888">Spott.ca — Canada's local marketplace · <a href="https://spott.ca" style="color:#ea580c">spott.ca</a></p>
  </div>`;
}

function step1(name: string | null) {
  const first = name?.split(" ")[0] ?? "there";
  return {
    subject: "You're in — welcome to Spott.ca 🇨🇦",
    html: shell(
      `Welcome to the Founding 10,000, ${first}`,
      `You just joined the Canadian all-in-one platform bringing together <strong>marketplace, business directory, and vehicles</strong> — one login, one map, zero clutter.<br/><br/>
       Your Founding Member perks are locked in:
       <ul style="padding-left:18px">
         <li>🚀 <strong>Free Featured placement</strong> on your first listing</li>
         <li>💬 <strong>Sparq AI</strong> writes your listing in 8 seconds — try it now</li>
         <li>🎁 Refer a friend, unlock <strong>30 days Featured</strong></li>
       </ul>`,
      { label: "Post your first listing", href: "https://spott.ca/marketplace/new" },
    ),
  };
}
function step2() {
  return {
    subject: "Skip the typing — let Sparq write your listing",
    html: shell(
      "Your first listing takes 60 seconds",
      `Most sellers stall on the description. Sparq — our Canadian AI assistant — turns 3 words + a photo into a polished, high-converting listing.<br/><br/>
       <strong>How to use it:</strong> post a new listing, tap the ✨ Sparq icon, describe your item in plain words. Done.<br/><br/>
       Founding Members get <strong>15 free Sparq assists</strong> every month.`,
      { label: "Try Sparq now", href: "https://spott.ca/marketplace/new" },
    ),
  };
}
function step3(city?: string | null) {
  const where = city ?? "your city";
  return {
    subject: `Claim your spot on the Spott.ca map`,
    html: shell(
      "Your invite link is ready 🎁",
      `Spott.ca just hit thousands of active listings across Canada — and buyers in ${where} are searching every hour.<br/><br/>
       Want to speed things up? <strong>Invite one friend</strong> — when they sign up and post their first listing, we drop <strong>30 days of Featured placement</strong> on any listing you own. Free.<br/><br/>
       Your referral link is waiting.`,
      { label: "Get my referral link", href: "https://spott.ca/referrals" },
    ),
  };
}

export async function runWelcomeSequence(limit = 200): Promise<{ scanned: number; sent: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = Date.now();
  const HOUR = 3600_000;

  // Windows: step 1 within first 6h; step 2 at 48h; step 3 at 7d.
  const step1After = new Date(now - 6 * HOUR).toISOString();
  const step1Before = new Date(now).toISOString();
  const step2After = new Date(now - 30 * 24 * HOUR).toISOString();
  const step2Before = new Date(now - 48 * HOUR).toISOString();
  const step3After = new Date(now - 30 * 24 * HOUR).toISOString();
  const step3Before = new Date(now - 7 * 24 * HOUR).toISOString();

  // Pull recent users (via profiles + auth.admin to get emails)
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, created_at, location")
    .gte("created_at", step2After)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!profiles || profiles.length === 0) return { scanned: 0, sent: 0 };

  const users: (QueueUser & { location: string | null })[] = [];
  for (const p of profiles) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(p.id);
    const email = data?.user?.email;
    if (!email) continue;
    users.push({ id: p.id, email, display_name: p.display_name, created_at: p.created_at, location: (p as any).location ?? null });
  }

  // Already-sent map
  const ids = users.map((u) => u.id);
  const { data: log } = await supabaseAdmin
    .from("welcome_sequence_log")
    .select("user_id, step")
    .in("user_id", ids);
  const already = new Set((log ?? []).map((r) => `${r.user_id}:${r.step}`));

  let sent = 0;
  for (const u of users) {
    const created = new Date(u.created_at).toISOString();
    const stepsToSend: { step: number; msg: { subject: string; html: string } }[] = [];

    if (created >= step1After && created <= step1Before && !already.has(`${u.id}:1`)) {
      stepsToSend.push({ step: 1, msg: step1(u.display_name) });
    }
    if (created >= step2After && created <= step2Before && !already.has(`${u.id}:2`)) {
      stepsToSend.push({ step: 2, msg: step2() });
    }
    if (created >= step3After && created <= step3Before && !already.has(`${u.id}:3`)) {
      stepsToSend.push({ step: 3, msg: step3(u.location) });
    }

    for (const s of stepsToSend) {
      const r = await sendEmail({ to: u.email, toName: u.display_name ?? undefined, subject: s.msg.subject, html: s.msg.html });
      if (r.ok) {
        await supabaseAdmin
          .from("welcome_sequence_log")
          .insert({ user_id: u.id, step: s.step } as never);
        sent++;
      }
    }
  }

  return { scanned: users.length, sent };
}
