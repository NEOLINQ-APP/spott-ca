import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, MessageSquare, Camera, Wand2, Bot, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/sparq/")({
  head: () => ({
    meta: [
      { title: "Sparq — Your AI Assistant for Spott.ca" },
      {
        name: "description",
        content:
          "Meet Sparq — the AI assistant that writes your ads, generates photos, finds customers, and helps you run your business on Spott.ca. Founding member pricing from $4.99/mo.",
      },
      { property: "og:title", content: "Sparq — Your AI Assistant for Spott.ca" },
    ],
  }),
  component: SparqLanding,
});

const personalTiers = [
  { name: "Spark", price: 4.99, blurb: "Just the essentials", features: ["50 AI generations/mo", "Ad description writer", "Basic photo cleanup"] },
  { name: "Flow", price: 9.99, blurb: "For active sellers", features: ["200 AI generations", "AI photo generation", "Price suggestions", "Auto-reply drafts"], popular: true },
  { name: "Pro", price: 19.99, blurb: "Power users", features: ["Unlimited text", "500 AI images", "Voice chat", "Personal shopper"] },
  { name: "Elite", price: 39.99, blurb: "Everything unlocked", features: ["Unlimited everything", "Priority models", "Early access features"] },
];

const businessTiers = [
  { name: "Starter", price: 39, blurb: "Solo operators", features: ["AI listing manager", "Customer Q&A drafts", "Weekly insights"] },
  { name: "Growth", price: 89, blurb: "Most popular", features: ["Lead drafting", "Review responder", "Social post drafts", "Booking assistant"], popular: true },
  { name: "Scale", price: 149, blurb: "Established teams", features: ["Multi-location support", "Custom workflows", "Stock/finance research"] },
  { name: "Enterprise", price: 249, blurb: "Dealers & big shops", features: ["Dedicated workspace", "API access", "White-glove onboarding"] },
];

function SparqLanding() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <Badge variant="outline" className="mb-4 inline-flex gap-1">
            <Crown className="h-3 w-3" /> Founding Member Pricing — Limited
          </Badge>
          <div className="inline-flex h-16 w-16 rounded-2xl bg-primary text-primary-foreground items-center justify-center mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Meet <span className="text-primary">Sparq</span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Your AI assistant for Spott.ca. Writes your ads, generates photos, answers customers, and helps you run your business — 24/7.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/sparq/chat">
                <MessageSquare className="mr-2 h-5 w-5" /> Try Sparq free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#pricing">See pricing</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            3 free generations · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      {/* What it does */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">What Sparq does for you</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Wand2, title: "Writes your ads", text: "Tell Sparq what you're selling. It writes the title, description, and hashtags that get clicks." },
            { icon: Camera, title: "Generates photos", text: "No photo? No problem. Sparq creates clean product images from a short description." },
            { icon: Bot, title: "Talks to customers", text: "Drafts replies to messages, leads, and reviews — in your voice — so you never miss a sale." },
            { icon: MessageSquare, title: "Finds things fast", text: "\"Find me a mechanic in Mississauga open Sunday\" — Sparq knows the directory." },
            { icon: Sparkles, title: "Books & follows up", text: "Drafts bookings, reminders, and follow-ups so leads don't go cold." },
            { icon: Crown, title: "Reports daily", text: "Wake up to a one-page brief: views, leads, money, what needs your attention." },
          ].map((f) => (
            <Card key={f.title} className="p-6">
              <f.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-2">Founding Member</Badge>
            <h2 className="text-3xl font-bold">Lock in your price for life</h2>
            <p className="mt-2 text-muted-foreground">
              Annual prepay = this price, forever. First 100 lifetime founders get a special badge.
            </p>
          </div>

          <h3 className="text-lg font-semibold mb-3">For people</h3>
          <div className="grid md:grid-cols-4 gap-3 mb-10">
            {personalTiers.map((t) => (
              <Card key={t.name} className={`p-5 ${t.popular ? "border-primary border-2" : ""}`}>
                {t.popular && <Badge className="mb-2">Most popular</Badge>}
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground mb-2">{t.blurb}</div>
                <div className="text-3xl font-bold">${t.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="mt-3 space-y-1 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <h3 className="text-lg font-semibold mb-3">For business</h3>
          <div className="grid md:grid-cols-4 gap-3">
            {businessTiers.map((t) => (
              <Card key={t.name} className={`p-5 ${t.popular ? "border-primary border-2" : ""}`}>
                {t.popular && <Badge className="mb-2">Most popular</Badge>}
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground mb-2">{t.blurb}</div>
                <div className="text-3xl font-bold">${t.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="mt-3 space-y-1 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Checkout opens when you click "Subscribe" inside Sparq. Prices in CAD. Cancel anytime.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">Try Sparq free</h2>
        <p className="text-muted-foreground mb-6">3 free generations. No card needed.</p>
        <Button asChild size="lg">
          <Link to="/sparq/chat"><MessageSquare className="mr-2 h-5 w-5" /> Open Sparq</Link>
        </Button>
      </section>
    </div>
  );
}
