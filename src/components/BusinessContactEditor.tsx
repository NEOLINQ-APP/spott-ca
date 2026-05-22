import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Globe, Loader2, Save } from "lucide-react";
import { updateBusinessContact } from "@/lib/business-contact.functions";

type Props = {
  businessId: string;
  initial: {
    address: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
};

export function BusinessContactEditor({ businessId, initial }: Props) {
  const update = useServerFn(updateBusinessContact);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await update({ data: { business_id: businessId, ...form } });
      toast.success(res.geocoded ? "Saved — map updated to new address." : "Saved.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4" /> Contact &amp; address
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Updating the address re-pins your location on the map automatically.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Street address" icon={<MapPin className="h-3.5 w-3.5" />} value={form.address ?? ""} onChange={set("address")} placeholder="123 Main St" />
        <Field label="City" value={form.city ?? ""} onChange={set("city")} placeholder="Toronto" />
        <Field label="Province" value={form.province ?? ""} onChange={set("province")} placeholder="ON" />
        <Field label="Postal code" value={form.postal_code ?? ""} onChange={set("postal_code")} placeholder="M5V 1A1" />
        <Field label="Phone" icon={<Phone className="h-3.5 w-3.5" />} value={form.phone ?? ""} onChange={set("phone")} placeholder="(416) 555-1234" />
        <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />} type="email" value={form.email ?? ""} onChange={set("email")} placeholder="hello@business.ca" />
        <div className="sm:col-span-2">
          <Field label="Website" icon={<Globe className="h-3.5 w-3.5" />} type="url" value={form.website ?? ""} onChange={set("website")} placeholder="https://www.example.com" />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon} {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
  );
}
