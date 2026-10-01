import { CheckCircle2, Circle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRow } from "@/lib/leads";

const KEY = "leadpilot:getting-started-hidden";

/** Checklist computed from real workspace data; guides a new user through the core loop. */
export function GettingStarted({ leads, onGo }: { leads: LeadRow[]; onGo: (tab: string) => void }) {
  const [hasCampaign, setHasCampaign] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(localStorage.getItem(KEY) === "1");
    supabase.from("campaign_leads").select("lead_id", { head: true, count: "exact" }).then(({ count }) => setHasCampaign((count ?? 0) > 0));
  }, [leads.length]);

  const steps = [
    { done: true, label: "Tell LeadPilot about your business", tab: "settings" },
    { done: leads.length > 0, label: "Add or import your first leads", tab: "leads" },
    { done: leads.some((l) => l.research), label: "Research a lead to get a score and sales angle", tab: "leads" },
    { done: !!hasCampaign, label: "Put leads in a campaign so follow-ups get scheduled", tab: "campaigns" },
    { done: leads.some((l) => l.last_contacted_at), label: "Send your first message and mark it done", tab: "followups" },
  ];
  const left = steps.filter((s) => !s.done).length;
  if (hidden || hasCampaign === null || left === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-background p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Get set up</h2>
          <p className="text-sm text-muted-foreground">{steps.length - left} of {steps.length} done. Each step takes a minute or two.</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Hide checklist" onClick={() => { localStorage.setItem(KEY, "1"); setHidden(true); }}><X className="size-4" /></Button>
      </div>
      <ol className="mt-3 space-y-1">
        {steps.map((s) => (
          <li key={s.label}>
            <button disabled={s.done} onClick={() => onGo(s.tab)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm enabled:hover:bg-surface-muted disabled:text-muted-foreground">
              {s.done ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
              <span className={s.done ? "line-through" : ""}>{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
