import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, PenLine } from "lucide-react";
import { useState, type FormEvent } from "react";

import { SaveButton } from "@/components/product/save-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { draftOutreach } from "@/lib/outreach.functions";

const tones = ["professional", "friendly", "direct"] as const;

export function OutreachDrafter() {
  const draft = useServerFn(draftOutreach);
  const [tone, setTone] = useState<(typeof tones)[number]>("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ subject: string; body: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (!get("contactName") || !get("company") || !get("offer"))
      return setError("Please fill in the contact name, company and what you offer.");
    setError("");
    setLoading(true);
    try {
      const res = await draft({
        data: {
          contactName: get("contactName"), role: get("role"), company: get("company"),
          industry: get("industry"), location: get("location"), notes: get("notes"),
          offer: get("offer"), tone,
        },
      });
      if (res.ok) setResult({ subject: res.subject, body: res.body, title: `Message · ${get("contactName")} at ${get("company")}` });
      else setError(res.error);
    } catch {
      setError("Couldn't reach the drafting service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-border bg-background p-5 shadow-card sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Draft personalized outreach</h2>
          <p className="text-sm text-muted-foreground">Describe the lead and LeadPilot writes the first message.</p>
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes & signals</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Website mentions rising operating costs across 12 buildings…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offer">What you offer *</Label>
          <Textarea id="offer" name="offer" rows={2} placeholder="Commercial solar that cuts energy costs per building" />
        </div>
        {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="cta" size="lg" className="w-full sm:w-auto" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
          {loading ? "Drafting…" : result ? "Draft again" : "Draft message"}
        </Button>
      </form>

      <div className="flex min-h-[320px] flex-col rounded-2xl border border-border bg-background p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Draft</h2>
          {result ? (
            <div className="flex gap-1">
              <SaveButton title={result.title} content={{ type: "message", subject: result.subject, body: result.body }} />
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="mt-4 space-y-2">
            {[80, 100, 95, 60].map((w, i) => <div key={i} className="h-3 animate-pulse rounded bg-surface-muted" style={{ width: `${w}%` }} />)}
          </div>
        ) : result ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium">Subject: {result.subject}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.body}</p>
          </div>
        ) : (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">Your personalized message will appear here. Review it before sending.</p>
        )}
      </div>
    </section>
  );
}

function Field({ id, label, placeholder }: { id: string; label: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} placeholder={placeholder} />
    </div>
  );
}
