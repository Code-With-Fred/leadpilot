import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBusinessProfile, type BusinessProfile, type Workspace } from "@/lib/workspace";

const TONES = ["friendly", "professional", "direct"] as const;

export function BusinessProfileForm({
  workspace,
  onboarding = false,
  onSaved,
}: {
  workspace: Workspace;
  onboarding?: boolean;
  onSaved?: () => void;
}) {
  const [f, setF] = useState<BusinessProfile>({
    name: workspace.name,
    industry: workspace.industry ?? "",
    website: workspace.website ?? "",
    offer: workspace.offer ?? "",
    target_customer: workspace.target_customer ?? "",
    value_proposition: workspace.value_proposition ?? "",
    tone: workspace.tone || "professional",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const set = (k: keyof BusinessProfile) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setOk(false);
    if (!f.name.trim()) return setError("Please enter your business name.");
    if (!f.offer?.trim()) return setError("Please describe what you sell — the AI uses it in every message.");
    if (f.website && !/^https?:\/\/\S+\.\S+/.test(f.website)) return setError("Website should start with https://");
    setError("");
    setSaving(true);
    try {
      const clean = Object.fromEntries(
        Object.entries(f).map(([k, v]) => [k, typeof v === "string" ? v.trim().slice(0, 1000) || null : v]),
      ) as BusinessProfile;
      await saveBusinessProfile(workspace.id, { ...clean, name: f.name.trim(), tone: f.tone }, onboarding);
      setOk(true);
      onSaved?.();
    } catch {
      setError("Couldn't save. Only workspace owners and admins can change these details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="bp-name">Business name</Label><Input id="bp-name" value={f.name} onChange={set("name")} maxLength={160} /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-ind">Industry</Label><Input id="bp-ind" value={f.industry ?? ""} onChange={set("industry")} placeholder="e.g. Commercial roofing" maxLength={120} /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="bp-web">Website</Label><Input id="bp-web" value={f.website ?? ""} onChange={set("website")} placeholder="https://" maxLength={300} /></div>
      <div className="space-y-1.5"><Label htmlFor="bp-offer">What do you sell?</Label><Textarea id="bp-offer" rows={3} value={f.offer ?? ""} onChange={set("offer")} maxLength={1000} placeholder="Your main product or service, and the result it gives customers." /></div>
      <div className="space-y-1.5"><Label htmlFor="bp-icp">Who is your ideal customer?</Label><Textarea id="bp-icp" rows={2} value={f.target_customer ?? ""} onChange={set("target_customer")} maxLength={1000} placeholder="Industry, company size, location, job title of the buyer." /></div>
      <div className="space-y-1.5"><Label htmlFor="bp-vp">Why do customers choose you?</Label><Textarea id="bp-vp" rows={2} value={f.value_proposition ?? ""} onChange={set("value_proposition")} maxLength={1000} /></div>
      <div className="space-y-1.5">
        <Label>Message tone</Label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Button key={t} type="button" size="sm" variant={f.tone === t ? "default" : "outline"} onClick={() => setF({ ...f, tone: t })}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      {ok && !onboarding && <p role="status" className="text-sm text-success">Saved.</p>}
      <Button type="submit" variant="cta" disabled={saving}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        {onboarding ? "Finish setup" : "Save changes"}
      </Button>
    </form>
  );
}
