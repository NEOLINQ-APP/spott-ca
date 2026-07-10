import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Store, ShoppingBag, MessageCircle, X, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { sendWelcomeEmail } from "@/lib/notifications.functions";

const STORAGE_KEY = "spott_onboarding_v1";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta: string;
  to: string;
};

const STEPS: Step[] = [
  {
    icon: Store,
    title: "Claim your business",
    body: "If you own a local business, claim your Spott profile to reply to reviews, add photos, and appear higher in search.",
    cta: "Claim a business",
    to: "/directory",
  },
  {
    icon: ShoppingBag,
    title: "Post your first listing",
    body: "Sell anything on the Spott marketplace — safely paid through escrow, with buyer protection built in.",
    cta: "Post a listing",
    to: "/marketplace/new",
  },
  {
    icon: MessageCircle,
    title: "Meet Sparq, your AI assistant",
    body: "Sparq can help you write listings, generate photos, and reply to buyers. Set up your Sparq profile in seconds.",
    cta: "Open Sparq",
    to: "/dashboard",
  },
];

export function UserGuide() {
  const { user, loading } = useAuth();
  const sendWelcome = useServerFn(sendWelcomeEmail);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    try {
      const key = `${STORAGE_KEY}:${user.id}`;
      if (localStorage.getItem(key)) return;
      setOpen(true);
      // Fire welcome email once, best-effort.
      sendWelcome().catch(() => {});
      localStorage.setItem(key, "started");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (!open || !user) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const last = step === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(`${STORAGE_KEY}:${user.id}`, "done");
    } catch {}
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> Welcome to Spott
          </div>
          <button onClick={finish} className="text-muted-foreground hover:text-foreground" aria-label="Skip">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">{s.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button onClick={finish} className="text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
          <div className="flex gap-2">
            <Link
              to={s.to}
              onClick={() => (last ? finish() : setStep((n) => Math.min(n + 1, STEPS.length - 1)))}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              {s.cta} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => (last ? finish() : setStep((n) => Math.min(n + 1, STEPS.length - 1)))}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {last ? (
                <>
                  Done <Check className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
