// GA4 client-side wiring, consent-gated by the site's existing cookie
// banner (CookieConsent.tsx) rather than loaded unconditionally — the
// banner's own copy already promises visitors that optional/targeted
// cookies only load when they pick "Accept all", so this has to honour
// that choice, not just exist alongside it.
//
// No measurement ID configured yet (VITE_GA_MEASUREMENT_ID unset) means
// every function here is a safe no-op — nothing breaks, nothing loads.

const CONSENT_KEY = "spott_cookie_consent_v1";
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "all";
  } catch {
    return false;
  }
}

function loadGtagScript() {
  if (loaded || !GA_ID || typeof document === "undefined") return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  // send_page_view:false — this is a client-rendered SPA route tree, so
  // route changes never trigger a real document load for gtag's own
  // auto-pageview to catch. trackPageview() below fires one explicitly
  // per navigation instead (including the first).
  window.gtag("config", GA_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

export function initAnalyticsIfConsented() {
  if (GA_ID && hasConsent()) loadGtagScript();
}

export function trackPageview(path: string) {
  if (!loaded || !window.gtag || !GA_ID) return;
  window.gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}
