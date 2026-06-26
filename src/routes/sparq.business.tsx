import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Bot, Code2, Palette, MessageSquare, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/sparq/business")({
  head: () => ({
    meta: [
      { title: "Sparq for Business — AI Chat Assistant for Your Website" },
      {
        name: "description",
        content:
          "Add Sparq AI to your business website in minutes. Answers customer questions 24/7, drafts replies, and books leads. 14-day free trial, no card required.",
      },
      { property: "og:title", content: "Sparq for Business — AI for Your Website" },
      { property: "og:description", content: "Add an AI assistant to your site in minutes. 14-day free trial." },
    ],
  }),
  component: Page,
});

const tiers = [
  { name: "Starter", price: 39, msgs: "500 messages/mo", features: ["1 website", "Branded widget", "Knowledge base", "Email alerts"] },
  { name: "Growth", price: 89, msgs: "2,500 messages/mo", popular: true, features: ["Up to 3 sites", "Lead capture forms", "Auto-reply drafts", "Analytics dashboard"] },
  { name: "Scale", price: 149, msgs: "10,000 messages/mo", features: ["Unlimited sites", "Custom workflows", "Booking integration", "Priority models"] },
  { name: "Enterprise", price: 249, msgs: "Unlimited", features: ["Dedicated workspace", "API access", "White-glove onboarding", "SLA"] },
];

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <Badge variant="outline" className="mb-4 inline-flex gap-1">
            <Zap className="h-3 w-3" /> 14-day free trial — no card required
          </Badge>
          <div className="inline-flex h-16 w-16 rounded-2xl bg-primary text-primary-foreground items-center justify-center mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Add <span className="text-primary">Sparq AI</span> to your website
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            A trained AI assistant that answers customer questions, books appointments, and captures leads — 24/7, on your site, in your brand.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/sparq/business/signup">
                <Bot className="mr-2 h-5 w-5" /> Start 14-day free trial
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required. Install in 2 minutes.</p>
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">From signup to live in 3 steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Palette, title: "1. Brand it", body: "Pick a color, write your greeting, paste your website URL or FAQs so Sparq learns your business." },
            { icon: Code2, title: "2. Install it", body: "Copy one line of HTML. Paste it before </body> on your site. Done." },
            { icon: MessageSquare, title: "3. Watch it work", body: "Sparq starts answering customer questions, capturing leads, and notifying you of hot conversations." },
          ].map((s) => (
            <Card key={s.title} className="p-6">
              <s.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, founding-member pricing</h2>
          <p className="text-center text-muted-foreground mb-12">Lock these rates forever — prices go up at general launch.</p>
          <div className="grid md:grid-cols-4 gap-4">
            {tiers.map((t) => (
              <Card key={t.name} className={`p-6 relative ${t.popular ? "border-primary ring-2 ring-primary/20" : ""}`}>
                {t.popular && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Most popular</Badge>}
                <h3 className="font-bold text-lg">{t.name}</h3>
                <div className="mt-2 text-3xl font-bold">${t.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <p className="text-xs text-muted-foreground mt-1">{t.msgs}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{f}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild size="lg">
              <Link to="/sparq/business/signup">Start your free trial</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
