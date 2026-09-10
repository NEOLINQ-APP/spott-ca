// Real end-to-end check of the BARIO storage credential, run on a
// schedule (see vercel.json's `crons`). Exists because of a real incident
// (2026-09-09): BARIO_STORAGE_ACCESS_KEY went completely dead when the
// storage box got rebuilt on a separate project's credential rotation,
// and every photo upload silently failed with zero visible symptom for
// at least 2 days before anyone noticed. This calls the exact same
// createPresignedUploadUrl() helper the real upload feature uses (not a
// separate reimplementation), so a pass here means uploads genuinely
// work, not just "the credential exists."
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// 1x1 transparent PNG.
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function runHealthcheck(): Promise<{ ok: boolean; error?: string; publicUrl?: string }> {
  const { createPresignedUploadUrl, deleteStoredObject } = await import("@/lib/barioStorage.server");
  let key: string | undefined;
  try {
    const result = await createPresignedUploadUrl("spott/images/marketplace", "healthcheck.png", "image/png", TEST_PNG.length);
    key = result.key;

    const putRes = await fetch(result.uploadUrl, { method: "PUT", body: TEST_PNG, headers: { "Content-Type": "image/png" } });
    if (!putRes.ok) return { ok: false, error: `PUT failed: ${putRes.status}` };

    const getRes = await fetch(result.publicUrl);
    if (!getRes.ok) return { ok: false, error: `public GET failed: ${getRes.status}` };

    return { ok: true, publicUrl: result.publicUrl };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    if (key) await deleteStoredObject(key).catch(() => {});
  }
}

export const Route = createFileRoute("/api/public/cron/storage-healthcheck")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Vercel's own Cron Jobs send `Authorization: Bearer $CRON_SECRET`
        // automatically — also accept the header shapes the other manual
        // cron endpoints use, for consistency if this is ever triggered
        // the same way as those.
        const auth = request.headers.get("authorization");
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("x-cron-secret") ??
          request.headers.get("x-api-key") ??
          (auth?.startsWith("Bearer ") ? auth.slice(7) : null);
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const result = await runHealthcheck();
        if (!result.ok) {
          try {
            const { sendEmail } = await import("@/lib/notifications.server");
            await sendEmail({
              to: "uniquegroup.org@gmail.com",
              subject: "⚠️ Spott.ca storage upload check FAILED",
              html: `<p>The BARIO storage health check failed just now.</p><p>Error: <code>${result.error}</code></p><p>This almost certainly means real photo uploads (marketplace, vehicles, business, events, jobs, properties) are broken for every user right now — same failure mode as the 2026-09-09 incident. Check <code>BARIO_STORAGE_ACCESS_KEY</code>/<code>BARIO_STORAGE_SECRET_KEY</code> in Vercel against the live MinIO box at storage.bario.ca.</p>`,
            });
          } catch (e) {
            console.error("storage-healthcheck: failed to send alert email", (e as Error).message);
          }
          console.error("storage-healthcheck FAILED:", result.error);
          return json({ ok: false, error: result.error }, 500);
        }

        return json({ ok: true, checkedUrl: result.publicUrl });
      },
    },
  },
});
