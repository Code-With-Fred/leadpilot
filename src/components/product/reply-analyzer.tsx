import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INTENT_LABEL, notifyLeadsChanged, type LeadRow, type ReplyAnalysis } from "@/lib/leads";
import { analyzeReply } from "@/lib/sales.functions";

export function AnalysisCard({ a }: { a: ReplyAnalysis }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium text-accent-foreground">{INTENT_LABEL[a.intent]}</span>
        <span className="rounded-full border border-border px-2 py-0.5 capitalize">{a.sentiment}</span>
        <span className="rounded-full border border-border px-2 py-0.5 capitalize">{a.urgency} urgency</span>
      </div>
      <p className="text-sm">{a.summary}</p>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Next step</p>
        <p className="mt-1 text-sm font-medium">{a.nextAction}</p>
      </div>
      {a.suggestedReply && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Suggested reply</p>
            <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(a.suggestedReply); toast.success("Copied"); }}>
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
          <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface-muted p-3 text-sm">{a.suggestedReply}</p>
        </div>
      )}
    </div>
  );
}

export function ReplyAnalyzer({ leads, fixedLeadId, onDone }: { leads: LeadRow[]; fixedLeadId?: string; onDone?: () => void }) {
  const run = useServerFn(analyzeReply);
  const [reply, setReply] = useState("");
  const [leadId, setLeadId] = useState(fixedLeadId ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReplyAnalysis | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reply.trim().length < 3) { toast.error("Paste the prospect's reply first."); return; }
    setBusy(true);
    setResult(null);
    try {
      const r = await run({ data: { reply, leadId: leadId || null } });
      if (!r.ok) toast.error(r.error);
      else {
        setResult(r.analysis);
        if (leadId) notifyLeadsChanged();
        onDone?.();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-5">
        {!fixedLeadId && (
          <div className="space-y-1.5">
            <Label htmlFor="reply-lead">Which lead is this from? (optional)</Label>
            <select id="reply-lead" value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Not linked to a lead</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.company}{l.contact_name ? ` — ${l.contact_name}` : ""}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="reply-text">Their reply</Label>
          <Textarea id="reply-text" rows={7} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste the email or message they sent back" />
        </div>
        <Button type="submit" variant="cta" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Analyze reply</Button>
        {leadId && <p className="text-xs text-muted-foreground">Interested replies move the lead to "Interested"; "not interested" marks it lost.</p>}
      </form>
      <div>{result ? <AnalysisCard a={result} /> : <p className="text-sm text-muted-foreground">The meaning of the reply and what to do next will appear here.</p>}</div>
    </div>
  );
}
