import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ReplyAnalyzer } from "@/components/product/reply-analyzer";
import { ScoreBar } from "@/components/product/status-badge";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { stageLabel, STAGES, type LeadResearch, type LeadRow } from "@/lib/leads";
import { researchLead } from "@/lib/sales.functions";

export const Route = createFileRoute("/app_/leads/$leadId")({
  ssr: false,
  head: () => meta("Lead — LeadPilot", "Lead research, score and next steps."),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: LeadPage,
});

function LeadPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const research = useServerFn(researchLead);
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
    setLead(data);
  }, [leadId]);
  useEffect(() => { void load(); }, [load]);

  async function update(patch: Partial<LeadRow>) {
    const { error } = await supabase.from("leads").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) toast.error("Couldn't save."); else { toast.success("Saved"); void load(); }
  }

  async function runResearch() {
    setBusy(true);
    try {
      const r = await research({ data: { leadId } });
      if (r.ok) { toast.success("Research ready"); void load(); } else toast.error(r.error);
    } catch { toast.error("Something went wrong."); }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this lead?")) return;
    await supabase.from("leads").delete().eq("id", leadId);
    navigate({ to: "/app" });
  }

  if (!lead) return <div className="p-10 text-sm text-muted-foreground">Loading lead…</div>;
  const r = lead.research as unknown as LeadResearch | null;

  return (
    <div className="min-h-screen bg-surface-muted">
      <Toaster />
      <main className="container-page space-y-6 py-8">
        <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to workspace</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{lead.company}</h1>
            <p className="text-sm text-muted-foreground">{[lead.contact_name, lead.role, lead.industry, lead.location].filter(Boolean).join(" · ") || "No details yet"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="cta" onClick={runResearch} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{r ? "Refresh research" : "Research & score"}</Button>
            <Button variant="ghost" onClick={remove}>Delete</Button>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-3">
          <label className="space-y-1 text-sm">Stage
            <select value={lead.stage} onChange={(e) => update({ stage: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3">
              {STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Next follow up
            <Input type="date" value={lead.next_follow_up_at?.slice(0, 10) ?? ""} onChange={(e) => update({ next_follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </label>
          <div className="space-y-1 text-sm">Last contacted
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : "Never"}</span>
              <Button size="sm" variant="outline" onClick={() => update({ last_contacted_at: new Date().toISOString(), stage: lead.stage === "new" ? "contacted" : lead.stage })}>Mark contacted today</Button>
            </div>
          </div>
        </div>

        {r ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 rounded-xl border border-border bg-surface p-5 lg:col-span-2">
              {([["Company overview", r.overview], ["Products and services", r.products], ["Target customers", r.targetCustomers], ["Website notes", r.websiteNotes], ["Recommended sales angle", r.salesAngle]] as const).map(([t, v]) => (
                <div key={t}><h3 className="text-sm font-semibold">{t}</h3><p className="mt-1 text-sm text-muted-foreground">{v}</p></div>
              ))}
              <div className="grid gap-4 sm:grid-cols-2">
                <div><h3 className="text-sm font-semibold">Buying signals</h3><ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{r.buyingSignals.map((s) => <li key={s}>{s}</li>)}</ul></div>
                <div><h3 className="text-sm font-semibold">Pain points</h3><ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{r.painPoints.map((s) => <li key={s}>{s}</li>)}</ul></div>
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold">Lead score</h3>
              {lead.score != null && <ScoreBar score={lead.score} />}
              <ul className="list-disc pl-5 text-sm text-muted-foreground">{r.scoreReasons.map((s) => <li key={s}>{s}</li>)}</ul>
              <h3 className="text-sm font-semibold">Recommendation</h3>
              <p className="text-sm">{r.recommendation}</p>
              <p className="text-xs text-muted-foreground">Based on the details you entered; the AI does not browse the web.</p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-sm text-muted-foreground">No research yet. Click "Research & score" for a brief, buying signals and a recommended angle.</p>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Analyze a reply from this lead</h2>
          <ReplyAnalyzer leads={[]} fixedLeadId={lead.id} onDone={load} />
        </div>
      </main>
    </div>
  );
}
