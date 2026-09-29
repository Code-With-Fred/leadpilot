import { Link } from "@tanstack/react-router";
import { Loader2, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CsvImport } from "@/components/product/csv-import";
import { ScoreBar } from "@/components/product/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { notifyLeadsChanged, stageLabel, STAGES, type LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";

const empty = { company: "", contact_name: "", contact_email: "", role: "", industry: "", location: "", website: "", notes: "" };

export function LeadsPanel({ leads }: { leads: LeadRow[] }) {
  const [open, setOpen] = useState(leads.length === 0);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "score" | "follow">("recent");
  const [importing, setImporting] = useState(false);

  async function changeStage(id: string, s: string) {
    const { error } = await supabase.from("leads").update({ stage: s, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Couldn't update the stage."); else notifyLeadsChanged();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim()) { toast.error("Company name is required."); return; }
    setSaving(true);
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])) as typeof empty;
    const { error } = await supabase.from("leads").insert({ ...payload, company: form.company.trim() });
    setSaving(false);
    if (error) { toast.error("Couldn't save the lead. Please try again."); return; }
    toast.success(`${form.company} added`);
    setForm(empty);
    setOpen(false);
    notifyLeadsChanged();
  }

  const field = (k: keyof typeof empty, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`lead-${k}`}>{label}</Label>
      <Input id={`lead-${k}`} type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );

  const shown = leads
    .filter((l) => stage === "all" || l.stage === stage)
    .filter((l) => `${l.company} ${l.contact_name ?? ""} ${l.industry ?? ""} ${l.contact_email ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      sort === "score" ? (b.score ?? -1) - (a.score ?? -1)
      : sort === "follow" ? (a.next_follow_up_at ?? "9999").localeCompare(b.next_follow_up_at ?? "9999")
      : b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search leads" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select aria-label="Sort leads" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="recent">Newest first</option>
          <option value="score">Highest score</option>
          <option value="follow">Follow up soonest</option>
        </select>
        <Button variant="outline" className="ml-auto" onClick={() => { setImporting((o) => !o); setOpen(false); }}>
          <Upload className="size-4" /> Import CSV
        </Button>
        <Button variant="cta" onClick={() => { setOpen((o) => !o); setImporting(false); }}>
          <Plus className="size-4" /> Add lead
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by stage">
        {(["all", ...STAGES] as const).map((s) => {
          const n = s === "all" ? leads.length : leads.filter((l) => l.stage === s).length;
          return (
            <button key={s} role="tab" aria-selected={stage === s} onClick={() => setStage(s)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                stage === s ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground")}>
              {s === "all" ? "All" : stageLabel(s)} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {importing && <CsvImport onDone={() => setImporting(false)} />}

      {open && (
        <form onSubmit={add} className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
          {field("company", "Company *")}
          {field("contact_name", "Contact name")}
          {field("role", "Role")}
          {field("contact_email", "Email", "email")}
          {field("industry", "Industry")}
          {field("location", "Location")}
          {field("website", "Website")}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea id="lead-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything you know: how you found them, signals, context" />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}Save lead</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-4 py-2 font-medium">Next follow up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No leads match these filters.</td></tr>}
              {shown.map((l) => (
                <tr key={l.id} className="hover:bg-surface-muted/70">
                  <td className="px-4 py-3 font-medium">
                    <Link to="/app/leads/$leadId" params={{ leadId: l.id }} className="hover:underline">{l.company}</Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{l.contact_name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <select aria-label={`Stage for ${l.company}`} value={l.stage} onChange={(e) => changeStage(l.id, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                      {STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">{l.score != null ? <ScoreBar score={l.score} /> : <span className="text-xs text-muted-foreground">Not scored</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.next_follow_up_at ? new Date(l.next_follow_up_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
