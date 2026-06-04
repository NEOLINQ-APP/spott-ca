import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { PlusCircle, ShieldCheck, LogIn, Compass, Store, User as UserIcon } from "lucide-react";

const searchSchema = z.object({ tab: z.enum(["user", "business"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Spott.ca" },
      { name: "description", content: "Sign in to Spott.ca or create a customer or business owner account to review, follow, and manage Canadian businesses." },
      { property: "og:title", content: "Sign in — Spott.ca" },
      { property: "og:description", content: "Access your Spott.ca account or sign up as a customer or business owner." },
      { property: "og:url", content: "https://www.spott.ca/auth" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/auth" }],
  }),
});

type Tab = "user" | "business";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab === "business" ? "business" : "user");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: name,
              account_type: tab === "business" ? "business" : "customer",
            },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: tab === "business" ? "/dashboard" : "/" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error(res.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (res.redirected) return;
    navigate({ to: "/" });
  };

  const apple = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
    if (res.error) { toast.error(res.error.message ?? "Apple sign-in failed"); setBusy(false); return; }
    if (res.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="relative">
        <div className="absolute inset-0 bg-aurora opacity-60" />
        <div className="relative mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
          <div className="rounded-2xl border border-white/10 bg-card/80 p-8 backdrop-blur">
            {/* Tabs */}
            <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-background/40 p-1 text-sm">
              <button
                onClick={() => setTab("user")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${tab === "user" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <UserIcon className="h-3.5 w-3.5" /> Customer
              </button>
              <button
                onClick={() => setTab("business")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${tab === "business" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Store className="h-3.5 w-3.5" /> Business
              </button>
            </div>

            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {tab === "business"
                ? (mode === "signin" ? "Business sign in" : "Create a business account")
                : (mode === "signin" ? "Welcome back" : "Create your account")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "business"
                ? "Manage your listing, reply to reviews, and run specials."
                : "Discover and follow local Canadian businesses."}
            </p>

            {tab === "business" && mode === "signin" && (
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link to="/business/new" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs hover:border-primary/40 hover:bg-accent/10">
                  <PlusCircle className="h-4 w-4 text-primary" /> Add a business
                </Link>
                <Link to="/browse" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs hover:border-primary/40 hover:bg-accent/10">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Claim your business — free
                </Link>
                <button onClick={() => setMode("signin")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs hover:border-primary/40 hover:bg-accent/10">
                  <LogIn className="h-4 w-4 text-primary" /> Log in to business account
                </button>
                <Link to="/pricing" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs hover:border-primary/40 hover:bg-accent/10">
                  <Compass className="h-4 w-4 text-primary" /> Explore Spott for Business
                </Link>
              </div>
            )}

            <button
              onClick={google}
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white/90 disabled:opacity-50 transition"
            >
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.2 6.5 29.4 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.3-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.2 6.5 29.4 4.5 24 4.5c-7.4 0-13.8 4.2-17.7 10.2z"/><path fill="#4CAF50" d="M24 43.5c5.3 0 10-2 13.6-5.3l-6.3-5.3C29.3 34.5 26.8 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.5l-6.6 5.1C9.9 39.2 16.4 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C40.5 35.6 43.5 30.2 43.5 24c0-1.2-.1-2.4-.3-3.5z"/></svg>
              Continue with Google
            </button>

            <button
              onClick={apple}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50 transition"
            >
              <svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              Continue with Apple
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tab === "business" ? "Business or owner name" : "Your name"}
                  className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              )}
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : tab === "business" ? "Create business account" : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {mode === "signin" ? (tab === "business" ? "New to Spott for Business?" : "New to Spott?") : "Already have an account?"}{" "}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary hover:underline">
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>

            {tab === "business" && (
              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-center text-xs">
                <p className="text-foreground">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
                  Dealership, shop, or service provider? Submit your business documents for verification.
                </p>
                <Link to="/business-signup" className="mt-2 inline-block font-semibold text-primary hover:underline">
                  Start verified business sign-up →
                </Link>
              </div>
            )}
          </div>
          <Link to="/" className="mt-6 text-center text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
