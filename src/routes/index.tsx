import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, ShoppingBag, ArrowRight, Star, MapPin, Flame, Clock, Trophy,
  UtensilsCrossed, Sparkles, Dumbbell, CalendarDays, Smartphone, Car,
  Home as HomeIcon, Wrench, Shirt, HardHat, Tag, BadgeCheck, TrendingUp,
} from "lucide-react";
import splashBg from "@/assets/splash-bg.jpg";
import spottLogo from "@/assets/spott-logo.png";

export const Route = createFileRoute("/")({
  component: SplashChooser,
  head: () => ({
    meta: [
      { title: "Spott.ca — Discover Local Businesses & Shop the Marketplace" },
      { name: "description", content: "Welcome to Spott.ca. Search verified local businesses or buy, sell, and trade in your community on the Spott Marketplace." },
      { property: "og:title", content: "Spott.ca — Discover Local Businesses & Shop the Marketplace" },
      { property: "og:description", content: "Search verified local businesses or buy, sell, and trade in your community." },
      { property: "og:url", content: "https://www.spott.ca/" },
      { property: "og:image", content: "https://www.spott.ca/og-splash.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/" }],
  }),
});

function SplashChooser() {
  const navigate = useNavigate();
  const [bizQ, setBizQ] = useState("");
  const [mktQ, setMktQ] = useState("");

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#06112a] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${splashBg})` }}
    >
      {/* Soft vignette so cards stay readable without hiding the skyline */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#06112a]/20 to-[#06112a]/40" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-8">
        <img
          src={spottLogo}
          alt="Spott.ca"
          className="h-auto w-[280px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] sm:w-[360px]"
        />
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl">
          One Spott. Two Experiences.
        </h1>
        <p className="mt-2 mb-10 text-base font-medium text-white/85 sm:text-lg">
          Find It. Spott It.
        </p>

        <div className="grid w-full gap-8 sm:grid-cols-2 lg:grid-cols-3">


          <div className="group relative overflow-hidden rounded-3xl border-2 border-white/40 bg-card/90 p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition hover:border-primary hover:scale-[1.02] dark:bg-card/80">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition group-hover:bg-primary/40" />
            <div className="relative">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/30">
                <Search className="h-8 w-8" />
              </div>
              <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Business Directory</h2>
              <p className="mt-3 text-base text-foreground/80">
                Search restaurants, salons, mechanics, and trusted local businesses across Canada.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ to: "/browse", search: { q: bizQ || undefined } as any });
                }}
                className="mt-6 flex items-center gap-2 rounded-xl border-2 border-border bg-background/95 px-4 py-3"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  value={bizQ}
                  onChange={(e) => setBizQ(e.target.value)}
                  placeholder="Search businesses…"
                  aria-label="Search businesses"
                  className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Search
                </button>
              </form>
              <Link
                to="/directory"
                className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-foreground hover:text-primary"
              >
                Browse all businesses <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border-2 border-white/40 bg-card/90 p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition hover:border-accent hover:scale-[1.02] dark:bg-card/80">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl transition group-hover:bg-accent/40" />
            <div className="relative">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/30">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Marketplace</h2>
              <p className="mt-3 text-base text-foreground/80">
                Buy, sell and trade items with people nearby — vehicles, electronics, furniture, free stuff and more.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ to: "/marketplace", search: { q: mktQ || undefined } as any });
                }}
                className="mt-6 flex items-center gap-2 rounded-xl border-2 border-border bg-background/95 px-4 py-3"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  value={mktQ}
                  onChange={(e) => setMktQ(e.target.value)}
                  placeholder="Search marketplace…"
                  aria-label="Search marketplace"
                  className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
                >
                  Search
                </button>
              </form>
              <Link
                to="/marketplace"
                className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-foreground hover:text-accent"
              >
                Explore marketplace <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Autos */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-white/40 bg-card/90 p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition hover:border-primary hover:scale-[1.02] dark:bg-card/80">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition group-hover:bg-primary/40" />
            <div className="relative">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/30">
                <Car className="h-8 w-8" />
              </div>
              <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Autos</h2>
              <p className="mt-3 text-base text-foreground/80">
                Buy and sell cars, trucks and SUVs. AI-assisted posting, VIN decoder, cash offers and trade-in tools.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Link to="/vehicles/browse" className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Browse Autos
                </Link>
                <Link to="/vehicles/sell" className="rounded-lg border-2 border-border bg-background px-3 py-2.5 text-center text-sm font-semibold text-foreground hover:border-primary">
                  Sell My Car
                </Link>
                <Link to="/vehicles/cash-offer" className="rounded-lg border-2 border-border bg-background px-3 py-2.5 text-center text-xs font-semibold text-foreground hover:border-primary">
                  Get a Cash Offer
                </Link>
                <Link to="/vehicles/trade-in" className="rounded-lg border-2 border-border bg-background px-3 py-2.5 text-center text-xs font-semibold text-foreground hover:border-primary">
                  Trade-In Value
                </Link>
              </div>
              <Link to="/vehicles" className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-foreground hover:text-primary">
                Open Autos hub <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
          </div>
        </div>


        {/* Hero CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/marketplace" className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:bg-accent/90">
            Explore Marketplace
          </Link>
          <Link to="/promoters" className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90">
            Promote & Earn
          </Link>
          <Link to="/business/new" className="rounded-xl border-2 border-white/50 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
            List Your Business
          </Link>
        </div>
      </div>

      {/* ====== Homepage Sections ====== */}
      <div className="relative bg-background">
        <TrendingCategories />
        <FeaturedBusinesses />
        <FeaturedProducts />
        <LocalDealsFeed />
        <PromoterEarnings />
      </div>
    </div>
  );
}

/* ---------- Trending Categories ---------- */
const CATEGORIES = [
  { name: "Restaurants", icon: UtensilsCrossed, to: "/directory", color: "from-orange-500/20 to-red-500/20" },
  { name: "Beauty", icon: Sparkles, to: "/directory", color: "from-pink-500/20 to-fuchsia-500/20" },
  { name: "Fitness", icon: Dumbbell, to: "/directory", color: "from-emerald-500/20 to-teal-500/20" },
  { name: "Events", icon: CalendarDays, to: "/directory", color: "from-violet-500/20 to-purple-500/20" },
  { name: "Electronics", icon: Smartphone, to: "/marketplace", color: "from-sky-500/20 to-blue-500/20" },
  { name: "Automotive", icon: Car, to: "/directory", color: "from-amber-500/20 to-yellow-500/20" },
  { name: "Real Estate", icon: HomeIcon, to: "/directory", color: "from-cyan-500/20 to-sky-500/20" },
  { name: "Services", icon: Wrench, to: "/directory", color: "from-slate-500/20 to-zinc-500/20" },
  { name: "Fashion", icon: Shirt, to: "/marketplace", color: "from-rose-500/20 to-pink-500/20" },
  { name: "Home Services", icon: HardHat, to: "/directory", color: "from-lime-500/20 to-green-500/20" },
];

function TrendingCategories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <SectionHeader eyebrow="Discover" title="Trending Categories" subtitle="Tap into what Canadians are searching for right now." />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.name}
            to={c.to as any}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${c.color} p-5 transition hover:scale-[1.03] hover:border-primary`}
          >
            <c.icon className="h-7 w-7 text-foreground" />
            <div className="mt-4 text-sm font-semibold text-foreground">{c.name}</div>
            <ArrowRight className="absolute right-3 top-3 h-4 w-4 text-foreground/60 transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- Featured Businesses ---------- */
const BUSINESSES = [
  { name: "Maison Boulud", category: "French Bistro", city: "Montréal, QC", rating: 4.8, reviews: 642, distance: "1.2 km", promo: "10% off lunch", sponsored: true,
    img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80" },
  { name: "Glow Beauty Bar", category: "Salon & Spa", city: "Toronto, ON", rating: 4.9, reviews: 318, distance: "2.4 km", promo: "Free brow shape", sponsored: true,
    img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80" },
  { name: "Iron Forge Gym", category: "Fitness Studio", city: "Vancouver, BC", rating: 4.7, reviews: 521, distance: "3.8 km", promo: "1 week free trial", sponsored: false,
    img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80" },
  { name: "Prairie Auto Care", category: "Mechanic", city: "Calgary, AB", rating: 4.6, reviews: 287, distance: "5.1 km", promo: "Free brake check", sponsored: false,
    img: "https://images.unsplash.com/photo-1632823471565-1ecdf5c6da77?w=800&q=80" },
  { name: "Halifax Harbor Realty", category: "Real Estate", city: "Halifax, NS", rating: 4.8, reviews: 156, distance: "0.9 km", promo: "Free home valuation", sponsored: true,
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80" },
  { name: "Northern Lights Photography", category: "Photographer", city: "Ottawa, ON", rating: 5.0, reviews: 94, distance: "4.2 km", promo: "20% off weddings", sponsored: false,
    img: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80" },
];

function FeaturedBusinesses() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <SectionHeader eyebrow="Verified locally" title="Featured Businesses" subtitle="Hand-picked Canadian businesses with real reviews." cta={{ label: "Browse directory", to: "/directory" }} />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BUSINESSES.map((b) => (
          <div key={b.name} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary hover:shadow-xl">
            <div className="relative h-44 overflow-hidden">
              <img src={b.img} alt={b.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
              {b.sponsored && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                  <BadgeCheck className="h-3 w-3" /> Sponsored
                </span>
              )}
              <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />{b.distance}
              </span>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{b.category}</div>
              <h3 className="mt-1 text-lg font-bold text-foreground">{b.name}</h3>
              <div className="mt-1 text-sm text-muted-foreground">{b.city}</div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-foreground">{b.rating}</span>
                <span className="text-muted-foreground">({b.reviews})</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <Tag className="h-3 w-3" />{b.promo}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Featured Products ---------- */
const PRODUCTS = [
  { name: "Sony WH-1000XM5 Headphones", price: 379, original: 499, commission: 8, img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80" },
  { name: "Canadiana Maple Cutting Board", price: 49, original: 79, commission: 12, img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80" },
  { name: "Arc'teryx Beta Jacket", price: 449, original: 599, commission: 10, img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80" },
  { name: "Cold Brew Coffee Kit", price: 34, original: 49, commission: 15, img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80" },
  { name: "Bose SoundLink Flex", price: 159, original: 199, commission: 9, img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80" },
  { name: "Handmade Leather Wallet", price: 65, original: 95, commission: 18, img: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80" },
  { name: "Yeti Rambler 36oz", price: 55, original: 70, commission: 7, img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80" },
  { name: "iPad Air 11\" (2024)", price: 749, original: 849, commission: 5, img: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80" },
];

function FeaturedProducts() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <SectionHeader eyebrow="Shop & earn" title="Featured Products" subtitle="Buy local or promote and earn commission on every sale." cta={{ label: "Visit Marketplace", to: "/marketplace" }} />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {PRODUCTS.map((p) => {
          const discount = Math.round((1 - p.price / p.original) * 100);
          return (
            <div key={p.name} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-accent hover:shadow-xl">
              <div className="relative h-44 overflow-hidden bg-muted">
                <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">-{discount}%</span>
                <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{p.commission}% earn</span>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-foreground">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">${p.price}</span>
                  <span className="text-xs text-muted-foreground line-through">${p.original}</span>
                </div>
                <button className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Local Deals Feed ---------- */
const DEALS = [
  { kind: "Flash sale", icon: Flame, who: "Maison Boulud", text: "Tonight only — 30% off the chef's tasting menu. 12 seats left.", time: "Ends 9:00 PM", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80" },
  { kind: "Limited-time", icon: Clock, who: "Glow Beauty Bar", text: "Free brow shape with any facial booked this weekend.", time: "48h left", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=80" },
  { kind: "FOMO drop", icon: TrendingUp, who: "Iron Forge Gym", text: "First 25 sign-ups get a free PT session + branded shaker.", time: "8 / 25 claimed", img: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80" },
  { kind: "Promoter post", icon: Sparkles, who: "@sarah_promotes_yyz", text: "Just tried the new cold brew kit — code SARAH15 saves you 15% 🔥", time: "2h ago", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80" },
];

function LocalDealsFeed() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <SectionHeader eyebrow="Right now" title="Local Deals Feed" subtitle="Flash sales, drops and promoter picks happening near you." />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {DEALS.map((d) => (
            <div key={d.who + d.text} className="group flex gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:border-primary">
              <img src={d.img} alt="" loading="lazy" className="h-28 w-28 flex-none rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    <d.icon className="h-3 w-3" />{d.kind}
                  </span>
                  <span className="text-xs text-muted-foreground">{d.time}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-foreground">{d.who}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Promoter Earnings ---------- */
const LEADERBOARD = [
  { rank: 1, name: "Sarah M.", city: "Toronto, ON", earned: 4280, avatar: "https://i.pravatar.cc/100?img=47" },
  { rank: 2, name: "Marc-André L.", city: "Montréal, QC", earned: 3915, avatar: "https://i.pravatar.cc/100?img=12" },
  { rank: 3, name: "Priya S.", city: "Vancouver, BC", earned: 3520, avatar: "https://i.pravatar.cc/100?img=32" },
  { rank: 4, name: "Tyler K.", city: "Calgary, AB", earned: 2980, avatar: "https://i.pravatar.cc/100?img=15" },
  { rank: 5, name: "Amélie R.", city: "Québec, QC", earned: 2640, avatar: "https://i.pravatar.cc/100?img=49" },
];

function PromoterEarnings() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Trophy className="h-3 w-3" /> Promoter Program
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Earn by promoting local businesses
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Share what you love, post your code, and get paid every time someone buys or books. Top promoters earn thousands monthly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/promoters" className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Become a Promoter
              </Link>
              <Link to="/promoters" className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted">
                How it works
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/80 p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Top Earners — This Month</h3>
              <span className="text-xs text-muted-foreground">Updated daily</span>
            </div>
            <ul className="divide-y divide-border">
              {LEADERBOARD.map((p) => (
                <li key={p.rank} className="flex items-center gap-3 py-3">
                  <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${p.rank === 1 ? "bg-yellow-400 text-black" : p.rank === 2 ? "bg-zinc-300 text-black" : p.rank === 3 ? "bg-amber-700 text-white" : "bg-muted text-foreground"}`}>
                    {p.rank}
                  </span>
                  <img src={p.avatar} alt="" className="h-9 w-9 flex-none rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.city}</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">${p.earned.toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shared section header ---------- */
function SectionHeader({ eyebrow, title, subtitle, cta }: { eyebrow: string; title: string; subtitle?: string; cta?: { label: string; to: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {cta && (
        <Link to={cta.to as any} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          {cta.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
