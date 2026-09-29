import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/product/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { stageLabel, type LeadQualification, type LeadRow } from "@/lib/leads";
import { qualifyLead } from "@/lib/sales.functions";
import { cn } from "@/lib/utils";

const VERDICT: Record<LeadQualification["verdict"], { label: string; cls: string }> = {
  qualified: { label: "Qualified", cls: "bg-success-soft text-success" },
  nurture: { label: "Nurture", cls: "bg-primary-soft text-accent-foreground" },
  needs_info: { label: "Needs more info", cls: "bg-warning-soft text-warning-foreground" },
  disqualified: { label: "Not a fit", cls: "bg-surface-muted text-muted-foreground" },
};
const CRIT_CLS = { yes: "text-success", no: "text-destructive", unknown: "text-muted-foreground" };

export function LeadQualifier({ lead, onChanged, onStage }: { lead: LeadRow; onChanged: () => void; onStage: (s: string) => void }) {
  const qualify = useServerFn(qualifyLead);
  const [log, setLog] = useState(lead.interactions ?? "");
  const [busy, setBusy] = useState(false);
  const q = lead.qualification as unknown as LeadQualification | null;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await qualify({ data: { leadId: lead.id, interactions: log } });
      if (r.ok) { toast.success("Qualification ready"); onChanged(); } else toast.error(r.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    setBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <form onSubmit={run} className="space-y-3 rounded-xl border border-border bg-surface p-5 lg:col-span-2">
        <Label htmlFor="interactions">Recent interactions</Label>
        <Textarea id="interactions" rows={8} value={log} onChange={(e) => setLog(e.target.value)}
          placeholder={"e.g.\nSep 20 – intro call with Dana, said their quoting takes 3 days\nSep 24 – sent pricing, she asked if we integrate with HubSpot\nSep 27 – no reply yet"} />
        <p className="text-xs text-muted-foreground">Calls, emails, meetings. Dates and what was said help the most. Replies you analyze below are included automatically.</p>
        <Button type="submit" variant="cta" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{q ? "Re-qualify" : "Qualify lead"}
        </Button>
      </form>

      <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-3">
        {busy ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reviewing profile and interactions…</p>
        ) : !q ? (
          <p className="text-sm text-muted-foreground">Add what's happened with this lead and get a qualification summary with a recommended next action.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", VERDICT[q.verdict].cls)}>{VERDICT[q.verdict].label}</span>
              <span className="text-xs text-muted-foreground">{q.confidence} confidence · {new Date(q.generatedAt).toLocaleString()}</span>
            </div>
            <p className="text-sm">{q.summary}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["budget", "authority", "need", "timing"] as const).map((k) => (
                <div key={k} className="rounded-lg border border-border p-3">
                  <div className="flex justify-between text-xs font-semibold capitalize">{k}<span className={CRIT_CLS[q[k].status]}>{q[k].status}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{q[k].note}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-primary-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">Recommended next action{q.nextActionWhen ? ` · ${q.nextActionWhen}` : ""}</p>
              <p className="mt-1 text-sm">{q.nextAction}</p>
            </div>
            {q.questionsToAsk.length > 0 && <div><h4 className="text-sm font-semibold">Ask next</h4><ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{q.questionsToAsk.map((s) => <li key={s}>{s}</li>)}</ul></div>}
            {q.risks.length > 0 && <div><h4 className="text-sm font-semibold">Risks</h4><ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{q.risks.map((s) => <li key={s}>{s}</li>)}</ul></div>}
            {q.suggestedStage !== lead.stage && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                Suggested stage: <StatusBadge status={stageLabel(q.suggestedStage)} />
                <Button size="sm" variant="outline" onClick={() => onStage(q.suggestedStage)}>Move to {stageLabel(q.suggestedStage)}</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
