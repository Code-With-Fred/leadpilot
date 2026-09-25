import { ArrowUpRight, Bell, Clock3, Sparkles, TrendingUp } from "lucide-react";

import { AppFrame, PanelLabel } from "@/components/product/app-frame";
import { ScoreBar, StatusBadge } from "@/components/product/status-badge";
import { CountUp } from "@/components/site/motion-primitives";
import { demoLeads, demoMetrics, demoRecommendations } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const recIcon = {
  primary: Clock3,
  success: TrendingUp,
  warning: Bell,
};

const recTone = {
  primary: "bg-primary-soft text-accent-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
};

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <AppFrame
      title="LeadPilot"
      subtitle="Sales overview"
      className={className}
      toolbar={
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[0.6875rem] text-muted-foreground sm:inline-flex">
          <span className="size-1.5 rounded-full bg-success motion-safe:animate-pulse" />
          Live
        </span>
      }
    >
      <div className="grid grid-cols-5 divide-x divide-border border-b border-border">
        {demoMetrics.map((m) => (
          <div key={m.label} className="px-2 py-3 text-center sm:px-3 sm:py-4">
            <div className="text-lg font-semibold sm:text-2xl">
              <CountUp value={m.value} />
            </div>
            <div className="mt-0.5 text-[0.625rem] text-muted-foreground sm:text-xs">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-b border-border bg-surface-muted/60 px-3 py-3 sm:px-4">
        <PanelLabel>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3" /> AI recommendations
          </span>
        </PanelLabel>
        <ul className="grid gap-2 sm:grid-cols-3">
          {demoRecommendations.map((r) => {
            const Icon = recIcon[r.tone];
            return (
              <li
                key={r.text}
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-xs shadow-card"
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded", recTone[r.tone])}>
                  <Icon className="size-3" />
                </span>
                <span className="leading-snug">{r.text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
          <thead>
            <tr className="text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium sm:px-4">
                Company
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Contact
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Lead score
              </th>
              <th scope="col" className="px-3 py-2 font-medium sm:px-4">
                Last activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {demoLeads.map((lead) => (
              <tr key={lead.company} className="transition-colors hover:bg-surface-muted/70">
                <td className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4">{lead.company}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                  {lead.contact}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={lead.status} pulse={lead.status === "Interested"} />
                </td>
                <td className="px-3 py-2.5">
                  <ScoreBar score={lead.score} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground sm:px-4">
                  {lead.activity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[0.6875rem] text-muted-foreground sm:px-4">
        <span>Showing 5 of 142 leads</span>
        <span className="inline-flex items-center gap-1">
          Open pipeline <ArrowUpRight className="size-3" />
        </span>
      </div>
    </AppFrame>
  );
}
