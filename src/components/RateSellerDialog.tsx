import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { rateTransaction } from "@/lib/seller-ratings.functions";

export function RateSellerDialog({
  listingId,
  listingTitle,
  sellerId,
  onClose,
  onDone,
}: {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const rate = useServerFn(rateTransaction);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await rate({
        data: {
          listing_id: listingId,
          ratee_id: sellerId,
          rating,
          comment: comment.trim() || undefined,
          role: "seller", // rater (buyer) is rating a seller
        },
      });
      toast.success("Thanks — rating submitted");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Rate the seller</h2>
            <p className="mt-1 text-xs text-muted-foreground truncate">{listingTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">How was this transaction?</p>
        <div className="mt-3 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} className="p-1">
              <Star className={`h-8 w-8 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything to add? (optional)"
          rows={3}
          className="mt-3 w-full rounded-md border border-border bg-background p-2 text-sm"
          maxLength={500}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
