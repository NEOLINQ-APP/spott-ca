import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { subscribeToNewsletter } from "@/lib/subscribers.functions";

/**
 * Compact inline newsletter signup. Captures email only — sends to
 * "individual" / no interests by default. Users can refine on /subscribe.
 */
export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const submit = useServerFn(subscribeToNewsletter);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await submit({
        data: {
          email,
          category: "individual",
          interests: [],
          membership_type: "free",
          source,
        } as any,
      });
      setDone(true);
      toast.success("You're subscribed!");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not subscribe.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700">
        <Check className="h-4 w-4" /> You're on the list.{" "}
        <Link to="/subscribe" className="underline">Refine preferences</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
        Subscribe
      </Button>
    </form>
  );
}
