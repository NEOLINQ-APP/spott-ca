import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, PlayCircle, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/marketplace";
import { trackSponsoredClick, submitSponsoredLead } from "@/lib/sponsored.functions";

export type SponsoredListing = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  price_cents: number | null;
  currency: string;
  city: string | null;
  province: string | null;
  sponsor_name: string | null;
  cta_label: string;
};

export function SponsoredListingCard({ listing: l }: { listing: SponsoredListing }) {
  const [open, setOpen] = useState(false);
  const track = useServerFn(trackSponsoredClick);
  const submit = useServerFn(submitSponsoredLead);

  const onOpen = () => {
    setOpen(true);
    track({ data: { sponsoredListingId: l.id } }).catch(() => {});
  };

  return (
    <>
      <button
        onClick={onOpen}
        className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-amber-400/40 bg-card text-left transition hover:border-amber-400/70"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {l.image_url ? (
            <img
              src={l.image_url}
              alt={l.title}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Sparkles className="h-8 w-8" />
            </div>
          )}
          {l.video_url && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <PlayCircle className="h-10 w-10 text-white drop-shadow" />
            </div>
          )}
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <Sparkles className="h-3 w-3" /> Sponsored
          </span>
        </div>
        <div className="p-3">
          {l.price_cents != null && (
            <div className="text-base font-semibold leading-tight">
              {formatPrice(l.price_cents, l.currency, "sale")}
            </div>
          )}
          <div className="mt-1 line-clamp-1 text-sm text-foreground">{l.title}</div>
          {l.sponsor_name && (
            <div className="mt-0.5 line-clamp-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              {l.sponsor_name}
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground">
            {l.city ? `${l.city}${l.province ? ", " + l.province : ""}` : "Canada-wide"}
          </div>
          <div className="mt-2 inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            {l.cta_label}
          </div>
        </div>
      </button>

      <SponsoredLeadDialog listing={l} open={open} onOpenChange={setOpen} submit={submit} />
    </>
  );
}

function SponsoredLeadDialog({
  listing: l,
  open,
  onOpenChange,
  submit,
}: {
  listing: SponsoredListing;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  submit: ReturnType<typeof useServerFn<typeof submitSponsoredLead>>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Please enter an email or phone number so we can reach you");
      return;
    }
    setLoading(true);
    try {
      await submit({
        data: {
          sponsoredListingId: l.id,
          name,
          email,
          phone,
          message,
          city,
          province,
        },
      });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setDone(false);
          setName("");
          setEmail("");
          setPhone("");
          setMessage("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle>Thanks — we got it</DialogTitle>
            <DialogDescription>
              We've passed your interest in {l.title.toLowerCase()} along. Someone will follow up soon.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> {l.title}
              </DialogTitle>
              <DialogDescription>
                {l.description || "This is a sponsored placement, not a listing from an individual seller. Leave your details and we'll connect you."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              <div className="grid grid-cols-2 gap-2">
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input placeholder="Province" value={province} onChange={(e) => setProvince(e.target.value)} />
              </div>
              <Textarea
                placeholder="Anything specific you're looking for? (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Get in touch
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
