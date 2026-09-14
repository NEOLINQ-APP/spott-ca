import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset your password — Spott" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

// Reached only from the real link Supabase emails via
// resetPasswordForEmail's redirectTo (see /auth's "Forgot password?" flow).
// The recovery token in the URL is consumed automatically by the client
// (detectSessionInUrl, on by default) and fires a PASSWORD_RECOVERY auth
// event -- this page just waits for that before showing the form, so a
// direct visit with no valid token correctly shows "invalid link" instead
// of a form that would fail on submit.
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Covers the case where the event already fired before this listener
    // was attached (a real race seen with fast page loads) -- a session
    // existing here means the recovery token was already consumed.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // Render logic below only consults `invalid` while `ready` is still
    // false, so setting it unconditionally here is safe -- once a real
    // PASSWORD_RECOVERY event (or existing session) flips `ready` to true,
    // this becomes a no-op.
    const timeout = setTimeout(() => setInvalid(true), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message ?? "Could not update password"); return; }
    toast.success("Password updated — you're signed in.");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="relative">
        <div className="absolute inset-0 bg-aurora opacity-60" />
        <div className="relative mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
          <div className="rounded-2xl border border-white/10 bg-card/80 p-8 backdrop-blur">
            <h1 className="font-display text-xl font-semibold">Reset your password</h1>

            {invalid && !ready ? (
              <div className="mt-4 space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  This reset link is invalid or has expired. Request a new one from the sign-in page.
                </p>
                <Link to="/auth" className="text-sm text-primary hover:underline">
                  ← Back to sign in
                </Link>
              </div>
            ) : !ready ? (
              <p className="mt-4 text-sm text-muted-foreground">Checking your reset link…</p>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} required minLength={6} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"} required minLength={6} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  disabled={busy}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {busy ? "Updating…" : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
