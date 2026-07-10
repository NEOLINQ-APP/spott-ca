import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star, X, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { listListingBuyers, markListingSold, rateTransaction } from "@/lib/seller-ratings.functions";

type Buyer = { buyer_id: string; display_name: string; avatar_url: string | null; last_message_at: string | null };

export function RateTransactionDialog({
  listingId,
  listingTitle,
  onClose,
  onDone,
}: {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const fetchBuyers = useServerFn(listListingBuyers);
  const markSold = useServerFn(markListingSold);
  const rate = useServerFn(rateTransaction);

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [step, setStep] = useState<"select" | "rate">("select");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBuyers({ data: { listing_id: listingId } }).then((r) => setBuyers(r.buyers));
  }, [listingId, fetchBuyers]);

  const skipRating = async () => {
    setSubmitting(true);
    try {
      await markSold({ data: { listing_id: listingId, buyer_id: null } });
      toast.success("Listing marked as sold");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not mark as sold");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!buyerId) return;
    setSubmitting(true);
    try {
      await markSold({ data: { listing_id: listingId, buyer_id: buyerId } });
      await rate({
        data: {
          listing_id: listingId,
          ratee_id: buyerId,
          rating,
          comment: comment.trim() || undefined,
          role: "buyer", // rater (seller) is rating a buyer
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
            <h2 className="font-display text-lg font-semibold">Mark as sold</h2>
            <p className="mt-1 text-xs text-muted-foreground truncate">{listingTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "select" && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Who did you sell it to? Picking a buyer lets you rate the transaction.
            </p>
            <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
              {buyers.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No chat buyers yet — you can still mark it sold.
                </p>
              ) : (
                buyers.map((b) => (
                  <button
                    key={b.buyer_id}
                    onClick={() => setBuyerId(b.buyer_id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                      buyerId === b.buyer_id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30"
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {b.avatar_url ? (
                        <img src={b.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{b.display_name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={skipRating}
                disabled={submitting}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Sold — skip rating
              </button>
              <button
                onClick={() => setStep("rate")}
                disabled={!buyerId || submitting}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Next: rate buyer
              </button>
            </div>
          </>
        )}

        {step === "rate" && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">Rate this buyer 1–5 stars.</p>
            <div className="mt-3 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="p-1">
                  <Star
                    className={`h-8 w-8 ${
                      n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    }`}
                  />
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
            <div className="mt-4 flex justify-between">
              <button onClick={() => setStep("select")} className="text-sm text-muted-foreground hover:text-foreground">
                ← Back
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
