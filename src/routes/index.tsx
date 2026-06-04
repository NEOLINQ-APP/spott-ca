import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Spott.ca — Discover, shop, and earn from local businesses" },
      { name: "description", content: "Spott connects customers, businesses, and promoters in one unified marketplace. Discover verified local listings, shop securely, and earn through referrals." },
      { property: "og:title", content: "Spott.ca — Discover, shop, and earn from local businesses" },
      { property: "og:description", content: "Spott connects customers, businesses, and promoters in one unified marketplace." },
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

      {/* HERO */}
      <section className="px-8 py-24 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold leading-tight tracking-tight">
          Discover, shop, and earn from local businesses
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Spott connects customers, businesses, and promoters in one unified marketplace.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/marketplace"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Browse Marketplace
          </Link>
          <Link
            to="/business/new"
            className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent/10 transition"
          >
            Join as Business
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-8 py-20 bg-muted/30">
        <h2 className="text-2xl font-bold text-center mb-10">How Spott Works</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { t: "1. Discover", d: "Browse local listings from verified businesses." },
            { t: "2. Buy", d: "Purchase products or services securely." },
            { t: "3. Earn", d: "Promoters earn commissions from referrals." },
          ].map((s) => (
            <div key={s.t} className="p-6 bg-card border border-border rounded-xl">
              <h3 className="font-semibold">{s.t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MARKETPLACE PREVIEW */}
      <section className="px-8 py-20">
        <h2 className="text-2xl font-bold text-center mb-10">Featured Listings</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[1, 2, 3].map((item) => (
            <div key={item} className="border border-border rounded-xl p-5 bg-card">
              <div className="h-40 bg-muted rounded-lg mb-4" />
              <h3 className="font-semibold">Sample Product</h3>
              <p className="text-sm text-muted-foreground">$49.99</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            to="/marketplace"
            className="inline-block px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent/10 transition"
          >
            View all listings
          </Link>
        </div>
      </section>

      {/* USER TYPES */}
      <section className="px-8 py-20 bg-muted/30">
        <h2 className="text-2xl font-bold text-center mb-10">Built for Everyone</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { t: "Customers", d: "Shop local deals and discover new businesses." },
            { t: "Businesses", d: "Sell products and grow your customer base." },
            { t: "Promoters", d: "Earn money by referring customers." },
          ].map((u) => (
            <div key={u.t} className="p-6 bg-card border border-border rounded-xl">
              <h3 className="font-semibold">{u.t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{u.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-8 py-24 text-center">
        <h2 className="text-3xl font-bold">Start using Spott today</h2>
        <p className="text-muted-foreground mt-3">
          Join the marketplace connecting local commerce.
        </p>
        <Link
          to="/auth"
          className="inline-block mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
        >
          Get Started
        </Link>
      </section>
    </div>
  );
}
