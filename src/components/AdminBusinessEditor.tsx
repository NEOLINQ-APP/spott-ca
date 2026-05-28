import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Copy, Image as ImageIcon } from "lucide-react";
import { BusinessContactEditor } from "@/components/BusinessContactEditor";
import { BusinessPhotosManager } from "@/components/BusinessPhotosManager";
import {
  getBusinessForAdmin,
  findChainPeers,
  applyHeroToChain,
} from "@/lib/admin.functions";

type Peer = { id: string; name: string; city: string | null; province: string | null; hero_image_url: string | null };

export function AdminBusinessEditor({ businessId }: { businessId: string }) {
  const loadBiz = useServerFn(getBusinessForAdmin);
  const loadPeers = useServerFn(findChainPeers);
  const applyChain = useServerFn(applyHeroToChain);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getBusinessForAdmin>> | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [applying, setApplying] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [d, p] = await Promise.all([
          loadBiz({ data: { id: businessId } }),
          loadPeers({ data: { id: businessId } }),
        ]);
        if (cancelled) return;
        setData(d);
        setPeers(p.peers as Peer[]);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, loadBiz, loadPeers]);

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading editor…
      </div>
    );
  }

  const b = data.business;
  const eligible = peers.filter((p) => overwrite || !p.hero_image_url || /unsplash|clearbit/i.test(p.hero_image_url ?? ""));

  const onApply = async () => {
    setApplying(true);
    try {
      const res = await applyChain({ data: { id: businessId, overwriteExisting: overwrite } });
      toast.success(`Cover applied to ${res.updated} of ${res.total} locations.`);
      // Refresh peer list to show updated hero URLs.
      const p = await loadPeers({ data: { id: businessId } });
      setPeers(p.peers as Peer[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not apply");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-border bg-muted/30 p-4">
      <BusinessContactEditor
        businessId={b.id}
        initial={{
          address: b.address,
          city: b.city,
          province: b.province,
          postal_code: b.postal_code,
          phone: b.phone,
          email: b.email,
          website: b.website,
        }}
      />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <ImageIcon className="h-4 w-4" /> Cover image &amp; gallery
        </div>
        <BusinessPhotosManager
          businessId={b.id}
          initialHero={b.hero_image_url}
          initialGallery={data.photos as any}
          maxPhotos={20}
        />
      </div>

      {peers.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Copy className="h-4 w-4" /> {peers.length} other location{peers.length === 1 ? "" : "s"} of "{b.name}"
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Apply this listing's cover image to every matching location at once. By default we skip locations that
            already have a real cover (only blank or placeholder Unsplash/Clearbit images get replaced).
          </p>
          <label className="mb-3 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Overwrite existing cover images too ({peers.length - eligible.length} would be skipped otherwise)
          </label>
          <button
            onClick={onApply}
            disabled={applying || !b.hero_image_url}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Apply cover to {eligible.length} location{eligible.length === 1 ? "" : "s"}
          </button>
          {!b.hero_image_url && (
            <p className="mt-2 text-[11px] text-amber-600">Upload a cover image above before applying to the chain.</p>
          )}

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {peers.slice(0, 24).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-6 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {p.hero_image_url ? (
                    <img src={p.hero_image_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="truncate">
                  {p.name} — {[p.city, p.province].filter(Boolean).join(", ") || "—"}
                </span>
              </li>
            ))}
            {peers.length > 24 && (
              <li className="text-xs text-muted-foreground">…and {peers.length - 24} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
