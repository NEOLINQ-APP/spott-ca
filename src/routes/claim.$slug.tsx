import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/claim/$slug")({ component: ClaimPage });

function ClaimPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [biz, setBiz] = useState<{ id: string; name: string; is_claimed: boolean } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      setUserId(uid);
      if (sess.session?.user?.email) setEmail(sess.session.user.email);
      const { data } = await supabase.from("businesses").select("id,name,is_claimed").eq("slug", slug).maybeSingle();
      setBiz(data as any);
      setLoading(false);
    })();
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { navigate({ to: "/auth" }); return; }
    if (!biz) return;
    setSubmitting(true);
    const { error } = await supabase.from("business_claims").insert({
      business_id: biz.id,
      claimant_id: userId,
      claimant_email: email,
      claimant_phone: phone || null,
      claimant_role: role || null,
      proof_notes: notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim submitted. We'll review within 1–2 business days.");
    navigate({ to: "/business/$slug", params: { slug } });
  }

  if (loading) return <div className="min-h-dvh grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!biz) return <div className="min-h-dvh"><SiteHeader /><div className="mx-auto max-w-2xl px-6 py-16">Business not found.</div></div>;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Claim this business
        </div>
        <h1 className="font-display text-3xl font-bold">Is <span className="text-primary">{biz.name}</span> your business?</h1>
        <p className="mt-2 text-muted-foreground">Claim it to manage your listing, reply to reviews, add photos, run specials, and accept bookings.</p>

        {biz.is_claimed ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6 text-sm">This business has already been claimed. <Link to="/business/$slug" params={{ slug }} className="text-primary hover:underline">View listing</Link>.</div>
        ) : !userId ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6 text-sm">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to submit a claim.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Business email *"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="owner@yourbusiness.com" /></Field>
            <Field label="Phone"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="(555) 555-5555" /></Field>
            <Field label="Your role"><input value={role} onChange={(e) => setRole(e.target.value)} className="input" placeholder="Owner, Manager, etc." /></Field>
            <Field label="Proof of ownership"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-24" placeholder="Business registration #, website you control, or any verification details" /></Field>
            <button disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit claim
            </button>
          </form>
        )}
      </div>
      <style>{`.input{display:block;width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--card));padding:.625rem .875rem;font-size:.875rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span>{children}</label>;
}
