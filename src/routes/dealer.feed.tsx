import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { getDealerOverview } from "@/lib/dealer.functions";
import {
  uploadFeed,
  updateFeedMapping,
  commitFeedImport,
  listFeedImports,
  FEED_TARGET_FIELDS,
} from "@/lib/dealer-feed.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/dealer/feed")({
  component: DealerFeedPage,
  head: () => ({
    meta: [
      { title: "Inventory Feed Mapper — Spott.ca" },
      { name: "description", content: "Upload dealership inventory as CSV or XML and map fields to Spott.ca automatically." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type ImportRow = {
  id: string;
  headers: string[];
  sample_rows: Record<string, string>[];
  field_mapping: Record<string, string>;
  row_count: number;
  status: string;
};

function DealerFeedPage() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getDealerOverview);
  const fetchImports = useServerFn(listFeedImports);
  const uploadFn = useServerFn(uploadFeed);
  const mapFn = useServerFn(updateFeedMapping);
  const commitFn = useServerFn(commitFeedImport);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["dealer-overview"],
    queryFn: () => fetchOverview(),
  });

  const businesses = overview?.businesses ?? [];
  const [businessId, setBusinessId] = useState<string>("");
  const activeBiz = businessId || businesses[0]?.id || "";

  const { data: history } = useQuery({
    queryKey: ["feed-imports", activeBiz],
    queryFn: () => fetchImports({ data: { business_id: activeBiz } }),
    enabled: !!activeBiz,
  });

  const [current, setCurrent] = useState<ImportRow | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const source_type = file.name.toLowerCase().endsWith(".xml") ? "xml" : "csv";
      const content = await file.text();
      return uploadFn({
        data: { business_id: activeBiz, source_type, filename: file.name, content },
      });
    },
    onSuccess: (row: any) => {
      setCurrent(row);
      setMapping(row.field_mapping ?? {});
      qc.invalidateQueries({ queryKey: ["feed-imports", activeBiz] });
      toast.success(`Parsed ${row.row_count} rows. Review the field mapping below.`);
    },
    onError: (e: any) => toast.error(e.message ?? "Upload failed"),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      await mapFn({ data: { import_id: current!.id, mapping } });
      return commitFn({ data: { import_id: current!.id } });
    },
    onSuccess: (res: any) => {
      toast.success(`Imported ${res.imported} vehicles as drafts.` + (res.errors?.length ? ` ${res.errors.length} rows skipped.` : ""));
      setCurrent(null);
      qc.invalidateQueries({ queryKey: ["feed-imports", activeBiz] });
      qc.invalidateQueries({ queryKey: ["dealer-vehicles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Import failed"),
  });

  const requiredMet = useMemo(() => {
    const values = Object.values(mapping);
    return ["year", "make", "model"].every((f) => values.includes(f));
  }, [mapping]);

  if (loadingOverview) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!businesses.length) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold">No dealership found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add or claim a dealership business first to upload inventory feeds.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Inventory Feed Mapper
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload CSV or XML, map your columns, and import vehicles as drafts. Draft vehicles need compliance disclosures before publishing.
          </p>
        </div>
        {businesses.length > 1 && (
          <select
            value={activeBiz}
            onChange={(e) => setBusinessId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Upload */}
      {!current && (
        <Card className="p-6">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xml,text/csv,application/xml,text/xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMut.mutate(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Upload inventory feed</p>
              <p className="text-sm text-muted-foreground">CSV or XML, up to ~4MB.</p>
            </div>
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploadMut.isPending || !activeBiz}
            >
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Choose file
            </Button>
          </div>
        </Card>
      )}

      {/* Mapping + preview */}
      {current && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Map your columns to Spott fields</p>
              <p className="text-xs text-muted-foreground">
                {current.row_count} rows detected. Required: year, make, model.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrent(null)}>Cancel</Button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {current.headers.map((h) => (
              <div key={h} className="flex items-center gap-2 rounded-md border border-border p-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{h}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    e.g. {current.sample_rows[0]?.[h] ?? "—"}
                  </div>
                </div>
                <select
                  value={mapping[h] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="">— skip —</option>
                  {FEED_TARGET_FIELDS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {requiredMet
                ? "Ready to import. Vehicles will be saved as drafts."
                : "Map year, make, and model to enable import."}
            </p>
            <Button
              onClick={() => commitMut.mutate()}
              disabled={!requiredMet || commitMut.isPending}
            >
              {commitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Import {current.row_count} rows
            </Button>
          </div>
        </Card>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-3">Recent imports</p>
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between text-sm rounded-md border border-border p-2">
                <div className="flex items-center gap-2 min-w-0">
                  {h.status === "failed" ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                  <span className="truncate">{h.original_filename ?? h.source_type.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{h.status}</Badge>
                  <span>{h.imported_count}/{h.row_count} imported</span>
                  {h.error_count > 0 && <span className="text-destructive">{h.error_count} errors</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
