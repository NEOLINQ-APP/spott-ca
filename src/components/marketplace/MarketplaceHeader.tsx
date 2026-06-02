import { Link } from "@tanstack/react-router";
import { ShoppingBag, Plus, Heart, ListChecks, Home, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import spottLogo from "@/assets/spott-logo.png";

export function MarketplaceHeader() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/" aria-label="Spott.ca home" className="flex items-center gap-2">
            <img src={spottLogo} alt="Spott.ca" className="h-9 w-auto" />
            <span className="hidden rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent sm:inline-flex">
              Marketplace
            </span>
          </Link>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/marketplace"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground font-medium" }}
            className="hidden rounded-md px-3 py-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground md:inline-flex items-center gap-1.5"
          >
            <ShoppingBag className="h-4 w-4" /> Browse
          </Link>
          <Link
            to="/marketplace/favorites"
            activeProps={{ className: "text-foreground font-medium" }}
            className="hidden rounded-md px-3 py-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground md:inline-flex items-center gap-1.5"
          >
            <Heart className="h-4 w-4" /> Saved
          </Link>
          <Link
            to="/marketplace/my-listings"
            activeProps={{ className: "text-foreground font-medium" }}
            className="hidden rounded-md px-3 py-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground md:inline-flex items-center gap-1.5"
          >
            <ListChecks className="h-4 w-4" /> My listings
          </Link>
          <Link
            to="/marketplace/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Sell
          </Link>
          <Link
            to="/directory"
            className="ml-2 hidden rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/10 hover:text-foreground sm:inline-flex items-center gap-1.5"
          >
            <Home className="h-3.5 w-3.5" /> Directory
          </Link>
          {user ? (
            <button
              onClick={() => signOut()}
              className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              to="/auth"
              className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
