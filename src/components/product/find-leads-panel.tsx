import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, ExternalLink, Loader2, MapPin, Phone, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ScoreBar } from "@/components/product/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { findProspects, type Prospect } from "@/lib/discovery.functions";
import { notifyLeadsChanged } from "@/lib/leads";

const IDEAS = ["Restaurants", "Hotels", "Real estate agencies", "Dental clinics", "Law firms", "Schools", "Gyms", "Logistics companies"];

export function FindLeadsPanel() {
  const find = useServerFn(findProspects);
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [noSite, setNoSite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Prospect[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function search(e?: FormEvent) {
    e?.preventDefault();
    if (type.trim().length < 2 || location.trim().length < 2) { setError("Enter a type of business and a city or country."); return; }
    setError("");
    setBusy(true);
    try {
      const r = await find({ data: { businessType: type, location, onlyNoWebsite: noSite } });
      if (!r.ok) { setError(r.error); return; }
      setResults(r.prospects);
    } catch {
      setError("Search failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save(p: Prospect) {
    setSaving(p.placeId);
    const notes = [`Found on Google Maps: ${p.address}`, ...p.reasons.map((r) => `• ${r}`), p.opener && `Opener idea: ${p.opener}`].filter(Boolean).join("\n");
    const { error } = await supabase.from("leads").insert({
      company: p.name, industry: p.category, location: p.address, website: p.website, phone: p.phone,
      notes, score: p.fit, place_id: p.placeId, source: "google_maps",
    });
    setSaving(null);
    if (error && !error.message.includes("duplicate")) { toast.error("Couldn't save this lead."); return; }
    setResults((rs) => rs?.map((x) => (x.placeId === p.placeId ? { ...x, alreadySaved: true } : x)) ?? null);
    toast.success(`${p.name} saved to your leads`);
    notifyLeadsChanged();
  }

  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Find businesses that need you</h2>
        <p className="text-sm text-muted-foreground">Search real businesses on Google Maps anywhere in the world. LeadPilot checks each one against what you sell and ranks the best fits.</p>
      </div>
      <form onSubmit={search} className="grid gap-4 rounded-xl border border-border bg-background p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5">
        <div className="space-y-1.5"><Label htmlFor="fl-type">Type of business</Label><Input id="fl-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Restaurants" maxLength={120} /></div>
        <div className="space-y-1.5"><Label htmlFor="fl-loc">Where</Label><Input id="fl-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lagos, Nigeria or London" maxLength={120} /></div>
        <Button type="submit" variant="cta" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Find leads</Button>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
          {IDEAS.map((i) => <button key={i} type="button" onClick={() => setType(i)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{i}</button>)}
          <label className="ml-auto flex items-center gap-2 text-sm"><Switch checked={noSite} onCheckedChange={setNoSite} /> Only businesses with no website</label>
        </div>
      </form>
      {error && <div role="alert" className="flex items-center gap-3 text-sm text-destructive">{error}{results !== null || busy ? null : <Button size="sm" variant="outline" onClick={() => search()}>Retry</Button>}</div>}
      {busy && <p className="text-sm text-muted-foreground">Searching and checking each business… this takes about 20 seconds.</p>}
      {!busy && results?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">No businesses found. Try a broader type or a bigger city.</div>
      )}
      {!busy && results && results.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
          {results.map((p) => (
            <li key={p.placeId} className="flex flex-col rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.category ?? "Business"} · {p.reviews} reviews{p.rating ? ` · ${p.rating}★` : ""}</p>
                </div>
                <div className="w-28 shrink-0"><ScoreBar score={p.fit} /></div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="flex gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" />{p.address}</p>
                {p.phone && <p className="flex gap-1.5"><Phone className="mt-0.5 size-3.5 shrink-0" />{p.phone}</p>}
                <p className="flex gap-1.5"><ExternalLink className="mt-0.5 size-3.5 shrink-0" />{p.website ? <a href={p.website} target="_blank" rel="noreferrer" className="truncate hover:underline">{p.website}</a> : <span className="font-medium text-warning">No website</span>}</p>
              </div>
              <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm">{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              {p.opener && <p className="mt-3 rounded-md bg-surface-muted p-2 text-sm">"{p.opener}"</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button size="sm" disabled={p.alreadySaved || saving === p.placeId} onClick={() => save(p)}>
                  {p.alreadySaved ? <><Check className="size-4" /> Saved</> : <>{saving === p.placeId ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Save lead</>}
                </Button>
                {p.opener && <Button size="sm" variant="outline" onClick={() => copy(p.opener)}><Copy className="size-4" /> Copy opener</Button>}
                {p.phone && <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${p.phone.replace(/\D/g, "")}?text=${encodeURIComponent(p.opener)}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>}
                {p.mapsUrl && <Button size="sm" variant="ghost" asChild><a href={p.mapsUrl} target="_blank" rel="noreferrer">Maps</a></Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
