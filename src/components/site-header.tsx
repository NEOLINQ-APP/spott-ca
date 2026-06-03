import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { MapPin, LogOut, User as UserIcon, LayoutDashboard, ChevronDown, Store, Crown, Shield, Database, ShoppingBag, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useTranslation } from "react-i18next";
import { ThemeToggle, LanguageSwitcher } from "@/components/header-controls";
import { UnreadDmBadge } from "@/components/UnreadDmBadge";
import { supabase } from "@/integrations/supabase/client";
import { SUBCATEGORIES } from "@/lib/subcategories";
import spottLogo from "@/assets/spott-logo.png";
import spottLogoLight from "@/assets/spott-logo-light.png";
import { SectionSwitcher } from "@/components/SectionSwitcher";

type Cat = { id: string; slug: string; name: string };

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { isOwner, isAdmin } = useRoles();
  const { count: cartCount } = useCart();
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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/directory" className="flex items-center" aria-label="Spott.ca directory home">
          <img src={spottLogoLight} alt="Spott.ca" width={260} height={76} className="h-16 w-auto sm:h-20 block dark:hidden" />
          <img src={spottLogo} alt="Spott.ca" width={260} height={76} className="h-16 w-auto sm:h-20 hidden dark:block" />
        </Link>


        <div className="hidden md:flex"><SectionSwitcher active="directory" /></div>


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

          <a href="/#how" className="rounded-md px-3 py-2 hover:text-foreground hover:bg-accent/10 transition">{t("nav.how")}</a>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex mr-1">
            <MapPin className="h-3.5 w-3.5" /> {t("nav.canada")}
          </span>
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            to="/cart"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card hover:bg-accent/10 transition"
            aria-label="Cart"
            title="Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link
                to="/new-listing"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                + List a business
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  aria-label="Account menu"
                  title={isAdmin ? "Admin account" : isOwner ? "Business account" : "Customer account"}
                  className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 bg-card hover:opacity-90 transition ${
                    isAdmin
                      ? "border-amber-500 ring-2 ring-amber-500/30"
                      : isOwner
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border"
                  }`}
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  {/* Account-type badge */}
                  {(isAdmin || isOwner) && (
                    <span
                      className={`absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-background ${
                        isAdmin ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isAdmin ? <Crown className="h-2.5 w-2.5" /> : <Store className="h-2.5 w-2.5" />}
                    </span>
                  )}
                  <span className="absolute -top-0.5 -right-0.5"><UnreadDmBadge /></span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                    {/* Account type label */}
                    <div className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      {isAdmin ? (
                        <><Crown className="h-3 w-3 text-amber-500" /> Admin account</>
                      ) : isOwner ? (
                        <><Store className="h-3 w-3 text-primary" /> Business account</>
                      ) : (
                        <><UserIcon className="h-3 w-3" /> Customer account</>
                      )}
                    </div>
                    <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link to="/orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10">
                      <Package className="h-4 w-4" /> My orders
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10">
                          <Shield className="h-4 w-4 text-amber-500" /> Admin
                        </Link>
                        <Link to="/admin/ingest" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10">
                          <Database className="h-4 w-4 text-amber-500" /> Ingestion
                        </Link>
                      </>
                    )}
                    <Link to="/new-listing" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 sm:hidden">
                      + List a business
                    </Link>
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
