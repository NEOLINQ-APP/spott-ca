// Shared getSession() de-duplication. Root-cause fix for a real hang: when
// multiple components/serverFn calls invoke supabase.auth.getSession()
// concurrently on a fresh page load (any page with 2+ useServerFn calls
// firing on mount — vehicles.$id, marketplace.$id, partner.dashboard, etc.),
// each concurrent call independently exercises Supabase JS's internal
// navigator.locks-based session-refresh lock, and the non-winning calls
// never resolve (confirmed live: 30s+ permanent hang, not just slow).
// Routing every getSession() call (both use-auth.ts's own and
// auth-attacher.ts's per-serverFn-call one) through this one shared,
// in-flight-deduped promise means concurrent callers share a single real
// getSession() call instead of racing separate ones.
import { supabase } from "./client";

let inFlight: ReturnType<typeof supabase.auth.getSession> | null = null;

export function getSessionDeduped(): ReturnType<typeof supabase.auth.getSession> {
  if (!inFlight) {
    inFlight = supabase.auth.getSession().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
