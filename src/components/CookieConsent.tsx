import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";

const KEY = "spott_cookie_consent_v1";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        const t = setTimeout(() => setShow(true), 600);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const save = (value: "all" | "essential") => {
    try { localStorage.setItem(KEY, value); } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-6 sm:pb-6">
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Cookie preferences"
        className="mx-auto max-w-3xl rounded-2xl border border-border bg-popover/95 p-5 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Your privacy is important to us</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Spott and our third-party service providers use cookies and similar technologies to optimize your
              experience. Some cookies are essential to the proper functioning and security of our website and cannot
              be disabled. Other cookies are optional and intended to facilitate, enhance and personalize your online
              experience, including through targeted advertising. You can update your preferences at any time by clicking
              on &ldquo;Manage Cookies&rdquo;. For more information, please consult our{" "}
              <Link to="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => save("all")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Accept all
              </button>
              <button
                onClick={() => save("essential")}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent/10"
              >
                Essential only
              </button>
              <button
                onClick={() => save("essential")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Manage cookies
              </button>
            </div>
          </div>
          <button
            aria-label="Dismiss"
            onClick={() => save("essential")}
            className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
