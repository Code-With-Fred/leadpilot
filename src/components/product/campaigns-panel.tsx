import { currentWorkspaceId } from "@/lib/workspace";
import { Loader2, Plus, Send, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { LeadRow } from "@/lib/leads";
import type { SequenceStep } from "@/lib/outreach.functions";
import type { SavedItem } from "@/lib/saved-outreach";

type Campaign = Tables<"campaigns">;
type Inbox = { id: string; email: string; status: string };
const DAY = 864e5;
const blankStep = (day: number): SequenceStep => ({ day, channel: "email", subject: "", body: "" });

export const FOLLOWUPS_EVENT = "leadpilot:followups-changed";

export function CampaignsPanel({ leads }: { leads: LeadRow[] }) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);

  const load = useCallback(async () => {
    setError("");
    const ws = (await currentWorkspaceId()) ?? "";
    const [c, cl, ib] = await Promise.all([
      supabase.from("campaigns").select("*").eq("workspace_id", ws).order("created_at", { ascending: false }),
      supabase.from("campaign_leads").select("campaign_id").eq("workspace_id", ws).neq("status", "removed"),
      supabase.from("email_accounts").select("id, email, status").eq("workspace_id", ws).order("created_at"),
    ]);
    setInboxes(ib.data ?? []);
    if (c.error || cl.error) setError("Couldn't load campaigns.");
    else {
      setItems(c.data);
      const n: Record<string, number> = {};
      cl.data.forEach((r) => (n[r.campaign_id] = (n[r.campaign_id] ?? 0) + 1));
      setCounts(n);
    }
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);

  async function remove(c: Campaign) {
    if (!confirm(`Delete "${c.name}"? Its scheduled follow-ups will be removed too.`)) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (error) { toast.error("Couldn't delete the campaign."); return; }
    toast.success("Campaign deleted");
    window.dispatchEvent(new Event(FOLLOWUPS_EVENT));
    void load();
  }

  async function setAutoSend(c: Campaign, auto_send: boolean) {
    if (auto_send && !inboxes.some((i) => i.status === "active")) { toast.error("Connect a sending inbox in Settings first."); return; }
    const { error } = await supabase.from("campaigns").update({ auto_send, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) { toast.error("Couldn't update the campaign."); return; }
    toast.success(auto_send ? "Email steps will now send automatically" : "Auto-send is off. Due emails wait in Follow-ups.");
    void load();
  }

  async function setStatus(c: Campaign, status: Campaign["status"]) {
    const { error } = await supabase.from("campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) { toast.error("Couldn't update the campaign."); return; }
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <p className="text-sm text-muted-foreground">Group leads under one follow-up plan. With auto-send on, email steps go out on schedule and stop when a lead replies.</p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New campaign</Button>}
      </div>
      {creating && <CampaignEditor inboxes={inboxes} onDone={() => { setCreating(false); void load(); }} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <div className="flex items-center gap-3 text-sm text-destructive">{error}<Button size="sm" variant="outline" onClick={load}>Retry</Button></div>
      ) : items.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
          No campaigns yet. Create one, add leads, and LeadPilot schedules every follow-up for you.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => {
            const steps = (c.steps as SequenceStep[]) ?? [];
            return (
              <li key={c.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {steps.length} steps · {counts[c.id] ?? 0} leads · <span className="capitalize">{c.status}</span>
                      {" · "}{c.auto_send ? <span className="font-medium text-primary">Auto-send on</span> : "Manual sending"}
                      {c.goal ? ` · Goal: ${c.goal}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setOpen(open === c.id ? null : c.id)}><Users className="size-4" /> Add leads</Button>
                    <Button size="sm" variant="outline" onClick={() => setAutoSend(c, !c.auto_send)}><Send className="size-4" /> {c.auto_send ? "Turn off auto-send" : "Turn on auto-send"}</Button>
                    {c.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus(c, "paused")}>Pause</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus(c, "active")}>{c.status === "draft" ? "Activate" : "Resume"}</Button>
                    )}
                    <Button size="sm" variant="ghost" aria-label="Delete campaign" onClick={() => remove(c)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                {open === c.id && <AddLeads campaign={c} leads={leads} onDone={() => { setOpen(null); void load(); }} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CampaignEditor({ inboxes, onDone }: { inboxes: Inbox[]; onDone: () => void }) {
  const active = inboxes.filter((i) => i.status === "active");
  const [autoSend, setAutoSend] = useState(active.length > 0);
  const [inboxId, setInboxId] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([blankStep(0), blankStep(3), blankStep(7)]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("saved_outreach").select("*").eq("kind", "sequence").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setSaved((data ?? []) as unknown as SavedItem[]));
  }, []);

  const upd = (i: number, p: Partial<SequenceStep>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...p } : s)));

  async function save() {
    if (!name.trim()) return setError("Give the campaign a name.");
    const clean = steps.filter((s) => s.body.trim()).map((s) => ({ ...s, day: Math.max(0, Math.min(365, Math.round(s.day))) })).sort((a, b) => a.day - b.day);
    if (!clean.length) return setError("Write at least one step message.");
    setError("");
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({
      name: name.trim().slice(0, 160), goal: goal.trim().slice(0, 300) || null, steps: clean as never, status: "active",
      auto_send: autoSend && active.length > 0, email_account_id: inboxId || null,
    });
    setSaving(false);
    if (error) return setError("Couldn't save the campaign. Please try again.");
    toast.success("Campaign created");
    onDone();
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="c-name">Campaign name</Label><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} /></div>
        <div className="space-y-1.5"><Label htmlFor="c-goal">Goal</Label><Input id="c-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Book a 15 minute call" maxLength={300} /></div>
      </div>
      {saved.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="c-from">Start from a saved sequence (optional)</Label>
          <select id="c-from" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue=""
            onChange={(e) => {
              const s = saved.find((x) => x.id === e.target.value);
              if (s && s.content.type === "sequence") { setSteps(s.content.steps); if (!goal) setGoal(s.content.goal); if (!name) setName(s.title); }
            }}>
            <option value="">Choose…</option>
            {saved.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-24 space-y-1"><Label className="text-xs">Day</Label><Input type="number" min={0} max={365} value={s.day} onChange={(e) => upd(i, { day: Number(e.target.value) })} /></div>
              <div className="w-36 space-y-1">
                <Label className="text-xs">Channel</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={s.channel} onChange={(e) => upd(i, { channel: e.target.value })}>
                  <option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="call">Phone call</option>
                </select>
              </div>
              <div className="min-w-40 flex-1 space-y-1"><Label className="text-xs">Subject</Label><Input value={s.subject} onChange={(e) => upd(i, { subject: e.target.value })} maxLength={200} /></div>
              <Button type="button" size="icon" variant="ghost" aria-label="Remove step" onClick={() => setSteps(steps.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
            </div>
            <Textarea rows={3} value={s.body} onChange={(e) => upd(i, { body: e.target.value })} placeholder={i === 0 ? "Hi {{first_name}}, …" : "Message or call script. Leave the subject empty to reply in the same thread."} maxLength={4000} />
          </div>
        ))}
        {steps.length < 10 && <Button type="button" size="sm" variant="outline" onClick={() => setSteps([...steps, blankStep((steps.at(-1)?.day ?? 0) + 3)])}><Plus className="size-4" /> Add step</Button>}
      </div>
      <p className="text-xs text-muted-foreground">
        Personalize with {"{{first_name}}"}, {"{{company}}"} and {"{{booking_link}}"}. Follow-up emails reply in the first email's thread.
      </p>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={autoSend && active.length > 0} disabled={!active.length} onChange={(e) => setAutoSend(e.target.checked)} />
          <span>
            <span className="font-medium">Send email steps automatically</span>
            <span className="block text-xs text-muted-foreground">
              {active.length
                ? "Sent from your connected inbox within its daily limit. A lead's sequence pauses as soon as they reply."
                : "Connect a sending inbox in Settings to turn this on. Until then, due emails wait in Follow-ups."}
            </span>
          </span>
        </label>
        {active.length > 1 && (
          <div className="space-y-1">
            <Label htmlFor="c-inbox" className="text-xs">Send from</Label>
            <select id="c-inbox" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={inboxId} onChange={(e) => setInboxId(e.target.value)}>
              <option value="">Rotate across all inboxes</option>
              {active.map((i) => <option key={i.id} value={i.id}>{i.email}</option>)}
            </select>
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save campaign</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function AddLeads({ campaign, leads, onDone }: { campaign: Campaign; leads: LeadRow[]; onDone: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost" && !l.unsubscribed_at && l.company.toLowerCase().includes(q.toLowerCase()));

  async function add() {
    if (!picked.size) return;
    setBusy(true);
    const ids = [...picked];
    const steps = (campaign.steps as SequenceStep[]) ?? [];
    const now = Date.now();
    const { data: existing } = await supabase.from("campaign_leads").select("lead_id").eq("campaign_id", campaign.id).in("lead_id", ids);
    const skip = new Set((existing ?? []).map((r) => r.lead_id));
    const fresh = ids.filter((id) => !skip.has(id));
    if (fresh.length) {
      const a = await supabase.from("campaign_leads").insert(fresh.map((lead_id) => ({ campaign_id: campaign.id, lead_id, workspace_id: campaign.workspace_id })));
      const b = a.error ? a : await supabase.from("follow_ups").insert(
        fresh.flatMap((lead_id) => steps.map((s, i) => ({
          workspace_id: campaign.workspace_id, lead_id, campaign_id: campaign.id, step: i + 1,
          channel: s.channel, subject: s.subject || null, body: s.body, due_at: new Date(now + s.day * DAY).toISOString(),
        }))),
      );
      if (a.error || b.error) { setBusy(false); toast.error("Couldn't add those leads. Please try again."); return; }
      await supabase.from("leads").update({ next_follow_up_at: new Date(now + (steps[0]?.day ?? 0) * DAY).toISOString() }).in("id", fresh).is("next_follow_up_at", null);
    }
    setBusy(false);
    toast.success(`${fresh.length} added${skip.size ? `, ${skip.size} already in this campaign` : ""}`);
    window.dispatchEvent(new Event(FOLLOWUPS_EVENT));
    onDone();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      {leads.length === 0 ? <p className="text-sm text-muted-foreground">Add leads first in the Leads tab.</p> : (
        <>
          <Input placeholder="Search companies" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="max-h-64 space-y-1 overflow-auto">
            {open.map((l) => (
              <li key={l.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted">
                  <input type="checkbox" checked={picked.has(l.id)} onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(l.id); else n.delete(l.id); setPicked(n); }} />
                  <span className="truncate">{l.company}{l.contact_name ? ` · ${l.contact_name}` : ""}{!l.contact_email ? " · no email" : ""}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={add} disabled={busy || !picked.size}>{busy && <Loader2 className="size-4 animate-spin" />} Add {picked.size || ""} to campaign</Button>
        </>
      )}
    </div>
  );
}
