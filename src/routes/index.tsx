import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingBag, ArrowRight } from "lucide-react";
import splashBg from "@/assets/splash-bg.jpg";
import spottLogo from "@/assets/spott-logo.png";

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
      {/* Soft vignette so cards stay readable without hiding the skyline */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#06112a]/20 to-[#06112a]/40" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-8">
        <img
          src={spottLogo}
          alt="Spott.ca"
          className="mb-10 h-auto w-[280px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] sm:w-[360px]"
        />
        <div className="grid w-full gap-8 sm:grid-cols-2">


          <div className="group relative overflow-hidden rounded-3xl border-2 border-white/40 bg-card/80 p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition hover:border-primary hover:scale-[1.02]">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition group-hover:bg-primary/40" />
            <div className="relative">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/25 text-white shadow-lg">
                <Search className="h-8 w-8" />
              </div>
              <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl">Business Directory</h2>
              <p className="mt-3 text-base text-white/85">
                Search restaurants, salons, mechanics, and trusted local businesses across Canada.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ to: "/browse", search: { q: bizQ || undefined } as any });
                }}
                className="mt-6 flex items-center gap-2 rounded-xl border-2 border-white/30 bg-background/95 px-4 py-3"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  value={bizQ}
                  onChange={(e) => setBizQ(e.target.value)}
                  placeholder="Search businesses…"
                  aria-label="Search businesses"
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
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
                className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-white hover:text-primary"
              >
                Browse all businesses <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border-2 border-white/40 bg-card/80 p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition hover:border-accent hover:scale-[1.02]">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl transition group-hover:bg-accent/40" />
            <div className="relative">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/25 text-white shadow-lg">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl">Marketplace</h2>
              <p className="mt-3 text-base text-white/85">
                Buy, sell and trade items with people nearby — vehicles, electronics, furniture, free stuff and more.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ to: "/marketplace", search: { q: mktQ || undefined } as any });
                }}
                className="mt-6 flex items-center gap-2 rounded-xl border-2 border-white/30 bg-background/95 px-4 py-3"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  value={mktQ}
                  onChange={(e) => setMktQ(e.target.value)}
                  placeholder="Search marketplace…"
                  aria-label="Search marketplace"
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
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
                className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-white hover:text-accent"
              >
                Explore marketplace <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-white/80">
          © {new Date().getFullYear()} Spott.ca · Made in Canada
        </div>

      </div>
    </div>

  );
}
