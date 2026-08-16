import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Trash2, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resolveStoredUrl } from "@/lib/barioStorageUrl";
import {
  adminGetListing,
  adminUpdateListing,
  adminDeleteListingPhoto,
  adminReorderListingPhotos,
} from "@/lib/admin-content.functions";

export const Route = createFileRoute("/admin/listings/$id")({
  component: AdminListingEdit,
  head: () => ({ meta: [{ title: "Edit Listing — Spott Admin" }] }),
});

type Photo = { id: string; storage_path: string; sort_order: number };

const photoUrl = resolveStoredUrl;

function AdminListingEdit() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getListing = useServerFn(adminGetListing);
  const updateListing = useServerFn(adminUpdateListing);
  const deletePhoto = useServerFn(adminDeleteListingPhoto);
  const reorder = useServerFn(adminReorderListingPhotos);

  const [listing, setListing] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await getListing({ data: { id } });
      setListing(r.listing);
      setPhotos(r.photos);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function set<K extends string>(k: K, v: unknown) {
    setListing((prev: any) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        title: listing.title,
        description: listing.description,
        price_cents: Number(listing.price_cents) || 0,
        currency: listing.currency || "CAD",
        condition: listing.condition,
        listing_type: listing.listing_type,
        city: listing.city,
        province: listing.province,
        postal_code: listing.postal_code,
        status: listing.status,
        contact_email: listing.contact_email,
        contact_phone: listing.contact_phone,
        tags: Array.isArray(listing.tags)
          ? listing.tags
          : typeof listing.tags === "string"
            ? listing.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
        is_featured: !!listing.is_featured,
      };
      await updateListing({ data: { id, patch, reason: reason || undefined } });
      toast.success("Listing updated");
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(pid: string) {
    if (!confirm("Delete this photo?")) return;
    await deletePhoto({ data: { id: pid, listing_id: id } });
    setPhotos((p) => p.filter((x) => x.id !== pid));
  }

  async function move(idx: number, dir: -1 | 1) {
    const next = [...photos];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    const withOrder = next.map((p, i) => ({ ...p, sort_order: i }));
    setPhotos(withOrder);
    await reorder({
      data: {
        listing_id: id,
        order: withOrder.map(({ id, sort_order }) => ({ id, sort_order })),
      },
    });
  }

  if (loading || !listing) {
    return (
      <AdminShell title="Edit Listing">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Edit Listing"
      description="Admins can edit every field on any listing, including AI-generated posts."
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/listings" })}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-6">
            <div>
              <Label>Title</Label>
              <Input value={listing.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={8}
                value={listing.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Price (CAD)</Label>
                <Input
                  type="number"
                  value={listing.price_cents != null ? listing.price_cents / 100 : ""}
                  onChange={(e) =>
                    set("price_cents", Math.round(Number(e.target.value) * 100))
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={listing.currency ?? "CAD"} onChange={(e) => set("currency", e.target.value)} />
              </div>
              <div>
                <Label>Condition</Label>
                <Input value={listing.condition ?? ""} onChange={(e) => set("condition", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>City</Label>
                <Input value={listing.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <Label>Province</Label>
                <Input value={listing.province ?? ""} onChange={(e) => set("province", e.target.value)} />
              </div>
              <div>
                <Label>Postal code</Label>
                <Input value={listing.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={listing.status ?? "active"}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="sold">sold</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div>
                <Label>Listing type</Label>
                <Input value={listing.listing_type ?? ""} onChange={(e) => set("listing_type", e.target.value)} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!listing.is_featured}
                    onChange={(e) => set("is_featured", e.target.checked)}
                  />
                  Featured
                </label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Contact email</Label>
                <Input value={listing.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} />
              </div>
              <div>
                <Label>Contact phone</Label>
                <Input value={listing.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={Array.isArray(listing.tags) ? listing.tags.join(", ") : (listing.tags ?? "")}
                onChange={(e) => set("tags", e.target.value)}
              />
            </div>
            <div>
              <Label>Edit reason (audit log)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Corrected mislabeled make/model"
              />
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="text-sm font-semibold">Photos ({photos.length})</h3>
            {photos.length === 0 && (
              <p className="text-xs text-muted-foreground">No photos on this listing.</p>
            )}
            {photos.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border p-2">
                <img
                  src={photoUrl(p.storage_path)}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1 text-xs text-muted-foreground truncate">
                  #{i + 1}
                </div>
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => move(i, 1)}
                  disabled={i === photos.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removePhoto(p.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              To add new photos, use the seller-side upload UI or ask the owner to re-upload.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
