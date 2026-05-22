import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listMyFriends, toggleFriend } from "@/lib/friends.functions";

type Friend = {
  friend_id: string;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

export function FriendsPanel() {
  const fetchFriends = useServerFn(listMyFriends);
  const toggle = useServerFn(toggleFriend);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchFriends({})
      .then((res) => setFriends((res ?? []) as Friend[]))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [fetchFriends]);

  const remove = async (friend_id: string) => {
    setBusy(friend_id);
    try {
      await toggle({ data: { friend_id } });
      setFriends((f) => f.filter((x) => x.friend_id !== friend_id));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove");
    } finally { setBusy(null); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" /> Friends {friends.length > 0 && <span className="text-xs text-muted-foreground">({friends.length})</span>}
      </div>
      {loading ? (
        <div className="h-16 animate-pulse rounded-md bg-background/50" />
      ) : friends.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">
          No friends yet. Find people through their reviews on business pages and tap “Add friend.”
        </p>
      ) : (
        <ul className="space-y-2">
          {friends.map((f) => (
            <li key={f.friend_id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/50 p-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {f.profile?.avatar_url ? (
                  <img src={f.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs">
                    {(f.profile?.display_name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="truncate text-sm font-medium">{f.profile?.display_name ?? "User"}</span>
              </div>
              <button
                onClick={() => remove(f.friend_id)}
                disabled={busy === f.friend_id}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                {busy === f.friend_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />} Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
