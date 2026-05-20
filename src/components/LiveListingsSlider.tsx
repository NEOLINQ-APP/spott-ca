import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import Autoplay from "embla-carousel-autoplay";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { MapPin, Sparkles } from "lucide-react";

type Listing = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  province: string | null;
  hero_image_url: string | null;
  description: string | null;
};

const FALLBACKS = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&auto=format&fit=crop",
];

export function LiveListingsSlider() {
  const [items, setItems] = useState<Listing[]>([]);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("id,slug,name,city,province,hero_image_url,description")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(18)
      .then(({ data }) => {
        if (data) setItems(data as Listing[]);
      });
  }, []);

  const trackClick = (businessId: string) => {
    supabase.auth.getUser().then(({ data }) => {
      supabase
        .from("listing_card_clicks")
        .insert({ business_id: businessId, user_id: data.user?.id ?? null, source: "home_slider" })
        .then(() => {});
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live on Spott.ca
            </div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Real businesses, right now
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A peek at listings already live across Canada.
            </p>
          </div>
          <Link to="/browse" className="hidden text-sm text-primary hover:underline sm:inline-flex items-center gap-1">
            Browse all →
          </Link>
        </div>

        <Carousel
          opts={{ loop: true, align: "start" }}
          plugins={[Autoplay({ delay: 3500, stopOnInteraction: true })]}
          className="mt-8"
        >
          <CarouselContent className="-ml-4">
            {items.map((b, i) => {
              const img = b.hero_image_url || FALLBACKS[i % FALLBACKS.length];
              return (
                <CarouselItem
                  key={b.id}
                  className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <Link
                    to="/business/$slug"
                    params={{ slug: b.slug }}
                    className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={img}
                        alt={b.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-zinc-900">
                          <Sparkles className="h-3 w-3" /> Live listing
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-display text-base font-semibold leading-tight line-clamp-1">
                        {b.name}
                      </div>
                      {(b.city || b.province) && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[b.city, b.province].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {b.description && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {b.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </div>
    </section>
  );
}
