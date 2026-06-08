import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { useTranslation } from "react-i18next";
import {
  Search, Star, Sparkles, ShieldCheck, MessageSquare,
  UtensilsCrossed, Scissors, HeartPulse, Wrench, Car, Briefcase, ShoppingBag, PartyPopper,
  ArrowRight, Apple, Smartphone,
} from "lucide-react";
import { RotatingHero } from "@/components/RotatingHero";
import { LiveListingsSlider } from "@/components/LiveListingsSlider";
import { Briefcase as BriefcaseIcon, Mail } from "lucide-react";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import footerBg from "@/assets/footer-bg.jpg";

const SEARCH_SUGGESTIONS = [
  "Wendy's near me",
  "McDonald's breakfast",
  "ice cream near me",
  "closest mechanic",
  "chinese food downtown",
  "hair salon open now",
  "best pizza",
  "24 hour pharmacy",
  "dog grooming",
  "auto detailing",
  "dentist accepting new patients",
  "indian buffet",
  "yoga studio",
  "tire shop",
  "wedding photographer",
  "halal restaurant",
  "vegan brunch",
  "barber shop walk in",
  "nail salon",
  "plumber emergency",
  "sushi delivery",
  "coffee shop with wifi",
];

const QUICK_CHIPS = [
  "Wendy's",
  "McDonald's",
  "Ice cream",
  "Mechanic",
  "Sushi",
  "Coffee",
  "Hair salon",
  "Pizza",
  "Dentist",
  "Gym",
];

export const Route = createFileRoute("/directory")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    city: typeof search.city === "string" ? search.city : undefined,
  }),
  component: Index,
  head: () => ({
    meta: [
      { title: "Spott.ca — Browse Verified Businesses & Local Marketplace Deals" },
      { name: "description", content: "Spott.ca is Canada's business directory and marketplace. Search verified restaurants, salons, mechanics, and more — or shop local deals, buy, sell, and trade in your community." },
      { property: "og:title", content: "Spott.ca — Browse Verified Businesses & Local Marketplace Deals" },
      { property: "og:description", content: "Discover verified local businesses and marketplace deals across Canada. Reviews, ratings, hours, and community listings all in one place." },
      { property: "og:url", content: "https://www.spott.ca/directory" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/directory" }],
  }),
});

const ICONS: Record<string, any> = {
  UtensilsCrossed, Scissors, HeartPulse, Wrench, Car, Briefcase, ShoppingBag, PartyPopper,
};

type Category = { id: string; slug: string; name: string; icon: string | null };

function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initial = Route.useSearch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState(initial.q ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [phIdx, setPhIdx] = useState(0);

  useEffect(() => {
    supabase.from("categories").select("id,slug,name,icon").order("sort_order").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPhIdx((i) => (i + 1) % SEARCH_SUGGESTIONS.length), 2400);
    return () => clearInterval(id);
  }, []);

  const goSearch = (query: string) => {
    // Always scope directory searches to the Business Directory section so
    // results are businesses (claimable entries), never marketplace items.
    navigate({
      to: "/listings",
      search: {
        q: query || undefined,
        city: city || undefined,
        section: "business-directory",
      } as any,
    });
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goSearch(q);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* For Businesses bar (Yelp-style) */}
      <div className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-2 text-xs sm:px-6">
          <Link
            to="/auth"
            search={{ tab: "business", next: "/new-listing" } as any}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-medium hover:bg-accent/10"
          >
            <BriefcaseIcon className="h-3.5 w-3.5 text-primary" /> Add a business
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-medium hover:bg-accent/10"
          >
            Spott for Business
          </Link>
        </div>
      </div>




      {/* Hero */}
      <section className="relative overflow-hidden min-h-[640px]">
        <RotatingHero />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {t("hero.badge")}
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              {t("hero.title_pre")} <span className="text-primary">{t("hero.title_city")}</span>,<br />
              {t("hero.title_post")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              {t("hero.subtitle")}
            </p>

            <form onSubmit={onSearch} className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border bg-card/80 p-2 shadow-2xl backdrop-blur sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Try "${SEARCH_SUGGESTIONS[phIdx]}"`}
                  className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground transition-all"
                />
              </div>
              <div className="px-3 sm:border-l sm:border-border">
                <CityAutocomplete value={city} onChange={setCity} />
              </div>
              <button type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
                {t("hero.search")}
              </button>
            </form>

            {/* Quick search chips */}
            <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Popular:</span>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => { setQ(chip); goSearch(chip); }}
                  className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition hover:border-primary/40 hover:text-foreground"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> {t("hero.feature1")}</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> {t("hero.feature2")}</span>
              <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-primary" /> {t("hero.feature3")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("categories.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("categories.subtitle")}</p>
          </div>
          <Link
            to="/listings"
            search={{ section: "business-directory" } as any}
            className="hidden text-sm text-primary hover:underline sm:inline-flex items-center gap-1"
          >
            {t("categories.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = (c.icon && ICONS[c.icon]) || ShoppingBag;
            return (
              <Link
                key={c.id}
                to="/listings"
                search={{ category: c.slug, section: "business-directory" } as any}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-card/70"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
                <Icon className="h-6 w-6 text-primary" />
                <div className="relative mt-4 text-sm font-medium">{c.name}</div>
                <div className="relative mt-1 text-xs text-muted-foreground">{t("categories.explore")} →</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live listings slider */}
      <LiveListingsSlider />

      {/* Why Businesses Choose Spott.ca */}
      <section id="why-spott" className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">WHY BUSINESSES CHOOSE SPOTT.CA</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Join Spott.ca and grow your business with Canada&apos;s modern marketplace.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: "🚀", title: "Get Found By Local Customers" },
              { emoji: "📈", title: "Increase Online Visibility" },
              { emoji: "⭐", title: "Build Trust With Verified Reviews" },
              { emoji: "📷", title: "Showcase Photos & Videos" },
              { emoji: "📞", title: "Receive Customer Inquiries" },
              { emoji: "🇨🇦", title: "Promote Your Business Across Canada" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40 hover:bg-card/70">
                <div className="text-3xl leading-none">{f.emoji}</div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-aurora p-10 text-center sm:p-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{t("cta.body")}</p>
          <Link to="/auth" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
            {t("cta.button")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer
        className="relative border-t border-border py-14 text-white"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10,21,50,0.85), rgba(10,21,50,0.95)), url(${footerBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <div className="flex items-center gap-3">
            {[
              { href: "https://facebook.com/spott.ca", Icon: Facebook, label: "Facebook" },
              { href: "https://instagram.com/spott.ca", Icon: Instagram, label: "Instagram" },
              { href: "https://twitter.com/spott_ca", Icon: Twitter, label: "X / Twitter" },
              { href: "https://linkedin.com/company/spott-ca", Icon: Linkedin, label: "LinkedIn" },
              { href: "https://youtube.com/@spott-ca", Icon: Youtube, label: "YouTube" },
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow Spott.ca on ${label}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
            <a
              href="mailto:info@spott.ca"
              aria-label="Email Spott.ca"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <a
              href="#"
              aria-label="Download Spott.ca on the App Store (coming soon)"
              title="iOS app — coming soon"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Apple className="h-4 w-4" />
              <span className="flex flex-col leading-tight text-left">
                <span className="text-[9px] uppercase tracking-wide">Coming soon</span>
                <span className="text-xs font-medium">App Store</span>
              </span>
            </a>
            <a
              href="#"
              aria-label="Get Spott.ca on Google Play (coming soon)"
              title="Android app — coming soon"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Smartphone className="h-4 w-4" />
              <span className="flex flex-col leading-tight text-left">
                <span className="text-[9px] uppercase tracking-wide">Coming soon</span>
                <span className="text-xs font-medium">Google Play</span>
              </span>
            </a>
          </div>
          <div className="text-xs text-white/70">
            Contact: <a href="mailto:info@spott.ca" className="text-primary hover:underline">info@spott.ca</a>
          </div>
          <div className="text-xs text-white/60">
            © {new Date().getFullYear()} Spott.ca · {t("footer.madeIn")}
          </div>
        </div>
      </footer>
    </div>
  );
}

