import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, Star, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "business-photos";
const DEFAULT_MAX_PHOTOS = 4;

export function publicPhotoUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

type StagedPhoto = { path: string; url: string };

/**
 * Two modes:
 *  - businessId provided: persist directly to the business_photos table.
 *  - businessId omitted: stage uploaded paths and notify parent via onStagedChange
 *    so it can submit them on publish (used during new-listing creation).
 */
export function BusinessPhotosManager({
  businessId,
  initialHero,
  initialGallery,
  onStagedChange,
  onHeroChange,
  maxPhotos,
}: {
  businessId?: string;
  initialHero?: string | null;
  initialGallery?: { id?: string; storage_path: string }[];
  onStagedChange?: (paths: string[]) => void;
  onHeroChange?: (url: string | null) => void;
  maxPhotos?: number;
}) {
  const MAX_PHOTOS = maxPhotos ?? DEFAULT_MAX_PHOTOS;
  const capLabel = MAX_PHOTOS >= 999 ? "∞" : MAX_PHOTOS;
  const [hero, setHero] = useState<string | null>(initialHero ?? null);
  const [photos, setPhotos] = useState<{ id?: string; storage_path: string }[]>(initialGallery ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!businessId) onStagedChange?.(photos.map((p) => p.storage_path));
  }, [photos, businessId, onStagedChange]);

  useEffect(() => {
    if (!businessId) onHeroChange?.(hero);
  }, [hero, businessId, onHeroChange]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { toast.error("Please sign in first."); return; }
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.error(`Up to ${MAX_PHOTOS} gallery photos.`);
      return;
    }
    setUploading(true);
    try {
      const next: { id?: string; storage_path: string }[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name}: max 8 MB`); continue; }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (error) { toast.error(error.message); continue; }
        next.push({ storage_path: path });

        if (businessId) {
          const { data: row, error: insErr } = await supabase
            .from("business_photos")
            .insert({
              business_id: businessId,
              storage_path: path,
              sort_order: photos.length + next.length,
            })
            .select("id")
            .single();
          if (insErr) { toast.error(insErr.message); continue; }
          next[next.length - 1].id = row.id;
        }
      }
      setPhotos((prev) => [...prev, ...next]);
      if (next.length > 0) toast.success(`Uploaded ${next.length} photo${next.length === 1 ? "" : "s"}`);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removePhoto = async (p: { id?: string; storage_path: string }) => {
    if (p.id && businessId) {
      const { error } = await supabase.from("business_photos").delete().eq("id", p.id);
      if (error) { toast.error(error.message); return; }
    }
    await supabase.storage.from(BUCKET).remove([p.storage_path]).catch(() => {});
    setPhotos((prev) => prev.filter((x) => x.storage_path !== p.storage_path));
    if (hero === publicPhotoUrl(p.storage_path)) {
      await setAsHero(null);
    }
  };

  const setAsHero = async (path: string | null) => {
    const url = path ? publicPhotoUrl(path) : null;
    setHero(url);
    if (businessId) {
      const { error } = await supabase
        .from("businesses")
        .update({ hero_image_url: url })
        .eq("id", businessId);
      if (error) toast.error(error.message);
      else toast.success(url ? "Cover photo updated" : "Cover photo removed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/10 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload photos"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          {photos.length}/{capLabel} · JPG/PNG/WEBP, up to 8 MB each. Tap the ⭐ on any photo to make it your banner / cover image.
        </span>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <div className="flex aspect-[3/1] items-center justify-center rounded-lg border border-dashed border-border bg-background/40 text-xs text-muted-foreground">
          <ImagePlus className="mr-2 h-4 w-4" /> No photos yet — show off your storefront, team, and products.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => {
            const url = publicPhotoUrl(p.storage_path);
            const isHero = hero === url;
            return (
              <li key={p.storage_path} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-secondary">
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    title={isHero ? "Cover photo" : "Set as cover"}
                    onClick={() => setAsHero(isHero ? null : p.storage_path)}
                    className={`rounded-full p-1 text-white shadow ${isHero ? "bg-primary" : "bg-black/60 hover:bg-primary"}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${isHero ? "fill-current" : ""}`} />
                  </button>
                  <button
                    type="button"
                    title="Remove"
                    onClick={() => removePhoto(p)}
                    className="rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isHero && (
                  <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">COVER</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
