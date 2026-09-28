import { Link } from "@tanstack/react-router";
import { Bell, Clock3, Phone, Search, TrendingUp } from "lucide-react";

import { PanelLabel } from "@/components/product/app-frame";
import { ScoreBar, StatusBadge } from "@/components/product/status-badge";
import { recommendedActions, stageLabel, STAGES, type LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";

const icons = { follow: Clock3, intent: TrendingUp, call: Phone, research: Search, cold: Bell };
const tones = {
  primary: "bg-primary-soft text-accent-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
};

export function CommandCenter({ leads, onGoToLeads }: { leads: LeadRow[]; onGoToLeads: () => void }) {
  const actions = recommendedActions(leads);
  const active = actions.filter((a) => a.leads.length);
  const todays = [...leads]
    .filter((l) => l.stage !== "won" && l.stage !== "lost")
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, 5);

  if (!leads.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
        <h2 className="text-lg font-semibold">Add your first lead to get started</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Once you add leads, this page tells you who to contact, who needs a follow up, and who is ready to buy.
        </p>
        <button onClick={onGoToLeads} className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">
          Add a lead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-7">
        {STAGES.map((s) => (
          <div key={s} className="bg-surface px-3 py-3 text-center">
            <div className="text-xl font-semibold">{leads.filter((l) => l.stage === s).length}</div>
            <div className="text-xs text-muted-foreground">{stageLabel(s)}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <PanelLabel>Recommended actions</PanelLabel>
        {active.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((a) => {
              const Icon = icons[a.key as keyof typeof icons];
              return (
                <li key={a.key} className="rounded-lg border border-border bg-surface p-4 shadow-card">
                  <div className="flex items-center gap-2">
                    <span className={cn("grid size-7 place-items-center rounded", tones[a.tone])}>
                      <Icon className="size-4" />
                    </span>
                    <p className="text-sm font-medium">
                      {a.leads.length} {a.leads.length === 1 ? a.label.replace(/^(leads|replies|opportunities) /, "").replace("need ", "needs ") : a.label}
                    </p>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {a.leads.slice(0, 3).map((l) => (
                      <li key={l.id}>
                        <Link to="/app/leads/$leadId" params={{ leadId: l.id }} className="text-muted-foreground hover:text-foreground hover:underline">
                          {l.company}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
            You're all caught up. Nothing urgent right now.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <PanelLabel>Best leads to work today</PanelLabel>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <tbody className="divide-y divide-border">
              {todays.map((l) => (
                <tr key={l.id} className="hover:bg-surface-muted/70">
                  <td className="px-4 py-3 font-medium">
                    <Link to="/app/leads/$leadId" params={{ leadId: l.id }} className="hover:underline">{l.company}</Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{l.contact_name ?? "—"}</td>
                  <td className="px-3 py-3"><StatusBadge status={stageLabel(l.stage)} /></td>
                  <td className="px-4 py-3">{l.score != null ? <ScoreBar score={l.score} /> : <span className="text-xs text-muted-foreground">Not scored</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
