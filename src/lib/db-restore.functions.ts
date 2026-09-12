// Admin-only restore tooling for the daily backups db-backup.server.ts
// produces. Deliberately separate from the backup path (read vs. write,
// different risk profile) and deliberately NOT automatic — a restore is
// always a specific human decision about a specific table, never a
// scheduled job, since applying the wrong backup or the wrong mode can
// destroy real, current data.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { gunzipSync } from "node:zlib";
import { listStoredObjects, getStoredObject } from "@/lib/barioStorage.server";

const BACKUP_PREFIX = "spott/backups";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

async function audit(actorId: string, action: string, targetType: string, targetId: string, before: unknown, after: unknown, reason?: string) {
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    before: before as never,
    after: after as never,
    reason: reason ?? null,
  });
}

type BackupFile = { generatedAt: string; tableCount: number; rowCount: number; tables: Record<string, any[]> };

async function fetchBackup(key: string): Promise<BackupFile> {
  // Authenticated, signed read (getStoredObject), not fetch(publicUrl) —
  // the same backup key can be overwritten again the same day (a manual
  // re-run, or an admin re-triggering it), and Cloudflare (fronting
  // storage.bario.ca) has been observed serving a stale, pre-overwrite
  // cached copy of the plain public URL — see db-backup.server.ts's
  // runFullBackup() for the real incident this was found from. A restore
  // silently reading stale backup content would be a much worse failure
  // mode than a slow one, so this can't take that shortcut.
  const buf = Buffer.from(await getStoredObject(key));
  const json = gunzipSync(buf).toString("utf-8");
  return JSON.parse(json);
}

export const adminListBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const objs = await listStoredObjects(`${BACKUP_PREFIX}/`);
    const backups = objs
      .filter((o) => o.key.endsWith("full-backup.json.gz"))
      .map((o) => ({ key: o.key, date: o.key.split("/")[2] ?? o.key, sizeBytes: o.size, lastModified: o.lastModified }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return { backups };
  });

// Lists which real tables a specific backup actually contains, with row
// counts, without downloading and decompressing the whole (multi-MB)
// file client-side — the admin UI's table picker calls this once per
// backup selection, and adminPreviewRestore separately for the chosen
// table only.
export const adminListBackupTables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ backupKey: z.string().min(1).startsWith(BACKUP_PREFIX) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const backup = await fetchBackup(data.backupKey);
    const tables = Object.entries(backup.tables)
      .map(([name, rows]) => ({ name, rowCount: rows.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { generatedAt: backup.generatedAt, tables };
  });

export const adminPreviewRestore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ backupKey: z.string().min(1).startsWith(BACKUP_PREFIX), table: z.string().min(1) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const backup = await fetchBackup(data.backupKey);
    const rows = backup.tables[data.table];
    if (!rows) throw new Error(`Table "${data.table}" is not present in this backup`);
    const { count: liveRowCount } = await (supabaseAdmin as any).from(data.table).select("*", { count: "exact", head: true });
    return {
      backupGeneratedAt: backup.generatedAt,
      backupRowCount: rows.length,
      liveRowCount: liveRowCount ?? 0,
      sampleRows: rows.slice(0, 3),
    };
  });

const RESTORE_CHUNK_SIZE = 500;

// Two modes, deliberately named for what they actually do rather than
// generic "merge"/"replace" labels that invite assuming the safer-sounding
// one only fills gaps:
//  - "fill_missing_only": inserts rows whose id isn't already present in
//    the live table (ignoreDuplicates), never touches or overwrites an
//    existing row. Safe to run repeatedly; the real recovery path for
//    "some rows got deleted," not for "a row got corrupted/edited wrong."
//  - "full_replace": deletes every current row in the table, then inserts
//    the backup's rows verbatim. A true point-in-time restore, but
//    destructive to anything created or changed since the backup ran —
//    gated behind typing the exact table name as confirmTableName.
export const adminRestoreTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      backupKey: z.string().min(1).startsWith(BACKUP_PREFIX),
      table: z.string().min(1),
      mode: z.enum(["fill_missing_only", "full_replace"]),
      confirmTableName: z.string().min(1),
      reason: z.string().max(500).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.confirmTableName !== data.table) {
      throw new Error("Confirmation text did not match the table name exactly — restore cancelled, nothing was touched");
    }

    const backup = await fetchBackup(data.backupKey);
    const rows = backup.tables[data.table];
    if (!rows) throw new Error(`Table "${data.table}" is not present in this backup`);

    const { count: beforeCount } = await (supabaseAdmin as any).from(data.table).select("*", { count: "exact", head: true });

    if (data.mode === "full_replace") {
      // Every real table in this schema uses a uuid `id` primary key —
      // PostgREST requires a filter on DELETE even with the service role,
      // so this all-obviously-fake-uuid filter is the standard "delete
      // every row" pattern rather than a real predicate.
      const { error: delError } = await (supabaseAdmin as any).from(data.table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delError) throw new Error(`Clearing "${data.table}" before restore failed: ${delError.message}`);
    }

    let restoredCount = 0;
    for (let i = 0; i < rows.length; i += RESTORE_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + RESTORE_CHUNK_SIZE);
      const { error } =
        data.mode === "fill_missing_only"
          ? await (supabaseAdmin as any).from(data.table).upsert(chunk, { onConflict: "id", ignoreDuplicates: true })
          : await (supabaseAdmin as any).from(data.table).insert(chunk);
      if (error) throw new Error(`Restore failed on rows ${i}-${i + chunk.length} of "${data.table}": ${error.message}`);
      restoredCount += chunk.length;
    }

    const { count: afterCount } = await (supabaseAdmin as any).from(data.table).select("*", { count: "exact", head: true });

    await audit(
      context.userId,
      "db_restore",
      "table",
      data.table,
      { rowCount: beforeCount ?? 0 },
      { rowCount: afterCount ?? 0, attemptedRestoreCount: restoredCount, mode: data.mode, backupKey: data.backupKey },
      data.reason,
    );

    return { ok: true, mode: data.mode, beforeCount: beforeCount ?? 0, afterCount: afterCount ?? 0, attemptedRestoreCount: restoredCount };
  });
