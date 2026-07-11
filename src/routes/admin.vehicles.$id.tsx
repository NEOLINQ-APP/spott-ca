import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Trash2, ArrowUp, ArrowDown, ArrowLeft, Wand2, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminGetVehicle,
  adminUpdateVehicle,
  adminDeleteVehiclePhoto,
  adminReorderVehiclePhotos,
  adminSignVehiclePhotoUrls,
  validateListingImageText,
} from "@/lib/admin-content.functions";

export const Route = createFileRoute("/admin/vehicles/$id")({
  component: AdminVehicleEdit,
  head: () => ({ meta: [{ title: "Edit Vehicle — Spott Admin" }] }),
});

type Photo = { id: string; storage_path: string; sort_order: number };

const NUMBER_FIELDS = ["year", "mileage_km", "doors", "seats"] as const;
const TEXT_FIELDS = [
  "title",
  "vin",
  "make",
  "model",
  "trim",
  "body_type",
  "engine",
  "transmission",
  "drivetrain",
  "fuel_type",
  "condition",
  "city",
  "province",
  "postal_code",
  "exterior_color",
  "interior_color",
  "accident_history",
  "prior_use",
  "odometer_status",
] as const;

function AdminVehicleEdit() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getVehicle = useServerFn(adminGetVehicle);
  const updateVehicle = useServerFn(adminUpdateVehicle);
  const deletePhoto = useServerFn(adminDeleteVehiclePhoto);
  const reorder = useServerFn(adminReorderVehiclePhotos);
  const signUrls = useServerFn(adminSignVehiclePhotoUrls);
  const validate = useServerFn(validateListingImageText);

  const [vehicle, setVehicle] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{ needs_review: boolean; discrepancies: string[]; vision: any } | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await getVehicle({ data: { id } });
      setVehicle(r.vehicle);
      setPhotos(r.photos);
      if (r.photos.length) {
        const s = await signUrls({ data: { paths: r.photos.map((p: Photo) => p.storage_path) } });
        setSignedUrls(s.urls ?? {});
      }
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
    setVehicle((prev: any) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      for (const k of TEXT_FIELDS) patch[k] = vehicle[k] ?? null;
      for (const k of NUMBER_FIELDS) {
        const v = vehicle[k];
        patch[k] = v === "" || v == null ? null : Number(v);
      }
      patch.price_cents = Math.round(Number(vehicle.price_cents) || 0);
      patch.currency = vehicle.currency || "CAD";
      patch.status = vehicle.status;
      patch.description = vehicle.description;
      patch.is_featured = !!vehicle.is_featured;
      patch.clean_title = !!vehicle.clean_title;
      patch.rebuilt_status = !!vehicle.rebuilt_status;
      patch.features = Array.isArray(vehicle.features)
        ? vehicle.features
        : typeof vehicle.features === "string"
          ? vehicle.features.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      patch.hashtags = Array.isArray(vehicle.hashtags)
        ? vehicle.hashtags
        : typeof vehicle.hashtags === "string"
          ? vehicle.hashtags.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      await updateVehicle({ data: { id, patch, reason: reason || undefined } });
      toast.success("Vehicle updated");
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function runValidation() {
    const urls = photos.map((p) => signedUrls[p.storage_path]).filter(Boolean).slice(0, 4);
    if (!urls.length) {
      toast.error("No photos to validate against");
      return;
    }
    setValidating(true);
    setValidation(null);
    try {
      const r = await validate({
        data: {
          vehicle_id: id,
          image_urls: urls,
          stated_make: vehicle.make ?? null,
          stated_model: vehicle.model ?? null,
          stated_body_type: vehicle.body_type ?? null,
          stated_title: vehicle.title ?? "",
          stated_description: vehicle.description ?? "",
          auto_flag: true,
        },
      });
      setValidation(r as any);
      if (r.needs_review) toast.warning("Discrepancy detected — flagged for review");
      else toast.success("Image and text look consistent");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setValidating(false);
    }
  }

  async function removePhoto(pid: string) {
    if (!confirm("Delete this photo?")) return;
    await deletePhoto({ data: { id: pid, vehicle_id: id } });
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
        vehicle_id: id,
        order: withOrder.map(({ id, sort_order }) => ({ id, sort_order })),
      },
    });
  }

  if (loading || !vehicle) {
    return (
      <AdminShell title="Edit Vehicle">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  const flags: string[] = (vehicle.compliance_flags as string[] | null) ?? [];

  return (
    <AdminShell
      title="Edit Vehicle"
      description="Full field-level control over any vehicle listing, including AI-generated inventory."
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/vehicles" })}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
        </Button>
      }
    >
      {flags.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert className="h-4 w-4" />
          <span>Flagged: {flags.join(", ")}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-6">
            <div>
              <Label>Title</Label>
              <Input value={vehicle.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label>Year</Label>
                <Input type="number" value={vehicle.year ?? ""} onChange={(e) => set("year", e.target.value)} />
              </div>
              <div>
                <Label>Make</Label>
                <Input value={vehicle.make ?? ""} onChange={(e) => set("make", e.target.value)} />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={vehicle.model ?? ""} onChange={(e) => set("model", e.target.value)} />
              </div>
              <div>
                <Label>Trim</Label>
                <Input value={vehicle.trim ?? ""} onChange={(e) => set("trim", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>VIN</Label>
                <Input value={vehicle.vin ?? ""} onChange={(e) => set("vin", e.target.value)} />
              </div>
              <div>
                <Label>Body type</Label>
                <Input value={vehicle.body_type ?? ""} onChange={(e) => set("body_type", e.target.value)} />
              </div>
              <div>
                <Label>Mileage (km)</Label>
                <Input type="number" value={vehicle.mileage_km ?? ""} onChange={(e) => set("mileage_km", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label>Engine</Label>
                <Input value={vehicle.engine ?? ""} onChange={(e) => set("engine", e.target.value)} />
              </div>
              <div>
                <Label>Transmission</Label>
                <Input value={vehicle.transmission ?? ""} onChange={(e) => set("transmission", e.target.value)} />
              </div>
              <div>
                <Label>Drivetrain</Label>
                <Input value={vehicle.drivetrain ?? ""} onChange={(e) => set("drivetrain", e.target.value)} />
              </div>
              <div>
                <Label>Fuel</Label>
                <Input value={vehicle.fuel_type ?? ""} onChange={(e) => set("fuel_type", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label>Exterior color</Label>
                <Input value={vehicle.exterior_color ?? ""} onChange={(e) => set("exterior_color", e.target.value)} />
              </div>
              <div>
                <Label>Interior color</Label>
                <Input value={vehicle.interior_color ?? ""} onChange={(e) => set("interior_color", e.target.value)} />
              </div>
              <div>
                <Label>Doors</Label>
                <Input type="number" value={vehicle.doors ?? ""} onChange={(e) => set("doors", e.target.value)} />
              </div>
              <div>
                <Label>Seats</Label>
                <Input type="number" value={vehicle.seats ?? ""} onChange={(e) => set("seats", e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea rows={8} value={vehicle.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Price (CAD)</Label>
                <Input
                  type="number"
                  value={vehicle.price_cents != null ? vehicle.price_cents / 100 : ""}
                  onChange={(e) => set("price_cents", Math.round(Number(e.target.value) * 100))}
                />
              </div>
              <div>
                <Label>Condition</Label>
                <Input value={vehicle.condition ?? ""} onChange={(e) => set("condition", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={vehicle.status ?? "draft"}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="featured">featured</option>
                  <option value="pending_review">pending_review</option>
                  <option value="sold">sold</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>City</Label>
                <Input value={vehicle.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <Label>Province</Label>
                <Input value={vehicle.province ?? ""} onChange={(e) => set("province", e.target.value)} />
              </div>
              <div>
                <Label>Postal code</Label>
                <Input value={vehicle.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Prior use</Label>
                <Input value={vehicle.prior_use ?? ""} onChange={(e) => set("prior_use", e.target.value)} />
              </div>
              <div>
                <Label>Odometer status</Label>
                <Input value={vehicle.odometer_status ?? ""} onChange={(e) => set("odometer_status", e.target.value)} />
              </div>
              <div>
                <Label>Accident history</Label>
                <Input value={vehicle.accident_history ?? ""} onChange={(e) => set("accident_history", e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!vehicle.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!vehicle.clean_title} onChange={(e) => set("clean_title", e.target.checked)} />
                Clean title
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!vehicle.rebuilt_status} onChange={(e) => set("rebuilt_status", e.target.checked)} />
                Rebuilt
              </label>
            </div>

            <div>
              <Label>Features (comma-separated)</Label>
              <Input
                value={Array.isArray(vehicle.features) ? vehicle.features.join(", ") : (vehicle.features ?? "")}
                onChange={(e) => set("features", e.target.value)}
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

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">AI Validation</h3>
                <Button size="sm" variant="outline" onClick={runValidation} disabled={validating}>
                  {validating ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Check image vs text
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cross-references vehicle photos with the make/model/body-type in the text. Flags
                mismatches automatically and drafts the listing if confidence is high.
              </p>
              {validation && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="mb-1">
                    <Badge variant={validation.needs_review ? "destructive" : "outline"}>
                      {validation.needs_review ? "Needs review" : "Consistent"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    Detected: {validation.vision?.detected_make ?? "?"} {validation.vision?.detected_model ?? ""} ({validation.vision?.detected_body_type ?? "?"}) · confidence {Math.round((validation.vision?.confidence ?? 0) * 100)}%
                  </div>
                  {validation.discrepancies.length > 0 && (
                    <ul className="mt-2 list-disc pl-4">
                      {validation.discrepancies.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-6">
              <h3 className="text-sm font-semibold">Photos ({photos.length})</h3>
              {photos.length === 0 && (
                <p className="text-xs text-muted-foreground">No photos on this vehicle.</p>
              )}
              {photos.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border p-2">
                  {signedUrls[p.storage_path] ? (
                    <img
                      src={signedUrls[p.storage_path]}
                      alt=""
                      className="h-14 w-14 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 flex-shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1 text-xs text-muted-foreground truncate">#{i + 1}</div>
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === photos.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removePhoto(p.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
