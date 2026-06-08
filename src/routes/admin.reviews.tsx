import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, EyeOff, Eye, Trash2, Check, X, Star } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  adminListReviewReports,
  adminModerateReview,
  adminUpdateReport,
} from "@/lib/review-moderation.functions";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
  head: () => ({ meta: [{ title: "Review Moderation — Spott Admin" }] }),
});

type Report = {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviews: {
    id: string;
    rating: number;
    body: string;
    is_hidden: boolean;
    hidden_reason: string | null;
    user_id: string;
    business_id: string;
    created_at: string;
    businesses: { name: string; slug: string } | null;
  } | null;
};

function AdminReviews() {
  const [status, setStatus] = useState<"pending" | "reviewed" | "dismissed" | "actioned" | "all">("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const list = useServerFn(adminListReviewReports);
  const moderate = useServerFn(adminModerateReview);
  const update = useServerFn(adminUpdateReport);

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

  const onModerate = async (reportId: string, reviewId: string, action: "hide" | "unhide" | "delete") => {
    try {
      await moderate({ data: { review_id: reviewId, action } });
      await update({ data: { report_id: reportId, status: action === "unhide" ? "dismissed" : "actioned" } });
      toast.success(`Review ${action === "delete" ? "deleted" : action === "hide" ? "hidden" : "restored"}`);
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
      title="Review Moderation"
      description="Triage user reports on reviews. Hide, restore, or delete content as needed."
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
            const rv = r.reviews;
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">{r.reason.replace(/_/g, " ")}</Badge>
                        <Badge variant={r.status === "pending" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                        {rv?.is_hidden && <Badge variant="destructive">Hidden</Badge>}
                        <span className="text-xs text-muted-foreground">Reported {new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      {r.details && <p className="mt-2 text-sm text-muted-foreground">Reporter note: {r.details}</p>}
                      {rv ? (
                        <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {rv.businesses?.name ?? "Business"}
                            </span>
                            {rv.businesses?.slug && (
                              <a href={`/business/${rv.businesses.slug}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a>
                            )}
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < rv.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                              ))}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-sm">{rv.body}</p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">Review no longer exists.</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {rv && !rv.is_hidden && (
                        <Button size="sm" variant="outline" onClick={() => onModerate(r.id, rv.id, "hide")}>
                          <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Hide
                        </Button>
                      )}
                      {rv && rv.is_hidden && (
                        <Button size="sm" variant="outline" onClick={() => onModerate(r.id, rv.id, "unhide")}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Restore
                        </Button>
                      )}
                      {rv && (
                        <Button size="sm" variant="destructive" onClick={() => onModerate(r.id, rv.id, "delete")}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
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
