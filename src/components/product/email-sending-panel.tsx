import { AlertTriangle, CheckCircle2, Loader2, Mail, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getEmailSetup, startEmailConnect, type EmailInbox, type EmailSetup } from "@/lib/email.functions";
import type { Workspace } from "@/lib/workspace";

export const EMAIL_SETUP_EVENT = "leadpilot:email-setup-changed";

const PROVIDER_LABEL = { google: "Gmail / Google Workspace", microsoft: "Outlook / Microsoft 365" } as const;

export function EmailSendingPanel({ workspace }: { workspace: Workspace }) {
  const [setup, setSetup] = useState<EmailSetup | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState<"google" | "microsoft" | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setSetup(await getEmailSetup());
    } catch {
      setError("Couldn't load your sending inboxes.");
    }
  }, []);
  useEffect(() => void load(), [load]);

  async function connect(provider: "google" | "microsoft") {
    setConnecting(provider);
    try {
      const r = await startEmailConnect({ data: { provider } });
      if (!r.ok) {
        toast.error(r.error);
        setConnecting(null);
        return;
      }
      window.location.href = r.url;
    } catch {
      toast.error("Couldn't start the connection. Please try again.");
      setConnecting(null);
    }
  }

  const inboxes = setup?.inboxes ?? [];
  const full = setup ? inboxes.length >= setup.inboxLimit : true;
  const anyProvider = setup && (setup.providers.google || setup.providers.microsoft);

  return (
    <section className="h-fit rounded-xl border border-border bg-background p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Sending inboxes</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect the mailbox you sell from. LeadPilot sends from it, threads every follow-up, and pauses a sequence the moment someone replies.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-destructive">{error} <button className="underline" onClick={load}>Retry</button></p>
      ) : !setup ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 space-y-4">
          {inboxes.length > 0 && (
            <ul className="space-y-2">
              {inboxes.map((i) => <InboxRow key={i.id} inbox={i} onChange={load} />)}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {inboxes.length} of {setup.inboxLimit} inbox{setup.inboxLimit === 1 ? "" : "es"} on your plan
          </p>
          {!anyProvider ? (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Inbox connections aren't switched on for this app yet. The app owner needs to add the Google and/or Microsoft OAuth keys.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(["google", "microsoft"] as const).filter((p) => setup.providers[p]).map((p) => (
                <Button key={p} variant="outline" size="sm" disabled={full || !!connecting} onClick={() => connect(p)}>
                  {connecting === p ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Connect {PROVIDER_LABEL[p]}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <BookingLink workspace={workspace} />
    </section>
  );
}

function InboxRow({ inbox, onChange }: { inbox: EmailInbox; onChange: () => void }) {
  const [limit, setLimit] = useState(String(inbox.daily_limit));
  const [busy, setBusy] = useState(false);

  async function saveLimit() {
    const n = Math.round(Number(limit));
    if (!Number.isFinite(n) || n < 1 || n > 200) {
      toast.error("Daily limit must be between 1 and 200.");
      setLimit(String(inbox.daily_limit));
      return;
    }
    if (n === inbox.daily_limit) return;
    const { error } = await supabase.from("email_accounts").update({ daily_limit: n, updated_at: new Date().toISOString() }).eq("id", inbox.id);
    if (error) toast.error("Couldn't save the limit.");
    else { toast.success("Daily limit saved"); onChange(); }
  }

  async function remove() {
    if (!confirm(`Disconnect ${inbox.email}? Scheduled emails will go out from your other inboxes, or wait until you connect one.`)) return;
    setBusy(true);
    const { error } = await supabase.from("email_accounts").delete().eq("id", inbox.id);
    setBusy(false);
    if (error) { toast.error("Only workspace admins or the person who connected it can remove this inbox."); return; }
    toast.success("Inbox disconnected");
    window.dispatchEvent(new Event(EMAIL_SETUP_EVENT));
    onChange();
  }

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {inbox.status === "active" ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <AlertTriangle className="size-4 shrink-0 text-destructive" />}
            <span className="truncate">{inbox.email}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {PROVIDER_LABEL[inbox.provider]} · {inbox.sent_today} sent today
            {inbox.last_synced_at ? ` · replies checked ${new Date(inbox.last_synced_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
          </p>
          {inbox.status !== "active" && <p className="mt-1 text-xs text-destructive">{inbox.last_error ?? "Needs to be reconnected."} Connect it again to fix this.</p>}
        </div>
        <Button size="icon" variant="ghost" aria-label={`Disconnect ${inbox.email}`} onClick={remove} disabled={busy}><Trash2 className="size-4" /></Button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Label htmlFor={`lim-${inbox.id}`} className="text-xs text-muted-foreground">Max emails per day</Label>
        <Input id={`lim-${inbox.id}`} type="number" min={1} max={200} className="h-8 w-20" value={limit} onChange={(e) => setLimit(e.target.value)} onBlur={saveLimit} />
      </div>
    </li>
  );
}

function BookingLink({ workspace }: { workspace: Workspace }) {
  const [url, setUrl] = useState(workspace.booking_url ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const v = url.trim();
    if (v && !/^https:\/\/\S+\.\S+/.test(v)) { toast.error("Booking link should start with https://"); return; }
    setSaving(true);
    const { error } = await supabase.from("workspaces").update({ booking_url: v || null, updated_at: new Date().toISOString() }).eq("id", workspace.id);
    setSaving(false);
    if (error) toast.error("Only workspace admins can change the booking link.");
    else toast.success("Booking link saved");
  }

  return (
    <div className="mt-6 space-y-1.5 border-t border-border pt-4">
      <Label htmlFor="booking-url">Booking link</Label>
      <p className="text-xs text-muted-foreground">Your Calendly, Cal.com or Google booking page. Write {"{{booking_link}}"} in any message and it's filled in.</p>
      <div className="flex gap-2">
        <Input id="booking-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://cal.com/you/15min" maxLength={300} />
        <Button variant="outline" onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save</Button>
      </div>
    </div>
  );
}
