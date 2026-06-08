import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  subscribeToNewsletter,
  SUBSCRIBER_CATEGORIES,
  CANADIAN_PROVINCES,
  INTEREST_OPTIONS,
} from "@/lib/subscribers.functions";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/subscribe")({
  component: SubscribePage,
  head: () => ({
    meta: [
      { title: "Join the Spott.ca Newsletter — Canadian Marketplace Updates" },
      { name: "description", content: "Get weekly Canadian business, marketplace, and local deal updates from Spott.ca. Choose your province, city, and interests." },
      { property: "og:title", content: "Join Spott.ca — Canada's Modern Marketplace Newsletter" },
      { property: "og:description", content: "Subscribe for weekly Canadian business and marketplace updates tailored to your province, city, and interests." },
      { rel: "canonical", href: "https://spott.ca/subscribe" } as any,
    ],
  }),
});

function SubscribePage() {
  const submit = useServerFn(subscribeToNewsletter);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    display_name: "",
    category: "individual" as (typeof SUBSCRIBER_CATEGORIES)[number]["value"],
    province: "",
    city: "",
    interests: [] as string[],
    membership_type: "free",
  });

  const toggleInterest = (i: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return;
    setLoading(true);
    try {
      await submit({
        data: {
          email: form.email,
          display_name: form.display_name || null,
          category: form.category,
          province: form.province || null,
          city: form.city || null,
          interests: form.interests,
          membership_type: form.membership_type,
          source: "subscribe_page",
        },
      });
      setDone(true);
      toast.success("You're subscribed!");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not subscribe. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-3xl px-4 py-12 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Join Canada's Modern Marketplace Newsletter
          </h1>
          <p className="mt-3 text-muted-foreground">
            Weekly updates on Canadian businesses, marketplace finds, real estate,
            vehicles, jobs and local deals — tailored to your province and interests.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-2xl px-4 py-10">
        {done ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-700">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">You're all set!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Look out for our next newsletter in your inbox. You can unsubscribe any time using the link in any email.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6 rounded-xl border bg-card p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email" type="email" required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <Label>I am a... *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBSCRIBER_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Province</Label>
                <Select
                  value={form.province}
                  onValueChange={(v) => setForm({ ...form, province: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                  <SelectContent>
                    {CANADIAN_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Toronto"
                />
              </div>
            </div>

            <div>
              <Label>What are you interested in?</Label>
              <p className="mb-3 text-xs text-muted-foreground">
                Pick a few — we'll tailor your newsletters.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {INTEREST_OPTIONS.map((i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={form.interests.includes(i)}
                      onCheckedChange={() => toggleInterest(i)}
                    />
                    {i}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Subscribe to Spott.ca
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By subscribing you agree to receive emails from Spott.ca. Unsubscribe anytime.
            </p>
          </form>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
