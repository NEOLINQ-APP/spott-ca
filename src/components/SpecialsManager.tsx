import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { upsertSpecial, deleteSpecial } from "@/lib/specials.functions";
import { Tag, Plus, Loader2, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

type Special = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  discount_label: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export function SpecialsManager({ businessId, businessName }: { businessId: string; businessName: string }) {
  const upsert = useServerFn(upsertSpecial);
  const del = useServerFn(deleteSpecial);
  const [items, setItems] = useState<Special[]>([]);
  const [editing, setEditing] = useState<Partial<Special> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("specials")
      .select("id,business_id,title,description,discount_label,ends_at,is_active")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Special[]);
  };
  useEffect(() => { load(); }, [businessId]);

  const save = async () => {
    if (!editing?.title || editing.title.length < 2) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        data: {
          id: editing.id,
          business_id: businessId,
          title: editing.title!,
          description: editing.description ?? null,
          discount_label: editing.discount_label ?? null,
          ends_at: editing.ends_at ?? null,
          is_active: editing.is_active ?? true,
        },
      });
      toast.success(editing.id ? "Special updated" : "Special added");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this special?")) return;
    try {
      await del({ data: { id } });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" /> Specials & coupons
          <span className="text-xs font-normal text-muted-foreground">· {businessName}</span>
        </h3>
        <button
          onClick={() => setEditing({ is_active: true })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">
          No specials yet. Add one to show a discount or promo on your listing.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.title}</span>
                  {s.discount_label && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {s.discount_label}
                    </span>
                  )}
                  {!s.is_active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">Inactive</span>
                  )}
                </div>
                {s.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                {s.ends_at && <p className="mt-1 text-[11px] text-muted-foreground">Until {new Date(s.ends_at).toLocaleDateString()}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditing(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="relative w-full max-w-md rounded-2xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(null)} className="absolute right-3 top-3 rounded-full bg-secondary p-1.5 hover:bg-secondary/80" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-display text-lg font-semibold">{editing.id ? "Edit special" : "New special"}</h4>
            <div className="mt-4 space-y-3">
              <Field label="Title">
                <input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. 20% off all entrées"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Discount label (optional)">
                <input
                  value={editing.discount_label ?? ""}
                  onChange={(e) => setEditing({ ...editing, discount_label: e.target.value })}
                  placeholder="20% OFF"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Description (optional)">
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Ends on (optional)">
                <input
                  type="datetime-local"
                  value={editing.ends_at ? new Date(editing.ends_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent/10">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
