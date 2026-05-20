import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle, LanguageSwitcher } from "@/components/header-controls";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">S</div>
          <span className="font-display text-lg font-semibold tracking-tight">Spott<span className="text-primary">.ca</span></span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex text-sm text-muted-foreground">
          <Link to="/browse" className="hover:text-foreground transition">{t("nav.browse")}</Link>
          <a href="/#categories" className="hover:text-foreground transition">{t("nav.categories")}</a>
          <Link to="/pricing" className="hover:text-foreground transition">Pricing</Link>
          <a href="/#how" className="hover:text-foreground transition">{t("nav.how")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex mr-1">
            <MapPin className="h-3.5 w-3.5" /> {t("nav.canada")}
          </span>
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent/10"
              >
                Dashboard
              </Link>
              <Link
                to="/new-listing"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                + List business
              </Link>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent/10"
              >
                <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("nav.signout")}</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              {t("nav.signin")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
