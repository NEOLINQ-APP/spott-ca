import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BusinessPhotosManager } from "./BusinessPhotosManager";
import { ImagePlus } from "lucide-react";

export function ManageBusinessPhotos({
  businessId,
  businessName,
  initialHero,
  maxPhotos,
}: {
  businessId: string;
  businessName: string;
  initialHero: string | null;
  maxPhotos?: number;
}) {
  const [photos, setPhotos] = useState<{ id: string; storage_path: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_photos")
        .select("id,storage_path,sort_order")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      setPhotos((data ?? []) as any);
      setLoaded(true);
    })();
  }, [businessId]);

  if (!loaded) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <ImagePlus className="h-4 w-4" /> Photos — {businessName}
      </div>
      <BusinessPhotosManager
        businessId={businessId}
        initialHero={initialHero}
        initialGallery={photos}
        maxPhotos={maxPhotos}
      />
    </div>
  );
}
