import { Link } from "@tanstack/react-router";
import { Loader2, MessageCircle, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { notifyLeadsChanged, type LeadRow } from "@/lib/leads";
import { currentWorkspaceId } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type Msg = Tables<"lead_messages">;
const CHANNELS = ["whatsapp", "email", "linkedin", "call", "other"] as const;
const CH_LABEL: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", linkedin: "LinkedIn", call: "Call", other: "Other" };

const waNumber = (p: string | null) => (p ?? "").replace(/\D/g, "");

export function InboxPanel({ leads }: { leads: LeadRow[] }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const ws = await currentWorkspaceId();
    const { data, error } = await supabase.from("lead_messages").select("*").eq("workspace_id", ws ?? "").order("created_at", { ascending: true }).limit(2000);
    if (error) setError("Couldn't load your conversations.");
    else { setError(null); setMsgs(data ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const byLead = useMemo(() => {
    const m = new Map<string, Msg[]>();
    for (const x of msgs) m.set(x.lead_id, [...(m.get(x.lead_id) ?? []), x]);
    return m;
  }, [msgs]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads
      .filter((l) => !s || l.company.toLowerCase().includes(s) || (l.contact_name ?? "").toLowerCase().includes(s))
      .map((l) => ({ lead: l, last: byLead.get(l.id)?.at(-1) }))
      .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "") || b.lead.created_at.localeCompare(a.lead.created_at));
  }, [leads, byLead, q]);

  const current = leads.find((l) => l.id === selected) ?? list[0]?.lead ?? null;

  if (!leads.length) return <p className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">No leads yet. Use Find leads to save a few, then track each conversation here.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] [&>*]:min-w-0">
      <aside className="rounded-xl border border-border bg-background p-3">
        <div className="mb-2 flex gap-2">
          <Input placeholder="Search leads" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" />
          <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
        </div>
        {error && <p className="p-2 text-sm text-destructive">{error} <button className="underline" onClick={load}>Retry</button></p>}
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {list.map(({ lead, last }) => (
            <li key={lead.id}>
              <button
                onClick={() => setSelected(lead.id)}
                className={cn("w-full rounded-lg px-3 py-2 text-left hover:bg-muted", current?.id === lead.id && "bg-muted")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{lead.company}</span>
                  {last?.direction === "in" && <span className="shrink-0 rounded bg-success-soft px-1.5 text-xs text-success">Replied</span>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{last ? `${last.direction === "out" ? "You: " : ""}${last.body}` : "No messages yet"}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {current ? <Thread key={current.id} lead={current} messages={byLead.get(current.id) ?? []} loading={loading} onChange={load} /> : null}
    </div>
  );
}

function Thread({ lead, messages, loading, onChange }: { lead: LeadRow; messages: Msg[]; loading: boolean; onChange: () => void }) {
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<string>(lead.phone ? "whatsapp" : lead.contact_email ? "email" : "other");
  const [saving, setSaving] = useState<"out" | "in" | null>(null);
  const phone = waNumber(lead.phone);

  async function log(direction: "out" | "in", openWhatsApp = false) {
    const text = body.trim();
    if (!text) return toast.error("Write the message first.");
    if (openWhatsApp) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    setSaving(direction);
    const { error } = await supabase.from("lead_messages").insert({ lead_id: lead.id, workspace_id: lead.workspace_id!, direction, channel, body: text });
    if (error) { setSaving(null); return toast.error("Couldn't save the message. Try again."); }
    const patch: Partial<LeadRow> = {};
    if (direction === "out") { patch.last_contacted_at = new Date().toISOString(); if (lead.stage === "new") patch.stage = "contacted"; }
    else if (lead.stage === "new" || lead.stage === "contacted") patch.stage = "warm";
    if (Object.keys(patch).length) { await supabase.from("leads").update(patch).eq("id", lead.id); notifyLeadsChanged(); }
    setSaving(null);
    setBody("");
    toast.success(direction === "out" ? "Message logged" : "Reply saved");
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("lead_messages").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete it.");
    onChange();
  }

  return (
    <section className="flex flex-col rounded-xl border border-border bg-background">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{lead.company}</h2>
          <p className="truncate text-xs text-muted-foreground">{[lead.contact_name, lead.phone, lead.contact_email].filter(Boolean).join(" · ") || "No contact details saved"}</p>
        </div>
        <Button variant="outline" size="sm" asChild><Link to="/app/leads/$leadId" params={{ leadId: lead.id }}>Open lead</Link></Button>
      </header>
      <div className="max-h-[50vh] min-h-48 flex-1 space-y-3 overflow-y-auto p-4">
        {loading && !messages.length ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!loading && !messages.length ? <p className="text-sm text-muted-foreground">No messages yet. Write your first one below — on WhatsApp it opens with the text ready to send.</p> : null}
        {messages.map((m) => (
          <div key={m.id} className={cn("group flex", m.direction === "out" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.direction === "out" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 flex items-center gap-2 text-[11px] opacity-75">
                {CH_LABEL[m.channel]} · {new Date(m.created_at).toLocaleString()}
                <button onClick={() => remove(m.id)} aria-label="Delete message" className="opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 className="size-3" /></button>
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-border p-4">
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button key={c} onClick={() => setChannel(c)} className={cn("rounded-full border px-3 py-1 text-xs", channel === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{CH_LABEL[c]}</button>
          ))}
        </div>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={5000} placeholder="Write your message, or paste their reply" aria-label="Message" />
        <div className="flex flex-wrap gap-2">
          {channel === "whatsapp" && phone ? (
            <Button onClick={() => log("out", true)} disabled={!!saving}><MessageCircle className="size-4" /> Send on WhatsApp</Button>
          ) : (
            <Button onClick={() => log("out")} disabled={!!saving}>{saving === "out" && <Loader2 className="size-4 animate-spin" />} I sent this</Button>
          )}
          <Button variant="outline" onClick={() => log("in")} disabled={!!saving}>{saving === "in" && <Loader2 className="size-4 animate-spin" />} Save as their reply</Button>
        </div>
        {channel === "whatsapp" && !phone ? <p className="text-xs text-muted-foreground">This lead has no phone number saved, so WhatsApp can't open directly.</p> : null}
      </div>
    </section>
  );
}
