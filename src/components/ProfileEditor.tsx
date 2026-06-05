import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile, getMyProfile } from "@/lib/community.functions";

type Form = {
  username: string;
  display_name: string;
  bio: string;
  location: string;
  cover_url: string;
  contact_pref: "chat" | "email" | "phone";
  contact_email: string;
  contact_phone: string;
};

const EMPTY: Form = {
  username: "",
  display_name: "",
  bio: "",
  location: "",
  cover_url: "",
  contact_pref: "chat",
  contact_email: "",
  contact_phone: "",
};

export function ProfileEditor() {
  const save = useServerFn(updateMyProfile);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedUsername, setSavedUsername] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select(
          "username,display_name,bio,location,cover_url,contact_pref,contact_email,contact_phone",
        )
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setForm({
          username: data.username ?? "",
          display_name: data.display_name ?? "",
          bio: (data as any).bio ?? "",
          location: (data as any).location ?? "",
          cover_url: (data as any).cover_url ?? "",
          contact_pref: ((data as any).contact_pref ?? "chat") as Form["contact_pref"],
          contact_email: (data as any).contact_email ?? u.user.email ?? "",
          contact_phone: (data as any).contact_phone ?? "",
        });
        setSavedUsername(data.username ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        username: form.username || undefined,
        display_name: form.display_name || undefined,
        bio: form.bio || null,
        location: form.location || null,
        cover_url: form.cover_url || null,
        contact_pref: form.contact_pref,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      };
      const res = await save({ data: payload });
      setSavedUsername((res?.profile as any)?.username ?? form.username);
      toast.success("Profile saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-card/60" />;

  const labelCls = "text-xs font-medium text-muted-foreground";
  const inputCls =
    "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Public profile</h2>
          <p className="text-xs text-muted-foreground">
            How other Spott members see you across the platform.
          </p>
        </div>
        {savedUsername && (
          <Link
            to="/u/$username"
            params={{ username: savedUsername }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent/10"
          >
            View <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Username</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              @
            </span>
            <input
              value={form.username}
              onChange={(e) => set("username", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              maxLength={24}
              placeholder="jane_doe"
              className={inputCls + " pl-7"}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            3–24 characters. Letters, numbers, underscore.
          </p>
        </label>
        <label className="block">
          <span className={labelCls}>Display name</span>
          <input
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            maxLength={80}
            className={inputCls}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>Bio</span>
          <textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell other members about you…"
            className={inputCls + " resize-y"}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Location</span>
          <input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={120}
            placeholder="Toronto, ON"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Cover image URL</span>
          <input
            value={form.cover_url}
            onChange={(e) => set("cover_url", e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="text-sm font-semibold">Contact preference</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How members can reach you about listings and reviews.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["chat", "email", "phone"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set("contact_pref", p)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${
                form.contact_pref === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent/10"
              }`}
            >
              {p === "chat" ? "Spott Chat" : p}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Phone</span>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
              placeholder="+1 555 555 5555"
              className={inputCls}
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </button>
      </div>
    </div>
  );
}
