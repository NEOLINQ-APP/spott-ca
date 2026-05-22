import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toggleFriend } from "@/lib/friends.functions";

export function AddFriendButton({ targetUserId, currentUserId }: { targetUserId: string; currentUserId: string | null }) {
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const toggle = useServerFn(toggleFriend);

  useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) { setLoading(false); return; }
    let cancelled = false;
    supabase
      .from("user_friends")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("friend_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) { setIsFriend(!!data); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [currentUserId, targetUserId]);

  if (!currentUserId || currentUserId === targetUserId || loading) return null;

  const onClick = async () => {
    setBusy(true);
    const prev = isFriend;
    setIsFriend(!prev);
    try {
      const res = await toggle({ data: { friend_id: targetUserId } });
      setIsFriend(res.friend);
    } catch (e: any) {
      setIsFriend(prev);
      toast.error(e?.message ?? "Could not update");
    } finally { setBusy(false); }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
        isFriend ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-accent/10"
      }`}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : isFriend ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
      {isFriend ? "Friends" : "Add friend"}
    </button>
  );
}
