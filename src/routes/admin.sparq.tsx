// Admin console for Sparq — the AI assistant's global brain.
// Wires the previously-unused getSparqSettings/updateSparqSettings server
// functions (src/lib/sparq-settings.functions.ts) to a real UI so admins can
// actually change Sparq's model, prompt override and guardrails, instead of
// them only existing as dead defaults in sparq-settings.server.ts.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getSparqSettings, updateSparqSettings, type SparqSettings } from "@/lib/sparq-settings.functions";

export const Route = createFileRoute("/admin/sparq")({
  component: AdminSparqPage,
  head: () => ({ meta: [{ title: "Sparq AI — Spott Admin" }] }),
});

const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
];

const VOICES = ["nova", "alloy", "echo", "fable", "onyx", "shimmer"];

function AdminSparqPage() {
  const fetchSettings = useServerFn(getSparqSettings);
  const save = useServerFn(updateSparqSettings);
  const [form, setForm] = useState<SparqSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings({})
      .then((s) => setForm(s))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof SparqSettings>(key: K, value: SparqSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await save({ data: form });
      setForm(updated);
      toast.success("Sparq settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Sparq AI"
      description="Configure the assistant's model, guardrails, and prompt overrides. Changes apply to every chat within ~30 seconds."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/sparq-learning">View conversations</Link>
        </Button>
      }
    >
      {loading || !form ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Status &amp; model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sparq enabled</Label>
                  <p className="text-xs text-muted-foreground">Turn off to take Sparq offline platform-wide.</p>
                </div>
                <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
              </div>

              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select value={form.model} onValueChange={(v) => set("model", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Temperature ({form.temperature.toFixed(2)})</Label>
                <Input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.temperature}
                  onChange={(e) => set("temperature", Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Default voice</Label>
                  <Select value={form.voice_default} onValueChange={(v) => set("voice_default", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VOICES.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Voice speed</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={form.voice_speed}
                    onChange={(e) => set("voice_speed", Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guardrails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Strict mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Refuse every off-topic question with no exceptions, even if the user insists.
                  </p>
                </div>
                <Switch
                  checked={form.business_strict_mode}
                  onCheckedChange={(v) => set("business_strict_mode", v)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Off-topic redirect line</Label>
                <Textarea
                  rows={2}
                  value={form.offtopic_redirect}
                  onChange={(e) => set("offtopic_redirect", e.target.value)}
                  placeholder="The line Sparq uses when redirecting off-topic questions"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Additional rules</Label>
                <Textarea
                  rows={3}
                  value={form.business_additional_rules ?? ""}
                  onChange={(e) => set("business_additional_rules", e.target.value || null)}
                  placeholder="Extra rules appended to every conversation (optional)"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Additional instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Appended to the built-in system prompt — use this for seasonal notes, promos, or tone tweaks.
              </p>
              <Textarea
                rows={4}
                value={form.additional_instructions ?? ""}
                onChange={(e) => set("additional_instructions", e.target.value || null)}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">System prompt override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Leave blank to use the built-in Sparq prompt. If set, this text fully replaces it (guardrails above still apply on top).
              </p>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                value={form.system_prompt_override ?? ""}
                onChange={(e) => set("system_prompt_override", e.target.value || null)}
              />
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
