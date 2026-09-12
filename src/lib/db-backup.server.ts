// Real, scheduled backup of every real table in the public schema —
// built 2026-09-11 after checking spott.ca's Supabase org and finding it
// on the free plan, which has ZERO automatic backups (Pro adds daily
// backups for $25/mo; PITR is a further paid add-on on top of that).
// At this project's real size (61MB DB total, confirmed live) a
// self-built logical backup costs nothing beyond the storage it sits in
// — reuses BARIO's existing storage credential this project already has
// working, no new subscription.
//
// This is a logical (row-data) backup, not a byte-identical pg_dump —
// restoring means re-inserting JSON rows per table, not `psql < dump.sql`
// in one shot. Chosen deliberately: there's no pg_dump binary available
// in a Vercel serverless function, and at this scale a hand-rolled
// per-table JSON export via the same supabaseAdmin client every other
// feature already trusts is simple, real, and verifiable end-to-end —
// rather than reaching for a heavier binary-dump pipeline this project
// has no infrastructure to run.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { gzipSync } from "node:zlib";
import { putObjectAtKey, listStoredObjects, deleteStoredObject } from "@/lib/barioStorage.server";

const BACKUP_PREFIX = "spott/backups";
const RETENTION_DAYS = 30;
const PAGE_SIZE = 1000;

// Dynamic table discovery via PostgREST's own OpenAPI introspection
// (GET /rest/v1/ returns every table's schema under `definitions`) —
// deliberately not a hardcoded table list, so a table added by a future
// migration gets backed up automatically instead of silently missed
// until the day it's needed. No new credential: same SUPABASE_URL/
// SUPABASE_SERVICE_ROLE_KEY every other server function already uses.
async function listPublicTables(): Promise<string[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured");
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`PostgREST introspection failed: HTTP ${res.status}`);
  const spec = await res.json();
  const names = Object.keys(spec.definitions ?? {});
  if (names.length === 0) throw new Error("PostgREST introspection returned zero tables — refusing to write an empty backup");
  return names;
}

async function exportTable(table: string): Promise<any[]> {
  const rows: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await (supabaseAdmin as any).from(table).select("*").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Export failed for "${table}": ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export type BackupResult =
  | { ok: true; tableCount: number; rowCount: number; sizeBytes: number; key: string; deletedOldBackups: number }
  | { ok: false; error: string };

export async function runFullBackup(): Promise<BackupResult> {
  try {
    const tables = await listPublicTables();

    const snapshot: Record<string, any[]> = {};
    let rowCount = 0;
    for (const table of tables) {
      const rows = await exportTable(table);
      snapshot[table] = rows;
      rowCount += rows.length;
    }

    const payload = JSON.stringify({
      generatedAt: new Date().toISOString(),
      tableCount: tables.length,
      rowCount,
      tables: snapshot,
    });
    const gz = gzipSync(Buffer.from(payload, "utf-8"));

    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `${BACKUP_PREFIX}/${dateStr}/full-backup.json.gz`;
    await putObjectAtKey(key, gz, "application/gzip");

    // Verify via an authenticated, signed read (getStoredObject), NOT a
    // plain fetch(publicUrl) — this key is reused across same-day runs,
    // and a real incident (2026-09-11) showed Cloudflare (which fronts
    // storage.bario.ca) can serve back a stale, pre-overwrite cached copy
    // of the public URL seconds after a real successful PUT. "The PUT
    // returned 200" was already not proof enough per this week's storage
    // incidents; it turns out neither is "a GET right after returned the
    // right bytes," if that GET goes through a cache that doesn't know
    // the object changed.
    const { getStoredObject } = await import("@/lib/barioStorage.server");
    const verifyBytes = await getStoredObject(key);
    if (verifyBytes.length !== gz.length) {
      throw new Error(`Post-upload verification size mismatch: uploaded ${gz.length} bytes, fetched back ${verifyBytes.length}`);
    }

    // Retention: delete backups older than RETENTION_DAYS, keeping
    // today's (and anything else within the window) untouched.
    const existing = await listStoredObjects(`${BACKUP_PREFIX}/`);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deletedOldBackups = 0;
    for (const obj of existing) {
      if (obj.key === key) continue;
      if (obj.lastModified && obj.lastModified.getTime() < cutoff) {
        await deleteStoredObject(obj.key);
        deletedOldBackups++;
      }
    }

    return { ok: true, tableCount: tables.length, rowCount, sizeBytes: gz.length, key, deletedOldBackups };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
