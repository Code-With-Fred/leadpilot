import { useEffect, useState } from "react";

import { BusinessProfileForm } from "@/components/product/business-profile-form";
import { TeamPanel } from "@/components/product/team-panel";
import { Progress } from "@/components/ui/progress";
import { fetchMonthlyUsage, PLAN_LIMITS, planLabel, type Workspace } from "@/lib/workspace";

export function SettingsPanel({ workspace }: { workspace: Workspace }) {
  const [used, setUsed] = useState<number | null>(null);
  const limit = PLAN_LIMITS[workspace.plan] ?? 50;
  useEffect(() => {
    fetchMonthlyUsage(workspace.id).then(setUsed).catch(() => setUsed(null));
  }, [workspace.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr] [&>*]:min-w-0">
      <section className="rounded-xl border border-border bg-background p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Business profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">Every AI tool uses these details when researching leads and writing messages.</p>
        <BusinessProfileForm workspace={workspace} />
      </section>
      <div className="space-y-6">
      <section className="h-fit rounded-xl border border-border bg-background p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Plan and usage</h2>
        <p className="mt-1 text-sm text-muted-foreground">Current plan: <span className="font-medium text-foreground">{planLabel(workspace.plan)}</span></p>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm"><span>AI actions this month</span><span>{used ?? "—"} / {limit}</span></div>
          <Progress value={used == null ? 0 : Math.min(100, (used / limit) * 100)} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Online payments aren't connected yet, so plans can't be upgraded from here.</p>
      </section>
      <TeamPanel workspace={workspace} />
      </div>
    </div>
  );
}
