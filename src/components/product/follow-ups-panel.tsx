import { Link } from "@tanstack/react-router";
import { Check, Copy, SkipForward } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FOLLOWUPS_EVENT } from "@/components/product/campaigns-panel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { notifyLeadsChanged } from "@/lib/leads";

type Row = {
  id: string; lead_id: string; step: number; channel: string; subject: string | null; body: string; due_at: string;
  leads: { company: string; contact_name: string | null; contact_email: string | null } | null;
  campaigns: { name: string } | null;
};

export function FollowUpsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"due" | "upcoming">("due");

  const load = useCallback(async () => {
    setError("");
    const { data, error } = await supabase
      .from("follow_ups")
      .select("id, lead_id, step, channel, subject, body, due_at, leads(company, contact_name, contact_email), campaigns(name)")
      .eq("status", "scheduled").order("due_at").limit(200);
    if (error) setError("Couldn't load follow-ups.");
    else setRows(data as unknown as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    window.addEventListener(FOLLOWUPS_EVENT, load);
    return () => window.removeEventListener(FOLLOWUPS_EVENT, load);
  }, [load]);

  async function complete(r: Row, status: "done" | "skipped") {
    const now = new Date().toISOString();
    const { error } = await supabase.from("follow_ups").update({ status, completed_at: now }).eq("id", r.id);
    if (error) return toast.error("Couldn't update. Please try again.");
    const { data: next } = await supabase.from("follow_ups").select("due_at").eq("lead_id", r.lead_id).eq("status", "scheduled").order("due_at").limit(1).maybeSingle();
    const patch: { next_follow_up_at: string | null; last_contacted_at?: string; stage?: string } = { next_follow_up_at: next?.due_at ?? null };
    if (status === "done") patch.last_contacted_at = now;
    await supabase.from("leads").update(patch).eq("id", r.lead_id);
    if (status === "done") await supabase.from("leads").update({ stage: "contacted" }).eq("id", r.lead_id).eq("stage", "new");
    setRows((x) => x.filter((y) => y.id !== r.id));
    notifyLeadsChanged();
  }

  const now = Date.now();
  const list = rows.filter((r) => (view === "due" ? new Date(r.due_at).getTime() <= now : new Date(r.due_at).getTime() > now));
  const dueCount = rows.filter((r) => new Date(r.due_at).getTime() <= now).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Follow-ups</h2>
        <p className="text-sm text-muted-foreground">
          Copy each message, send it from your own email or LinkedIn, then mark it done. Automatic sending isn't connected yet.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={view === "due" ? "default" : "outline"} onClick={() => setView("due")}>Due now ({dueCount})</Button>
        <Button size="sm" variant={view === "upcoming" ? "default" : "outline"} onClick={() => setView("upcoming")}>Upcoming ({rows.length - dueCount})</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : error ? <div className="flex items-center gap-3 text-sm text-destructive">{error}<Button size="sm" variant="outline" onClick={load}>Retry</Button></div>
        : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            {view === "due" ? "Nothing due. Nice work." : "No upcoming follow-ups. Add leads to a campaign to schedule some."}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => {
              const text = `${r.subject ? `Subject: ${r.subject}\n\n` : ""}${r.body}`;
              return (
                <li key={r.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to="/app/leads/$leadId" params={{ leadId: r.lead_id }} className="font-medium hover:underline">{r.leads?.company ?? "Lead"}</Link>
                      <p className="text-xs text-muted-foreground">
                        Step {r.step} · <span className="capitalize">{r.channel}</span> · due {new Date(r.due_at).toLocaleDateString()}
                        {r.campaigns ? ` · ${r.campaigns.name}` : ""}{r.leads?.contact_email ? ` · ${r.leads.contact_email}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied"))}><Copy className="size-4" /> Copy</Button>
                      <Button size="sm" onClick={() => complete(r, "done")}><Check className="size-4" /> Done</Button>
                      <Button size="sm" variant="ghost" aria-label="Skip" onClick={() => complete(r, "skipped")}><SkipForward className="size-4" /></Button>
                    </div>
                  </div>
                  {r.subject && <p className="mt-3 text-sm font-medium">{r.subject}</p>}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
