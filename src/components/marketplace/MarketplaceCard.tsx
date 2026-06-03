import { Link } from "@tanstack/react-router";
import { Heart, Tag, Star, BadgeCheck } from "lucide-react";
import { photoUrl, formatPrice } from "@/lib/marketplace";


export type CardListing = {
  id: string;
  title: string;
  price_cents: number;
  compare_at_price_cents?: number | null;
  commission_cents?: number | null;
  currency: string;
  city: string | null;
  province: string | null;
  listing_type: string;
  tags?: string[] | null;
  business_name?: string | null;
  rating?: number | null;
  verified?: boolean;
};

type Props = {
  listing: CardListing;
  photo?: string;
  isFav: boolean;
  onToggleFav: (id: string) => void;
};

export function MarketplaceCard({ listing: l, photo, isFav, onToggleFav }: Props) {

  const discountPct =
    l.compare_at_price_cents && l.compare_at_price_cents > l.price_cents
      ? Math.round(((l.compare_at_price_cents - l.price_cents) / l.compare_at_price_cents) * 100)
      : 0;

  

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40">
      <Link to="/marketplace/$id" params={{ id: l.id }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {photo ? (
            <img
              src={photoUrl(photo)}
              alt={l.title}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Tag className="h-8 w-8" />
            </div>
          )}
          {discountPct > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              -{discountPct}%
            </span>
          )}
          {l.verified && (
            <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
              <BadgeCheck className="h-3 w-3 text-primary" /> Verified
            </span>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-baseline gap-1.5">
            <div className="text-base font-semibold leading-tight">
              {formatPrice(l.price_cents, l.currency, l.listing_type)}
            </div>
            {discountPct > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(l.compare_at_price_cents!, l.currency, "sale")}
              </span>
            )}
          </div>
          <div className="mt-1 line-clamp-1 text-sm text-foreground">{l.title}</div>
          {l.business_name && (
            <div className="mt-0.5 line-clamp-1 text-xs font-medium text-primary">{l.business_name}</div>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="line-clamp-1">
              {l.city ? `${l.city}${l.province ? ", " + l.province : ""}` : "—"}
            </span>
            {typeof l.rating === "number" && l.rating > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {l.rating.toFixed(1)}
              </span>
            )}
          </div>
          {l.commission_cents && l.commission_cents > 0 && (
            <div className="mt-1.5 inline-block rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Earn {formatPrice(l.commission_cents, l.currency, "sale")} per sale
            </div>
          )}
          {l.tags && l.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {l.tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Actions */}
      <button
        onClick={() => onToggleFav(l.id)}
        aria-label={isFav ? "Remove from saved" : "Save listing"}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:bg-background"
      >
        <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : "text-foreground"}`} />
      </button>

    </div>
  );
}
