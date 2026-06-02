import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
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
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/" }],
  }),
});

function SplashChooser() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-10 left-0 h-[400px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-12 sm:px-6">
        <img src={spottLogo} alt="Spott.ca" width={260} height={76} className="h-16 w-auto sm:h-20" />

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Where do you want to go today?
        </div>

        <h1 className="mt-6 max-w-3xl text-center font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          One Spott. <span className="text-primary">Two experiences.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
          Find verified local businesses, or buy, sell and trade with neighbors across Canada.
        </p>

        <div className="mt-12 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
          <Link
            to="/directory"
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition hover:border-primary/60 hover:shadow-2xl"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/30" />
            <div className="relative">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Search className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">Business Directory</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Search restaurants, salons, mechanics, and trusted local businesses across Canada — with real reviews and verified info.
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Browse businesses <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          <Link
            to="/marketplace"
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition hover:border-accent/60 hover:shadow-2xl"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/30" />
            <div className="relative">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">Marketplace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Buy, sell and trade items with people nearby. Vehicles, electronics, furniture, free stuff and more — local pickup or shipping.
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Explore marketplace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>

        <div className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Spott.ca · Made in Canada
        </div>
      </div>
    </div>
  );
}
