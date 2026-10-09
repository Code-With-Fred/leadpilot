import { currentWorkspaceId } from "@/lib/workspace";
import { Link } from "@tanstack/react-router";
import { Check, Copy, Loader2, Play, Send, SkipForward } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FOLLOWUPS_EVENT } from "@/components/product/campaigns-panel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sendFollowUpNow } from "@/lib/email.functions";
import { notifyLeadsChanged } from "@/lib/leads";

type Row = {
  id: string; lead_id: string; step: number; channel: string; subject: string | null; body: string; due_at: string;
  status: "scheduled" | "sending" | "failed" | "paused"; last_error: string | null;
  leads: { company: string; contact_name: string | null; contact_email: string | null } | null;
  campaigns: { name: string; auto_send: boolean } | null;
};

export function FollowUpsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"due" | "upcoming" | "attention">("due");
  const [hasInbox, setHasInbox] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const ws = (await currentWorkspaceId()) ?? "";
    const [{ data, error }, inbox] = await Promise.all([
      supabase
        .from("follow_ups")
        .select("id, lead_id, step, channel, subject, body, due_at, status, last_error, leads(company, contact_name, contact_email), campaigns(name, auto_send)")
        .eq("workspace_id", ws).in("status", ["scheduled", "sending", "failed", "paused"]).order("due_at").limit(300),
      supabase.from("email_accounts").select("id", { count: "exact", head: true }).eq("workspace_id", ws).eq("status", "active"),
    ]);
    setHasInbox((inbox.count ?? 0) > 0);
    if (error) setError("Couldn't load follow-ups.");
    else setRows(data as unknown as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    window.addEventListener(FOLLOWUPS_EVENT, load);
    return () => window.removeEventListener(FOLLOWUPS_EVENT, load);
  }, [load]);

  async function sendNow(r: Row) {
    setBusy(r.id);
    try {
      const res = await sendFollowUpNow({ data: { followUpId: r.id } });
      if (res.ok) toast.success(`Sent from ${res.from}`);
      else toast.error(res.error);
    } catch {
      toast.error("Couldn't send. Please try again.");
    }
    setBusy(null);
    notifyLeadsChanged();
    void load();
  }

  async function resume(r: Row) {
    setBusy(r.id);
    const { data, error } = await supabase.rpc("resume_lead_sequence", { _lead: r.lead_id });
    setBusy(null);
    if (error) { toast.error("Couldn't resume. Please try again."); return; }
    toast.success(`${data ?? 0} step${data === 1 ? "" : "s"} rescheduled, starting tomorrow`);
    notifyLeadsChanged();
    void load();
  }

  async function complete(r: Row, status: "done" | "skipped") {
    const now = new Date().toISOString();
    const { error } = await supabase.from("follow_ups").update({ status, completed_at: now }).eq("id", r.id);
    if (error) { toast.error("Couldn't update. Please try again."); return; }
    const { data: next } = await supabase.from("follow_ups").select("due_at").eq("lead_id", r.lead_id).eq("status", "scheduled").order("due_at").limit(1).maybeSingle();
    const patch: { next_follow_up_at: string | null; last_contacted_at?: string; stage?: string } = { next_follow_up_at: next?.due_at ?? null };
    if (status === "done") patch.last_contacted_at = now;
    await supabase.from("leads").update(patch).eq("id", r.lead_id);
    if (status === "done") await supabase.from("leads").update({ stage: "contacted" }).eq("id", r.lead_id).eq("stage", "new");
    setRows((x) => x.filter((y) => y.id !== r.id));
    notifyLeadsChanged();
  }

  const now = Date.now();
  const live = rows.filter((r) => r.status === "scheduled" || r.status === "sending");
  const attention = rows.filter((r) => r.status === "failed" || r.status === "paused");
  const due = live.filter((r) => new Date(r.due_at).getTime() <= now);
  const list = view === "attention" ? attention : view === "due" ? due : live.filter((r) => new Date(r.due_at).getTime() > now);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Follow-ups</h2>
        <p className="text-sm text-muted-foreground">
          {hasInbox
            ? "Emails on auto-send campaigns go out by themselves. Send anything else with one click, or copy it for LinkedIn and calls."
            : "Copy each message, send it yourself, then mark it done. Connect a sending inbox in Settings to send emails from here automatically."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={view === "due" ? "default" : "outline"} onClick={() => setView("due")}>Due now ({due.length})</Button>
        <Button size="sm" variant={view === "upcoming" ? "default" : "outline"} onClick={() => setView("upcoming")}>Upcoming ({live.length - due.length})</Button>
        <Button size="sm" variant={view === "attention" ? "default" : "outline"} onClick={() => setView("attention")}>Paused or failed ({attention.length})</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : error ? <div className="flex items-center gap-3 text-sm text-destructive">{error}<Button size="sm" variant="outline" onClick={load}>Retry</Button></div>
        : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            {view === "due" ? "Nothing due. Nice work." : view === "attention" ? "Nothing paused or failed." : "No upcoming follow-ups. Add leads to a campaign to schedule some."}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => {
              const text = `${r.subject ? `Subject: ${r.subject}\n\n` : ""}${r.body}`;
              const canEmail = hasInbox && r.channel === "email" && !!r.leads?.contact_email;
              return (
                <li key={r.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to="/app/leads/$leadId" params={{ leadId: r.lead_id }} className="font-medium hover:underline">{r.leads?.company ?? "Lead"}</Link>
                      <p className="text-xs text-muted-foreground">
                        Step {r.step} · <span className="capitalize">{r.channel}</span> · due {new Date(r.due_at).toLocaleDateString()}
                        {r.campaigns ? ` · ${r.campaigns.name}` : ""}{r.leads?.contact_email ? ` · ${r.leads.contact_email}` : ""}
                        {r.status === "scheduled" && r.channel === "email" && r.campaigns?.auto_send ? " · sends automatically" : ""}
                      </p>
                      {r.status === "paused" && <p className="mt-1 text-xs text-muted-foreground">Paused because they replied. Resume if they go quiet.</p>}
                      {r.last_error && r.status !== "paused" && <p className="mt-1 text-xs text-destructive">{r.last_error}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.status === "sending" ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Sending…</span>
                      ) : r.status === "paused" ? (
                        <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => resume(r)}><Play className="size-4" /> Resume sequence</Button>
                      ) : canEmail ? (
                        <Button size="sm" disabled={busy === r.id} onClick={() => sendNow(r)}>
                          {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {r.status === "failed" ? "Retry" : "Send now"}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied"))}><Copy className="size-4" /> Copy</Button>
                      {r.status === "scheduled" && <Button size="sm" variant={canEmail ? "outline" : "default"} onClick={() => complete(r, "done")}><Check className="size-4" /> Done</Button>}
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
