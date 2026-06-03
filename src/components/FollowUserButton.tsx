import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function FollowUserButton({ targetUserId, meId }: { targetUserId: string; meId: string | null }) {
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    async function load() {
      const { count: c } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("followee_id", targetUserId);
      if (!cancel) setCount(c ?? 0);
      if (meId) {
        const { data } = await supabase
          .from("user_follows")
          .select("id")
          .eq("follower_id", meId)
          .eq("followee_id", targetUserId)
          .maybeSingle();
        if (!cancel) setFollowing(!!data);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [targetUserId, meId]);

  const toggle = async () => {
    if (!meId) {
      toast.error("Sign in to follow");
      navigate({ to: "/auth" });
      return;
    }
    if (meId === targetUserId) return;
    setBusy(true);
    if (following) {
      await supabase.from("user_follows").delete().eq("follower_id", meId).eq("followee_id", targetUserId);
      setFollowing(false);
      setCount((c) => Math.max(0, (c ?? 1) - 1));
    } else {
      const { error } = await supabase.from("user_follows").insert({ follower_id: meId, followee_id: targetUserId });
      if (error) {
        toast.error(error.message);
      } else {
        setFollowing(true);
        setCount((c) => (c ?? 0) + 1);
      }
    }
    setBusy(false);
  };

  if (meId === targetUserId) {
    return (
      <span className="text-xs text-muted-foreground">
        {count ?? 0} follower{count === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        following
          ? "border-border bg-card text-foreground hover:bg-accent/10"
          : "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
      {count !== null && <span className="opacity-70">· {count}</span>}
    </button>
  );
}
