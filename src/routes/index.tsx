import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShoppingBag,
  Store,
  Tag,
  Building2,
  ArrowRight,
  Search,
  MapPin,
  Home,
  Car,
  Monitor,
  Briefcase,
  Wrench,
  Sprout,
  Shirt,
  BadgePercent,
  Heart,
  Shield,
  Users,
  Zap,
  Leaf,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { WhyBusinessesHomeSection } from "@/components/WhyBusinessesHomeSection";
import { FeaturedBusinessesHomeSection } from "@/components/FeaturedBusinessesHomeSection";
import heroToronto from "@/assets/hero-toronto.jpg";
import spottIcon from "@/assets/spott-icon.png";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Spott — Find it. Buy it. Book it. Spott it." },
      { name: "description", content: "Canada's modern marketplace and business directory. Buy, sell, discover and connect with local businesses and people near you." },
      { property: "og:title", content: "Spott — Find it. Buy it. Book it. Spott it." },
      { property: "og:description", content: "Canada's modern marketplace and business directory. All in one place." },
      { property: "og:url", content: "https://www.spott.ca/" },
      { property: "og:image", content: "https://www.spott.ca/og-splash.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/" }],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <WhyBusinessesHomeSection />
      <FeaturedBusinessesHomeSection />
      <ActionCards />
      <Categories />
      <FeaturedAndBusinesses />
      <PromoteBanner />
      <TrustStrip />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  const [tab, setTab] = useState<"marketplace" | "businesses">("marketplace");
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Background image right side */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[60%] pointer-events-none">
        <img
          src={heroToronto}
          alt="Toronto skyline"
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 md:via-background/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24 lg:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          {/* Copy */}
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Find it. Buy it.
              <br />
              Book it.{" "}
              <span className="inline-flex items-center gap-1">
                <span>Sp</span>
                <img
                  src={spottIcon}
                  alt=""
                  aria-hidden="true"
                  className="inline-block h-[0.9em] w-auto align-[-0.05em]"
                />
                <span>tt</span>
              </span>{" "}
              it.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              Canada's modern marketplace and business directory. All in one place.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <ShoppingBag className="h-4 w-4" /> Browse Marketplace
              </Link>
              <Link
                to="/directory"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-accent/10"
              >
                <Store className="h-4 w-4" /> Find Businesses
              </Link>
            </div>

            <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Buy, sell, discover and connect with local businesses and people near you.
            </p>
          </div>

          {/* Search card */}
          <div className="md:justify-self-end w-full max-w-md">
            <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-xl backdrop-blur">
              <div className="mb-4 flex gap-6 border-b border-border">
                <button
                  onClick={() => setTab("marketplace")}
                  className={`-mb-px border-b-2 pb-2 text-sm font-semibold transition ${
                    tab === "marketplace"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Marketplace
                </button>
                <button
                  onClick={() => setTab("businesses")}
                  className={`-mb-px border-b-2 pb-2 text-sm font-semibold transition ${
                    tab === "businesses"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Businesses
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="What are you looking for?"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={loc}
                      onChange={(e) => setLoc(e.target.value)}
                      placeholder="City, province or postal code"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <Link
                    to={tab === "marketplace" ? "/marketplace" : "/directory"}
                    search={
                      tab === "marketplace"
                        ? (q ? ({ q } as any) : undefined)
                        : ({ ...(q ? { q } : {}), ...(loc ? { city: loc } : {}) } as any)
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Search
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- ACTION CARDS ---------------- */
function ActionCards() {
  const cards = [
    { icon: ShoppingBag, title: "Browse Marketplace", desc: "Find great deals on items, services and more.", cta: "Explore now", to: "/marketplace", tint: "bg-primary/10 text-primary" },
    { icon: Store, title: "Find Businesses", desc: "Discover trusted local businesses near you.", cta: "Search businesses", to: "/directory", tint: "bg-emerald-500/10 text-emerald-500" },
    { icon: Tag, title: "Post an Item", desc: "Sell anything fast and easy to your community.", cta: "Post now", to: "/marketplace/new", tint: "bg-orange-500/10 text-orange-500" },
    { icon: Building2, title: "List Your Business", desc: "Grow your business and get discovered.", cta: "Add your business", to: "/business/new", tint: "bg-sky-500/10 text-sky-500" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">What do you want to do today?</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.title}
            to={c.to}
            className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.tint}`}>
              <c.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {c.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- CATEGORIES ---------------- */
function Categories() {
  const cats = [
    { icon: Home, label: "Real Estate", to: "/real-estate" },
    { icon: Car, label: "Vehicles", to: "/vehicles" },
    { icon: Monitor, label: "Electronics", to: "/marketplace" },
    { icon: Briefcase, label: "Jobs", to: "/jobs" },
    { icon: Wrench, label: "Services", to: "/directory" },
    { icon: Sprout, label: "Home & Garden", to: "/marketplace" },
    { icon: Shirt, label: "Fashion", to: "/marketplace" },
    { icon: BadgePercent, label: "Deals", to: "/deals" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">Explore popular categories</h2>
        <Link to="/directory" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          View all categories <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cats.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/40 hover:bg-accent/10"
          >
            <c.icon className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FEATURED + BUSINESSES ---------------- */
function FeaturedAndBusinesses() {
  const listings = [
    {
      price: "$450",
      title: "Modern 3 Seater Sofa",
      desc: "Lightly used grey fabric sofa, smoke-free home, pickup only.",
      tag: "Home & Garden",
      badge: "-15%",
      loc: "Mississauga, ON",
      time: "2h ago",
      img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=70",
    },
    {
      price: "$780",
      title: "iPhone 14 Pro 128GB",
      desc: "Deep Purple, unlocked, 92% battery, original box included.",
      tag: "Electronics",
      badge: "Verified",
      loc: "Toronto, ON",
      time: "5h ago",
      img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=70",
    },
    {
      price: "$320",
      title: "Trek Marlin 5 Bike",
      desc: "Size M, great condition, perfect for trails and commuting.",
      tag: "Sports",
      badge: "Deal",
      loc: "Brampton, ON",
      time: "1d ago",
      img: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&auto=format&fit=crop&q=70",
    },
  ];
  const businesses = [
    {
      name: "Spot Auto Services",
      cat: "Auto Repair",
      loc: "Toronto, ON",
      rating: 4.8,
      reviews: 124,
      img: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&auto=format&fit=crop&q=70",
    },
    {
      name: "Bloom Beauty Studio",
      cat: "Beauty",
      loc: "Mississauga, ON",
      rating: 4.9,
      reviews: 87,
      img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&auto=format&fit=crop&q=70",
    },
    {
      name: "Leaf & Maple Bistro",
      cat: "Restaurant",
      loc: "Brampton, ON",
      rating: 4.6,
      reviews: 210,
      img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop&q=70",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Featured Listings */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold sm:text-xl">Featured Marketplace Listings</h2>
            <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all listings <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {listings.map((l) => (
              <Link
                key={l.title}
                to="/marketplace"
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={l.img}
                    alt={l.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                    {l.badge}
                  </span>
                  <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground backdrop-blur">
                    <Heart className="h-4 w-4" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-bold text-primary">{l.price}</div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {l.tag}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">{l.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{l.desc}</div>
                  <div className="mt-auto pt-2 text-[11px] text-muted-foreground">
                    {l.loc} • {l.time}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Businesses */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold sm:text-xl">Popular Businesses</h2>
            <Link to="/listings" search={{ section: "business-directory" } as any} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="space-y-3">
            {businesses.map((b) => (
              <li key={b.name} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img
                    src={b.img}
                    alt={b.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{b.name}</div>
                  <div className="text-xs text-amber-500">★ {b.rating} <span className="text-muted-foreground">({b.reviews})</span></div>
                  <div className="text-xs text-muted-foreground">{b.cat} • {b.loc}</div>
                </div>
                <Link
                  to="/listings"
                  search={{ section: "business-directory" } as any}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent/10"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PROMOTE BANNER ---------------- */
function PromoteBanner() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/70 p-8 text-primary-foreground sm:p-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Promote. Get seen. Grow faster.</h2>
            <p className="mt-2 max-w-xl text-sm opacity-90 sm:text-base">
              Boost your listings or business and reach more local customers.
            </p>
            <Link
              to="/promoters"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-card/90"
            >
              Learn More
            </Link>
          </div>
          <div className="hidden rounded-xl bg-card/95 p-4 text-foreground shadow-lg md:block">
            <div className="text-xs text-muted-foreground">Profile views</div>
            <div className="text-2xl font-bold text-primary">+2,453</div>
            <div className="text-xs text-emerald-500">+18% this week</div>
            <svg viewBox="0 0 120 40" className="mt-2 h-10 w-32 text-primary">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points="0,30 15,28 30,25 45,22 60,18 75,15 90,10 105,7 120,4"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- TRUST STRIP ---------------- */
function TrustStrip() {
  const items = [
    { icon: Users, title: "Trusted Community", desc: "Real people. Real reviews. Safe and reliable." },
    { icon: Leaf, title: "Local & Canadian", desc: "Built for Canadians and local communities." },
    { icon: Zap, title: "Easy to Use", desc: "Simple, fast and modern experience." },
    { icon: Shield, title: "Secure Platform", desc: "Your data and privacy are protected." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-4">
      <div className="grid gap-6 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title} className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <i.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">{i.title}</div>
              <div className="text-sm text-muted-foreground">{i.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
