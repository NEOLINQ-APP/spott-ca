import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, MapPin, Megaphone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact us — Spott" },
      { name: "description", content: "Get in touch with the Spott team — questions, partnerships, listing support, or feedback." },
      { property: "og:title", content: "Contact Spott" },
      { property: "og:description", content: "Reach the Spott team for support and partnerships." },
      { property: "og:url", content: "https://www.spott.ca/contact" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/contact" }],
  }),
});

function ContactPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Contact us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We'd love to hear from you. Pick the option below that fits best — we usually reply within one business day.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="mailto:hello@spott.ca" className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" /> General
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Questions, feedback, or anything else.</p>
            <p className="mt-3 text-sm text-primary group-hover:underline">hello@spott.ca</p>
          </a>
          <a href="mailto:support@spott.ca" className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" /> Listing support
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Claims, edits, billing, or account help.</p>
            <p className="mt-3 text-sm text-primary group-hover:underline">support@spott.ca</p>
          </a>
          <a href="mailto:ads@spott.ca" className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 sm:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Megaphone className="h-4 w-4 text-primary" /> Advertising & Promoters
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Buy ad space on Spott or apply to our promoter / affiliate program.</p>
            <p className="mt-3 text-sm text-primary group-hover:underline">ads@spott.ca</p>
          </a>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" /> Spott
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Operated from Canada. Mailing inquiries can be sent via email above and we'll route them appropriately.
          </p>
        </div>
      </main>
    </div>
  );
}
