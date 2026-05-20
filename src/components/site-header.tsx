import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, LogOut } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">b</div>
          <span className="font-display text-lg font-semibold tracking-tight">bario<span className="text-primary">.ca</span></span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex text-sm text-muted-foreground">
          <Link to="/browse" className="hover:text-foreground transition">Browse</Link>
          <a href="#categories" className="hover:text-foreground transition">Categories</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
            <MapPin className="h-3.5 w-3.5" /> Canada
          </span>
          {user ? (
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
