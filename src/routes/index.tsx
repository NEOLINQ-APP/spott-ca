import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingBag, ArrowRight } from "lucide-react";
import splashBg from "@/assets/splash-bg.jpg";

export const Route = createFileRoute("/")({
  component: SplashChooser,
  head: () => ({
    meta: [
      { title: "Spott.ca — Business Directory & Marketplace for Canada" },
      { name: "description", content: "Welcome to Spott.ca. Search verified local businesses or buy, sell, and trade in your community on the Spott Marketplace." },
      { property: "og:title", content: "Spott.ca — Business Directory & Marketplace for Canada" },
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
      {/* Subtle bottom gradient so cards keep contrast over the skyline */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#06112a]/80 via-[#06112a]/30 to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-4 pb-14 pt-12 sm:px-6 sm:pb-20">
        <div className="grid w-full gap-5 sm:grid-cols-2">

          <div className="group relative overflow-hidden rounded-3xl border border-white/15 bg-card/70 p-8 shadow-2xl backdrop-blur-xl transition hover:border-primary/60">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/30" />
            <div className="relative">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Search className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">Business Directory</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Search restaurants, salons, mechanics, and trusted local businesses across Canada.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ to: "/browse", search: { q: bizQ || undefined } as any });
                }}
                className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={bizQ}
                  onChange={(e) => setBizQ(e.target.value)}
                  placeholder="Search businesses…"
                  aria-label="Search businesses"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Search
                </button>
              </form>
              <Link
                to="/directory"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                Browse all businesses <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/15 bg-card/70 p-8 shadow-2xl backdrop-blur-xl transition hover:border-accent/60">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/30" />
            <div className="relative">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">Marketplace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Buy, sell and trade items with people nearby — vehicles, electronics, furniture, free stuff and more.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ to: "/marketplace", search: { q: mktQ || undefined } as any });
                }}
                className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={mktQ}
                  onChange={(e) => setMktQ(e.target.value)}
                  placeholder="Search marketplace…"
                  aria-label="Search marketplace"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
                >
                  Search
                </button>
              </form>
              <Link
                to="/marketplace"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
              >
                Explore marketplace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Spott.ca · Made in Canada
        </div>

      </div>
    </div>
  );
}
