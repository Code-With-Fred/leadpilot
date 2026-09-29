import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { guessMapping, LEAD_FIELDS, parseCsv, type LeadField } from "@/lib/csv";
import { notifyLeadsChanged, STAGES } from "@/lib/leads";

const LABEL: Record<LeadField, string> = {
  company: "Company *", contact_name: "Contact name", contact_email: "Email", role: "Role", industry: "Industry",
  location: "Location", website: "Website", notes: "Notes", stage: "Stage",
};
const MAX = 2000;

export function CsvImport({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<LeadField, number> | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(f: File | undefined) {
    if (!f) return;
    if (f.size > 5_000_000) { toast.error("That file is over 5 MB. Split it into smaller files."); return; }
    const all = parseCsv(await f.text());
    if (all.length < 2) { toast.error("The file needs a header row and at least one lead."); return; }
    const h = all[0] ?? [];
    const body = all.slice(1);
    setHeaders(h); setRows(body.slice(0, MAX)); setMap(guessMapping(h)); setFileName(f.name);
    if (body.length > MAX) toast.warning(`Only the first ${MAX} rows will be imported.`);
  }

  const cell = (r: string[], f: LeadField) => (map && map[f] >= 0 ? (r[map[f]] ?? "").trim() : "");
  const valid = rows.filter((r) => cell(r, "company"));

  async function run() {
    if (!map || map.company < 0) { toast.error("Choose which column holds the company name."); return; }
    setBusy(true);
    const records = valid.map((r) => {
      const st = cell(r, "stage").toLowerCase();
      const o: Record<string, string | null> = {};
      for (const f of LEAD_FIELDS) o[f] = cell(r, f).slice(0, 2000) || null;
      o["stage"] = (STAGES as readonly string[]).includes(st) ? st : "new";
      return o as { company: string };
    });
    let ok = 0;
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase.from("leads").insert(records.slice(i, i + 500));
      if (error) { toast.error(`Import stopped after ${ok} leads. Please check the file and try again.`); break; }
      ok += Math.min(500, records.length - i);
    }
    setBusy(false);
    if (ok) {
      const skipped = rows.length - valid.length;
      toast.success(`Imported ${ok} lead${ok === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} without a company` : ""}.`);
      notifyLeadsChanged(); onDone();
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="CSV file" onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4" />{fileName ? "Choose another file" : "Choose CSV file"}</Button>
        <span className="text-sm text-muted-foreground">{fileName ? `${fileName} · ${rows.length} rows` : "First row must be column names, e.g. Company, Name, Email, Title."}</span>
      </div>

      {map && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {LEAD_FIELDS.map((f) => (
              <label key={f} className="space-y-1 text-xs font-medium">{LABEL[f]}
                <select value={map[f]} onChange={(e) => setMap({ ...map, [f]: Number(e.target.value) })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal">
                  <option value={-1}>— Skip —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[36rem] text-left text-xs">
              <thead className="bg-surface-muted text-muted-foreground"><tr>{["company", "contact_name", "contact_email", "role", "stage"].map((f) => <th key={f} className="px-3 py-2 font-medium">{LABEL[f as LeadField].replace(" *", "")}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>{(["company", "contact_name", "contact_email", "role", "stage"] as const).map((f) => <td key={f} className="px-3 py-2">{cell(r, f) || <span className="text-muted-foreground">—</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={busy || !valid.length}>{busy && <Loader2 className="size-4 animate-spin" />}Import {valid.length} lead{valid.length === 1 ? "" : "s"}</Button>
            <Button variant="ghost" onClick={onDone}>Cancel</Button>
            {rows.length - valid.length > 0 && <span className="text-xs text-muted-foreground">{rows.length - valid.length} rows have no company and will be skipped.</span>}
          </div>
        </>
      )}
    </div>
  );
}
