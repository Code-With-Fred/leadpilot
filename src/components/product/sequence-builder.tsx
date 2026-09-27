import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Linkedin, Loader2, Mail, Phone, Route as RouteIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { SaveButton } from "@/components/product/save-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { draftSequence, type SequenceStep } from "@/lib/outreach.functions";
import { contentToText } from "@/lib/saved-outreach";

const tones = ["professional", "friendly", "direct"] as const;
const channelIcon = { email: Mail, linkedin: Linkedin, call: Phone } as Record<string, typeof Mail>;

export function SequenceBuilder() {
  const run = useServerFn(draftSequence);
  const [tone, setTone] = useState<(typeof tones)[number]>("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ title: string; goal: string; steps: SequenceStep[] } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (!get("contactName") || !get("company") || !get("offer") || !get("goal"))
      return setError("Please fill in the contact name, company, what you offer and the goal.");
    const steps = Number(get("steps")) || 4;
    const days = Number(get("days")) || 14;
    if (steps < 2 || steps > 6) return setError("Choose between 2 and 6 touches.");
    if (days < 3 || days > 60) return setError("Spread the sequence over 3 to 60 days.");
    setError("");
    setLoading(true);
    try {
      const res = await run({
        data: {
          contactName: get("contactName"), role: get("role"), company: get("company"),
          industry: get("industry"), location: get("location"), notes: get("notes"),
          offer: get("offer"), goal: get("goal"), tone, steps, days,
        },
      });
      if (res.ok) setResult({ title: `Sequence · ${get("contactName")} at ${get("company")}`, goal: get("goal"), steps: res.steps });
      else setError(res.error);
    } catch {
      setError("Couldn't reach the drafting service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const content = result ? { type: "sequence" as const, goal: result.goal, steps: result.steps } : null;

  async function copy() {
    if (!content) return;
    await navigator.clipboard.writeText(contentToText(content));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-border bg-background p-5 shadow-card sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Build a follow-up sequence</h2>
          <p className="text-sm text-muted-foreground">Set a goal and LeadPilot plans every touch, day by day.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="contactName" label="Contact name *" placeholder="Sarah Whitfield" />
          <Field id="role" label="Role" placeholder="Operations Director" />
          <Field id="company" label="Company *" placeholder="Northstar Properties" />
          <Field id="industry" label="Industry" placeholder="Commercial real estate" />
          <Field id="location" label="Location" placeholder="Houston, TX" />
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <div className="flex gap-1.5">
              {tones.map((t) => (
                <button key={t} type="button" onClick={() => setTone(t)}
                  className={`flex-1 rounded-md border px-2 py-2 text-xs capitalize transition-colors ${tone === t ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-muted"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Field id="steps" label="Number of touches" type="number" defaultValue="4" />
          <Field id="days" label="Over how many days" type="number" defaultValue="14" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seq-goal">Follow-up goal *</Label>
          <Input id="seq-goal" name="goal" placeholder="Book a 15 minute intro call this month" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seq-notes">Notes & signals</Label>
          <Textarea id="seq-notes" name="notes" rows={2} placeholder="Opened last email twice, no reply yet…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seq-offer">What you offer *</Label>
          <Textarea id="seq-offer" name="offer" rows={2} placeholder="Commercial solar that cuts energy costs per building" />
        </div>
        {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="cta" size="lg" className="w-full sm:w-auto" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RouteIcon className="size-4" />}
          {loading ? "Planning…" : result ? "Plan again" : "Plan sequence"}
        </Button>
      </form>

      <div className="flex min-h-[320px] flex-col rounded-2xl border border-border bg-background p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Sequence</h2>
          {result && content ? (
            <div className="flex gap-1">
              <SaveButton title={result.title} content={content} />
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy all"}
              </Button>
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-md bg-surface-muted" />)}
          </div>
        ) : result ? <SequenceSteps steps={result.steps} /> : (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">Your timed sequence will appear here. Review each step before it goes out.</p>
        )}
      </div>
    </section>
  );
}

export function SequenceSteps({ steps }: { steps: SequenceStep[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((s, i) => {
        const Icon = channelIcon[s.channel] ?? Mail;
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="grid size-7 place-items-center rounded-full border border-primary/30 bg-primary-soft text-primary"><Icon className="size-3.5" /></span>
              {i < steps.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
            </div>
            <div className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Day {s.day} · <span className="capitalize">{s.channel}</span></p>
              {s.subject ? <p className="mt-1 text-sm font-medium">{s.subject}</p> : null}
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Field({ id, label, placeholder, type, defaultValue }: { id: string; label: string; placeholder?: string; type?: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`seq-${id}`}>{label}</Label>
      <Input id={`seq-${id}`} name={id} placeholder={placeholder} type={type} defaultValue={defaultValue} />
    </div>
  );
}
