import { useEffect, useRef, useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Camera, Loader2, User as UserIcon, X, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 512; // square avatar dimension

type Status = "idle" | "cropping" | "resizing" | "uploading" | "saving" | "done" | "error";

async function cropImage(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Encode failed"))), "image/jpeg", 0.9),
  );
}

export function AvatarUpload() {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [srcDataUrl, setSrcDataUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const onCropComplete = useCallback((_: Area, px: Area) => setAreaPx(px), []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setUrl(data.avatar_url ?? null); setName(data.display_name ?? ""); }
    });
  }, [user]);

  const pickFile = (file: File) => {
    if (file.size > MAX_BYTES) { toast.error("Image must be under 5 MB."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setSrcDataUrl(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setStatus("cropping");
    };
    reader.readAsDataURL(file);
  };

  const cancelCrop = () => {
    setSrcDataUrl(null);
    setStatus("idle");
    setProgress(0);
  };

  const confirmCrop = async () => {
    if (!user || !srcDataUrl || !areaPx) return;
    try {
      setStatus("resizing");
      setProgress(15);
      const blob = await cropImage(srcDataUrl, areaPx);

      setStatus("uploading");
      setProgress(45);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;

      setProgress(80);
      setStatus("saving");
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
      if (profErr) throw profErr;

      setUrl(newUrl);
      setProgress(100);
      setStatus("done");
      toast.success("Profile photo updated");
      setTimeout(() => { setSrcDataUrl(null); setStatus("idle"); setProgress(0); }, 900);
    } catch (e: any) {
      setStatus("error");
      toast.error(e.message ?? "Upload failed");
    }
  };

  const busy = status === "resizing" || status === "uploading" || status === "saving";
  const statusLabel: Record<Status, string> = {
    idle: "", cropping: "", resizing: "Resizing image…", uploading: "Uploading…",
    saving: "Saving to your profile…", done: "Saved!", error: "Upload failed",
  };

  if (!user) return null;
  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
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
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent/10 disabled:opacity-50 sm:hidden"
          >
            <Camera className="h-3.5 w-3.5" /> Take photo
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent/10 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" /> Upload photo
          </button>
        </div>
      </div>

      {srcDataUrl && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 sm:items-center" role="dialog" aria-modal="true">
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Crop your photo</h2>
              <button onClick={cancelCrop} disabled={busy} aria-label="Cancel" className="rounded-md p-1 hover:bg-accent/20 disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative h-72 w-full bg-black sm:h-80">
              <Cropper
                image={srcDataUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-4 pt-3">
              <label className="text-xs text-muted-foreground">Zoom</label>
              <input
                type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={busy}
                className="w-full accent-primary"
              />
            </div>

            {busy || status === "done" ? (
              <div className="px-4 pb-2 pt-1">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    {status === "done" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {statusLabel[status]}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 border-t border-border p-3">
              <button
                onClick={cancelCrop}
                disabled={busy}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCrop}
                disabled={busy || status === "done"}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {busy ? statusLabel[status] : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
