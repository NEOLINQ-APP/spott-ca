import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "admin" | "owner" | "customer";

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setHasBusiness(false); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data: r }, { count }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
      ]);
      if (cancelled) return;
      setRoles(((r ?? []) as any[]).map((x) => x.role as AppRole));
      setHasBusiness((count ?? 0) > 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isOwner = roles.includes("owner") || hasBusiness;
  return { roles, isAdmin, isOwner, hasBusiness, loading };
}
