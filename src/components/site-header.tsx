import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { MapPin, LogOut, User as UserIcon, LayoutDashboard, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle, LanguageSwitcher } from "@/components/header-controls";
import { UnreadDmBadge } from "@/components/UnreadDmBadge";
import { supabase } from "@/integrations/supabase/client";
import { SUBCATEGORIES } from "@/lib/subcategories";
import spottLogo from "@/assets/spott-logo.png";

type Cat = { id: string; slug: string; name: string };

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { isOwner } = useRoles();
  const { t } = useTranslation();
  const [cats, setCats] = useState<Cat[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("id,slug,name").order("sort_order").then(({ data }) => {
      if (data) setCats(data as Cat[]);
    });
  }, []);

  useEffect(() => {
    if (!user) { setAvatar(null); return; }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setAvatar(data?.avatar_url ?? null);
    });
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center" aria-label="Spott.ca home">
          <img src={spottLogo} alt="Spott.ca" width={140} height={40} className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex text-sm text-muted-foreground">
          <Link to="/browse" className="rounded-md px-3 py-2 hover:text-foreground hover:bg-accent/10 transition">{t("nav.browse")}</Link>

          {/* Categories with subcategory hover menu */}
          <div className="group relative">
            <button className="inline-flex items-center gap-1 rounded-md px-3 py-2 hover:text-foreground hover:bg-accent/10 transition">
              {t("nav.categories")} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-popover p-4 shadow-2xl">
                {cats.map((c) => (
                  <div key={c.id} className="min-w-0">
                    <Link
                      to="/browse"
                      search={{ category: c.slug } as any}
                      className="block text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <ul className="mt-1 space-y-0.5">
                      {(SUBCATEGORIES[c.slug] ?? []).slice(0, 6).map((sub) => (
                        <li key={sub}>
                          <Link
                            to="/browse"
                            search={{ category: c.slug, q: sub } as any}
                            className="block truncate text-xs text-muted-foreground hover:text-primary"
                          >
                            {sub}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link to="/pricing" className="rounded-md px-3 py-2 hover:text-foreground hover:bg-accent/10 transition">Pricing</Link>
          <a href="/#how" className="rounded-md px-3 py-2 hover:text-foreground hover:bg-accent/10 transition">{t("nav.how")}</a>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex mr-1">
            <MapPin className="h-3.5 w-3.5" /> {t("nav.canada")}
          </span>
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              {isOwner && (
                <Link
                  to="/new-listing"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  + List business
                </Link>
              )}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  aria-label="Account menu"
                  className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card hover:border-primary/40"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5"><UnreadDmBadge /></span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                    <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    {isOwner && (
                      <Link to="/new-listing" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 sm:hidden">
                        + List business
                      </Link>
                    )}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm hover:bg-accent/10"
                    >
                      <LogOut className="h-4 w-4" /> {t("nav.signout")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
              >
                {t("nav.signin")}
              </Link>
              <Link
                to="/auth"
                search={{ tab: "business" } as any}
                className="hidden rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent/10 transition sm:inline-flex"
              >
                For business
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
