import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { reportContent } from "@/lib/content-moderation.functions";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "scam_or_fraud", label: "Scam or fraud" },
  { value: "prohibited_item", label: "Prohibited item or content" },
  { value: "offensive_content", label: "Offensive content" },
  { value: "misleading_information", label: "Misleading information" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Other" },
];

type ContentType = "marketplace_listing" | "vehicle" | "event" | "job_posting" | "property";

export function ReportButton({ contentType, contentId, className }: { contentType: ContentType; contentId: string; className?: string }) {
  const { user } = useAuth();
  const report = useServerFn(reportContent);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return toast.error("Sign in to report this");
    if (!reason) return toast.error("Pick a reason");
    setSubmitting(true);
    try {
      await report({ data: { content_type: contentType, content_id: contentId, reason: reason as any, details: details.trim() || undefined } });
      toast.success("Thanks — our team will review this.");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : toast.error("Sign in to report this"))}
        className={`inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-destructive ${className ?? ""}`}
      >
        <Flag className="h-4 w-4" /> Report
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              className="w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm"
              rows={3}
              placeholder="Additional details (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !reason}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Submit report
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
