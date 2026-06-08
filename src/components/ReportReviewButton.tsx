import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { reportReview } from "@/lib/review-moderation.functions";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam or advertising" },
  { value: "harassment", label: "Harassment or threats" },
  { value: "hate_or_discrimination", label: "Hate or discrimination" },
  { value: "false_information", label: "False or misleading information" },
  { value: "conflict_of_interest", label: "Conflict of interest (fake review)" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

export function ReportReviewButton({ reviewId, signedIn }: { reviewId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const report = useServerFn(reportReview);

  const submit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }
    setSubmitting(true);
    try {
      await report({ data: { review_id: reviewId, reason: reason as any, details: details || undefined } });
      toast.success("Report submitted. Thank you.");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (!signedIn) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Report review"
        >
          <Flag className="h-3.5 w-3.5" /> Report
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
          <DialogDescription>
            Reports are reviewed by the Spott moderation team. We never share reporter identities.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Details (optional)</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              placeholder="Add any context that will help our moderators."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
