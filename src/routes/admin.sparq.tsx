import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  getSparqSettings,
  updateSparqSettings,
  type SparqSettings,
} from "@/lib/sparq-settings.functions";

export const Route = createFileRoute("/admin/sparq")({
  component: AdminSparq,
  head: () => ({ meta: [{ title: "Sparq Control (Zeus) — Spott" }] }),
});

const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-3-pro-preview",
  "google/gemini-2.5-flash",
  "openai/gpt-5.2",
  "openai/gpt-5.2-mini",
];

const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];

function AdminSparq() {
  const get = useServerFn(getSparqSettings);
  const update = useServerFn(updateSparqSettings);
  const [s, setS] = useState<SparqSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get()
      .then((row) => setS(row))
      .catch((e) => toast.error(e.message ?? "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [get]);

  if (loading || !s) {
    return (
      <AdminShell title="Sparq Control (Zeus)" description="Full control of Sparq AI assistants">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  function patch<K extends keyof SparqSettings>(key: K, value: SparqSettings[K]) {
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      const row = await update({ data: s });
      setS(row);
      toast.success("Sparq settings saved — changes apply within 30 seconds.");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Sparq Control (Zeus)" description="God-mode control of the Sparq concierge and every business assistant.">
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>Master Switch & Model</CardTitle>
            <CardDescription>Disable Sparq site-wide instantly, or change the underlying AI model.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">Sparq enabled</div>
                <div className="text-sm text-muted-foreground">When off, visitors and business widgets see a paused message. Admins still get replies.</div>
              </div>
              <Switch checked={s.enabled} onCheckedChange={(v) => patch("enabled", v)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={s.model}
                  onChange={(e) => patch("model", e.target.value)}
                >
                  {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Temperature: {s.temperature.toFixed(2)}</Label>
                <Slider
                  value={[s.temperature]}
                  min={0} max={1.5} step={0.05}
                  onValueChange={([v]) => patch("temperature", v)}
                />
                <div className="text-xs text-muted-foreground">Lower = more focused. Higher = more creative.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spott.ca Sparq — Concierge Behavior</CardTitle>
            <CardDescription>Controls Sparq on Spott.ca itself. Override the prompt entirely, append instructions, or change the off-topic redirect.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Off-topic redirect (one sentence)</Label>
              <Input
                value={s.offtopic_redirect}
                onChange={(e) => patch("offtopic_redirect", e.target.value)}
              />
              <div className="text-xs text-muted-foreground">Used when a visitor tries to chat about feelings, life advice, or anything outside Spott.ca.</div>
            </div>

            <div className="space-y-2">
              <Label>Additional instructions (appended to default prompt)</Label>
              <Textarea
                rows={5}
                placeholder="e.g. Always push verified businesses first. Mention the Founding Member discount when relevant."
                value={s.additional_instructions ?? ""}
                onChange={(e) => patch("additional_instructions", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Full system prompt override (advanced — leave blank to use default)</Label>
              <Textarea
                rows={8}
                placeholder="Leave empty unless you want to fully replace Sparq's default personality and scope."
                value={s.system_prompt_override ?? ""}
                onChange={(e) => patch("system_prompt_override", e.target.value)}
              />
              <div className="text-xs text-muted-foreground">When set, this REPLACES the default prompt. Additional instructions are still appended.</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Assistants — Platform Policy</CardTitle>
            <CardDescription>Controls every Sparq widget hired by a business on Spott.ca. Enforce strict business-only behavior so customer assistants never wander into personal chat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">Strict business-only mode</div>
                <div className="text-sm text-muted-foreground">
                  Locks every business assistant to its own business. No feelings, no life advice, no off-topic. Strongly recommended.
                </div>
              </div>
              <Switch
                checked={s.business_strict_mode}
                onCheckedChange={(v) => patch("business_strict_mode", v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Platform rules added to every business assistant</Label>
              <Textarea
                rows={5}
                placeholder="e.g. Never quote prices below $50. Always offer to collect the customer's email when they ask a question you can't answer."
                value={s.business_additional_rules ?? ""}
                onChange={(e) => patch("business_additional_rules", e.target.value)}
              />
              <div className="text-xs text-muted-foreground">Applied on top of each business's own knowledge base and assistant name.</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice Defaults</CardTitle>
            <CardDescription>Defaults that new conversations start with. Visitors can still override in the Sparq chat settings menu.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default voice</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={s.voice_default}
                  onChange={(e) => patch("voice_default", e.target.value)}
                >
                  {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Default speed: {s.voice_speed.toFixed(2)}x</Label>
                <Slider
                  value={[s.voice_speed]}
                  min={0.5} max={1.5} step={0.05}
                  onValueChange={([v]) => patch("voice_speed", v)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
            Save Sparq settings
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
