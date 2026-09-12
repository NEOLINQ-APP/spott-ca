import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, DatabaseBackup, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  adminListBackups,
  adminListBackupTables,
  adminPreviewRestore,
  adminRestoreTable,
} from "@/lib/db-restore.functions";

export const Route = createFileRoute("/admin/db-restore")({
  component: AdminDbRestore,
  head: () => ({ meta: [{ title: "Database Restore — Spott Admin" }] }),
});

type Backup = { key: string; date: string; sizeBytes: number };
type TableInfo = { name: string; rowCount: number };
type Preview = { backupGeneratedAt: string; backupRowCount: number; liveRowCount: number; sampleRows: any[] };

function AdminDbRestore() {
  const listBackups = useServerFn(adminListBackups);
  const listTables = useServerFn(adminListBackupTables);
  const preview = useServerFn(adminPreviewRestore);
  const restore = useServerFn(adminRestoreTable);

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<string>("");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [previewData, setPreviewData] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mode, setMode] = useState<"fill_missing_only" | "full_replace">("fill_missing_only");
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await listBackups({});
        setBackups(res.backups as Backup[]);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not load backups");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectBackup = async (key: string) => {
    setSelectedBackup(key);
    setSelectedTable("");
    setPreviewData(null);
    setConfirmText("");
    setTablesLoading(true);
    try {
      const res = await listTables({ data: { backupKey: key } });
      setTables(res.tables as TableInfo[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not read this backup");
    } finally {
      setTablesLoading(false);
    }
  };

  const onSelectTable = async (table: string) => {
    setSelectedTable(table);
    setPreviewData(null);
    setConfirmText("");
    setPreviewLoading(true);
    try {
      const res = await preview({ data: { backupKey: selectedBackup, table } });
      setPreviewData(res as Preview);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not preview this table");
    } finally {
      setPreviewLoading(false);
    }
  };

  const canRestore = selectedBackup && selectedTable && confirmText === selectedTable && !restoring;

  const onRestore = async () => {
    if (!canRestore) return;
    setRestoring(true);
    try {
      const res = await restore({
        data: {
          backupKey: selectedBackup,
          table: selectedTable,
          mode,
          confirmTableName: confirmText,
          reason: reason.trim() || undefined,
        },
      });
      toast.success(`Restored "${selectedTable}": ${res.beforeCount} → ${res.afterCount} rows`);
      await onSelectTable(selectedTable);
      setConfirmText("");
      setReason("");
    } catch (e: any) {
      toast.error(e?.message ?? "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <AdminShell
      title="Database Restore"
      description="Recover a table from a real daily backup. Always previews before writing anything."
    >
      <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            This writes directly to production. Backups run daily and are kept 30 days — pick the
            most recent one unless you specifically need an older point in time. Every restore is
            logged to the Audit Log.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : backups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No backups found yet. The daily backup cron may not have run yet.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <Label className="text-xs">1. Backup date</Label>
                <Select value={selectedBackup} onValueChange={onSelectBackup}>
                  <SelectTrigger><SelectValue placeholder="Pick a backup" /></SelectTrigger>
                  <SelectContent>
                    {backups.map((b) => (
                      <SelectItem key={b.key} value={b.key}>
                        {b.date} · {(b.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBackup && (
                <div>
                  <Label className="text-xs">2. Table to restore</Label>
                  {tablesLoading ? (
                    <div className="py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <Select value={selectedTable} onValueChange={onSelectTable}>
                      <SelectTrigger><SelectValue placeholder="Pick a table" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {tables.map((t) => (
                          <SelectItem key={t.name} value={t.name}>
                            {t.name} ({t.rowCount} rows in backup)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {previewLoading && (
                <div className="py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              )}

              {previewData && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DatabaseBackup className="h-3.5 w-3.5" /> Backup generated {new Date(previewData.backupGeneratedAt).toLocaleString()}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Rows in backup</div>
                      <div className="text-lg font-semibold">{previewData.backupRowCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Rows live right now</div>
                      <div className="text-lg font-semibold">{previewData.liveRowCount}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={selectedTable ? "" : "opacity-50"}>
            <CardContent className="space-y-4 p-5">
              <Label className="text-xs">3. Restore mode</Label>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!selectedTable}
                  onClick={() => setMode("fill_missing_only")}
                  className={`w-full rounded-md border p-3 text-left text-sm ${mode === "fill_missing_only" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="font-medium">Fill missing only <Badge variant="secondary" className="ml-1">Safe</Badge></div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Adds back rows that exist in the backup but are missing live. Never touches or overwrites a row that's still there.
                  </div>
                </button>
                <button
                  type="button"
                  disabled={!selectedTable}
                  onClick={() => setMode("full_replace")}
                  className={`w-full rounded-md border p-3 text-left text-sm ${mode === "full_replace" ? "border-destructive bg-destructive/5" : "border-border"}`}
                >
                  <div className="font-medium text-destructive">Full replace <Badge variant="destructive" className="ml-1">Destructive</Badge></div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Deletes every current row in this table, then inserts the backup's rows exactly. Destroys anything created or changed since the backup ran.
                  </div>
                </button>
              </div>

              {selectedTable && (
                <>
                  <div>
                    <Label className="text-xs">Reason (optional, saved to audit log)</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. accidental bulk delete" />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Type <span className="font-mono font-semibold">{selectedTable}</span> to confirm
                    </Label>
                    <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={selectedTable} />
                  </div>
                  <Button
                    variant={mode === "full_replace" ? "destructive" : "default"}
                    className="w-full"
                    disabled={!canRestore}
                    onClick={onRestore}
                  >
                    {restoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Restore "{selectedTable}"
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
