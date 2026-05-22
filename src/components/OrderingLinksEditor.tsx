import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShoppingBag, Loader2, Save } from "lucide-react";
import { updateOrderingLinks } from "@/lib/business-ordering.functions";

export type OrderingLinks = {
  pickup?: string;
  doordash?: string;
  ubereats?: string;
  skip?: string;
  delivery_other?: string;
};

type Props = {
  businessId: string;
  initial: OrderingLinks | null | undefined;
};

const FIELDS: { key: keyof OrderingLinks; label: string; color: string; placeholder: string }[] = [
  { key: "pickup", label: "Pickup / order direct", color: "bg-emerald-500", placeholder: "https://yourrestaurant.ca/order" },
  { key: "doordash", label: "DoorDash", color: "bg-[#ff3008]", placeholder: "https://www.doordash.com/store/..." },
  { key: "ubereats", label: "Uber Eats", color: "bg-black", placeholder: "https://www.ubereats.com/ca/store/..." },
  { key: "skip", label: "SkipTheDishes", color: "bg-[#ff8000]", placeholder: "https://www.skipthedishes.com/..." },
  { key: "delivery_other", label: "Other delivery link", color: "bg-zinc-500", placeholder: "https://..." },
];

export function OrderingLinksEditor({ businessId, initial }: Props) {
  const update = useServerFn(updateOrderingLinks);
  const [form, setForm] = useState<OrderingLinks>(initial ?? {});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof OrderingLinks) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update({
        data: {
          business_id: businessId,
          links: {
            pickup: form.pickup ?? "",
            doordash: form.doordash ?? "",
            ubereats: form.ubereats ?? "",
            skip: form.skip ?? "",
            delivery_other: form.delivery_other ?? "",
          },
        },
      });
      toast.success("Ordering links saved.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
        <ShoppingBag className="h-4 w-4" /> Online ordering
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Paste your DoorDash / Uber Eats / Skip links. Customers will see a Pickup / Delivery panel on your page with branded
        buttons. Live fees &amp; ETAs stay on the partner's site — always up to date.
      </p>

      <div className="space-y-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${f.color}`} />
              {f.label}
            </span>
            <input
              type="url"
              value={form[f.key] ?? ""}
              onChange={set(f.key)}
              placeholder={f.placeholder}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save ordering links"}
        </button>
      </div>
    </form>
  );
}
