import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listActiveSponsoredListings,
  trackSponsoredClick,
  submitSponsoredLead,
} from "@/lib/sponsored.functions";

type SponsoredListing = {
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

// Sponsored placements — curated/paid, admin-managed (see /admin/sponsored),
// distinct from real peer-to-peer marketplace_listings: no seller/user_id,
// clicking opens a lead form instead of a normal contact flow (matches the
// sponsored_listings migration's own design: "interest is tracked without
// implying a specific contactable seller exists"). Only shown for the
// marketplace vertical (or the unified "all" feed), since that's the only
// vertical this table's category_id actually maps into.
export function SponsoredListingsRow({ show }: { show: boolean }) {
  const listFn = useServerFn(listActiveSponsoredListings);
  const clickFn = useServerFn(trackSponsoredClick);
  const leadFn = useServerFn(submitSponsoredLead);

  const [active, setActive] = useState<SponsoredListing | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data } = useQuery({
    queryKey: ["sponsored-listings"],
    queryFn: () => listFn({ data: { limit: 6 } }),
    enabled: show,
    staleTime: 60_000,
  });

  const leadMutation = useMutation({
    mutationFn: () =>
      leadFn({
        data: {
          sponsoredListingId: active!.id,
          name,
          email,
          phone,
          message,
          city: active?.city ?? "",
          province: active?.province ?? "",
        },
      }),
    onSuccess: () => setSubmitted(true),
  });

  if (!show || !data || data.length === 0) return null;

  function openLead(listing: SponsoredListing) {
    clickFn({ data: { sponsoredListingId: listing.id } }).catch(() => {});
    setActive(listing);
    setSubmitted(false);
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
  }

  return (
    <>
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sponsored</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.map((listing) => (
            <Card
              key={listing.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-amber-200 dark:border-amber-900"
              onClick={() => openLead(listing)}
            >
              <CardContent className="p-4 flex gap-3">
                {listing.image_url && (
                  <img
                    src={listing.image_url}
                    alt=""
                    className="w-16 h-16 rounded-md object-cover shrink-0 bg-muted"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px]">Sponsored</Badge>
                    {listing.sponsor_name && (
                      <span className="text-xs text-muted-foreground truncate">{listing.sponsor_name}</span>
                    )}
                  </div>
                  <div className="font-medium text-sm truncate">{listing.title}</div>
                  {listing.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{listing.description}</p>
                  )}
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
                    {listing.cta_label}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          {submitted ? (
            <>
              <DialogHeader>
                <DialogTitle>Thanks — we'll be in touch</DialogTitle>
                <DialogDescription>
                  Your interest in "{active?.title}" has been sent. {active?.sponsor_name || "The advertiser"} will follow up soon.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setActive(null)}>Close</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{active?.title}</DialogTitle>
                <DialogDescription>Tell {active?.sponsor_name || "them"} a bit about what you need — they'll follow up directly.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input placeholder="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Textarea placeholder="What do you need?" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => leadMutation.mutate()}
                  disabled={!name.trim() || leadMutation.isPending}
                >
                  {leadMutation.isPending ? "Sending…" : "Send"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
