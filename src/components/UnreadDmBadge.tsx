import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts unread DM threads for the current user across BOTH roles
 * (customer threads + owner threads). Shows a small red pill with the count.
 * Re-counts on realtime INSERTs to dm_messages.
 */
export function UnreadDmBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const recount = async (uid: string) => {
    // Pull all threads visible to this user (RLS scopes them).
    const { data } = await supabase
      .from("dm_threads")
      .select("id,customer_id,business_id,last_message_at,owner_last_read_at,customer_last_read_at,businesses(owner_id)");
    if (!data) { setCount(0); return; }
    let n = 0;
    for (const t of data as any[]) {
      if (!t.last_message_at) continue;
      const amCustomer = t.customer_id === uid;
      const amOwner = t.businesses?.owner_id === uid;
      const myReadAt = amOwner ? t.owner_last_read_at : amCustomer ? t.customer_last_read_at : null;
      if (!myReadAt || new Date(t.last_message_at) > new Date(myReadAt)) n += 1;
    }
    setCount(n);
  };

  useEffect(() => {
    if (!me) return;
    recount(me);
    const ch = supabase
      .channel(`unread-badge-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, () => recount(me))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_threads" }, () => recount(me))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  if (!me || count === 0) return null;
  return (
    <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-[18px] text-white ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
