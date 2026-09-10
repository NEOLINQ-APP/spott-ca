import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, EyeOff, Eye, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  adminListContentReports,
  adminModerateContent,
  adminUpdateContentReport,
} from "@/lib/content-moderation.functions";

export const Route = createFileRoute("/admin/content-reports")({
  component: AdminContentReports,
  head: () => ({ meta: [{ title: "Content Reports — Spott Admin" }] }),
});

const CONTENT_LINK: Record<string, string> = {
  marketplace_listing: "/marketplace",
  vehicle: "/vehicles",
  event: "/events",
  job_posting: "/jobs",
  property: "/real-estate",
};

const REMOVED_STATUSES: Record<string, string> = {
  marketplace_listing: "removed",
  vehicle: "removed",
  event: "rejected",
  job_posting: "removed",
  property: "removed",
};

type Report = {
  id: string;
  content_type: string;
  content_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  content_title: string;
  content_status: string | null;
};

function AdminContentReports() {
  const [status, setStatus] = useState<"pending" | "reviewed" | "dismissed" | "actioned" | "all">("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const list = useServerFn(adminListContentReports);
  const moderate = useServerFn(adminModerateContent);
  const update = useServerFn(adminUpdateContentReport);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await list({ data: { status } });
      setReports(res.reports as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [list, status]);

  useEffect(() => { load(); }, [load]);

  const onModerate = async (report: Report, action: "remove" | "restore") => {
    try {
      await moderate({ data: { content_type: report.content_type as any, content_id: report.content_id, action } });
      await update({ data: { report_id: report.id, status: action === "restore" ? "dismissed" : "actioned" } });
      toast.success(action === "remove" ? "Listing removed" : "Listing restored");
      load();
    } catch (e: any) { toast.error(e?.message ?? "Action failed"); }
  };

  const onUpdateStatus = async (reportId: string, newStatus: "dismissed" | "reviewed") => {
    try {
      await update({ data: { report_id: reportId, status: newStatus } });
      toast.success("Updated");
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <AdminShell
      title="Content Reports"
      description="Triage user reports on marketplace listings, vehicles, events, jobs, and properties."
      actions={
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No reports in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const isRemoved = r.content_status === REMOVED_STATUSES[r.content_type];
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">{r.content_type.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline" className="capitalize">{r.reason.replace(/_/g, " ")}</Badge>
                        <Badge variant={r.status === "pending" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                        {isRemoved && <Badge variant="destructive">Removed</Badge>}
                        <span className="text-xs text-muted-foreground">Reported {new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      {r.details && <p className="mt-2 text-sm text-muted-foreground">Reporter note: {r.details}</p>}
                      <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-foreground">{r.content_title}</span>
                          <a
                            href={`${CONTENT_LINK[r.content_type]}/${r.content_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {!isRemoved && (
                        <Button size="sm" variant="destructive" onClick={() => onModerate(r, "remove")}>
                          <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Remove listing
                        </Button>
                      )}
                      {isRemoved && (
                        <Button size="sm" variant="outline" onClick={() => onModerate(r, "restore")}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Restore
                        </Button>
                      )}
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => onUpdateStatus(r.id, "dismissed")}>
                            <X className="mr-1.5 h-3.5 w-3.5" /> Dismiss
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onUpdateStatus(r.id, "reviewed")}>
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Mark reviewed
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
