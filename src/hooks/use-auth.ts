import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getSessionDeduped } from "@/integrations/supabase/session-cache";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    // getSessionDeduped(), not supabase.auth.getSession() directly — see
    // session-cache.ts. Any page mounting several components that each call
    // useAuth()/a serverFn on mount previously fired concurrent
    // getSession() calls that could contend for Supabase's internal
    // session lock — deduping means they share one real call.
    getSessionDeduped().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading, signOut: () => supabase.auth.signOut() };
}
