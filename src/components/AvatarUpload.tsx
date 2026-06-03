import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Camera, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export function AvatarUpload() {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setUrl(data.avatar_url ?? null); setName(data.display_name ?? ""); }
    });
  }, [user]);

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
      if (profErr) throw profErr;
      setUrl(newUrl);
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally { setUploading(false); }
  };

  if (!user) return null;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
        {url ? (
          <img src={url} alt="Your avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground"><UserIcon className="h-7 w-7" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name || user.email}</div>
        <div className="text-xs text-muted-foreground">Upload a profile photo so people recognise you.</div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent/10 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Upload photo
      </button>
    </div>
  );
}
