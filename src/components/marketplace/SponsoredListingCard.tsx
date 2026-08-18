import { useServerFn } from "@tanstack/react-start";
import { Sparkles, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/marketplace";
import { trackSponsoredClick } from "@/lib/sponsored.functions";

export type SponsoredListing = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  price_cents: number | null;
  currency: string;
  city: string | null;
  province: string | null;
  sponsor_name: string | null;
  cta_label: string;
};

export function SponsoredListingCard({ listing: l }: { listing: SponsoredListing }) {
  const track = useServerFn(trackSponsoredClick);

  // Product ads (e.g. sourced from a dropship catalog) aren't fulfillable
  // through the site yet, so clicking is honest about that instead of
  // opening a lead form that implies a real purchase/inquiry will follow.
  // Still tracked for admin interest analytics.
  const onOpen = () => {
    track({ data: { sponsoredListingId: l.id } }).catch(() => {});
    toast.info("This item isn't available yet — check back soon.");
  };

  return (
    <button
      onClick={onOpen}
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-amber-400/40 bg-card text-left transition hover:border-amber-400/70"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {l.image_url ? (
          <img
            src={l.image_url}
            alt={l.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Sparkles className="h-8 w-8" />
          </div>
        )}
        {l.video_url && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircle className="h-10 w-10 text-white drop-shadow" />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
          <Sparkles className="h-3 w-3" /> Sponsored
        </span>
      </div>
      <div className="p-3">
        {l.price_cents != null && (
          <div className="text-base font-semibold leading-tight">
            {formatPrice(l.price_cents, l.currency, "sale")}
          </div>
        )}
        <div className="mt-1 line-clamp-1 text-sm text-foreground">{l.title}</div>
        {l.sponsor_name && (
          <div className="mt-0.5 line-clamp-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            {l.sponsor_name}
          </div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {l.city ? `${l.city}${l.province ? ", " + l.province : ""}` : "Canada-wide"}
        </div>
        <div className="mt-2 inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          {l.cta_label}
        </div>
      </div>
    </button>
  );
}
