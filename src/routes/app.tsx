import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardPreview } from "@/components/product/dashboard-preview";
import { Logo } from "@/components/site/logo";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app")({
  head: () => meta("Workspace — LeadPilot", "Your LeadPilot sales workspace: leads, outreach and follow ups."),
  component: AppPage,
});

function AppPage() {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-background">
        <div className="container-page flex h-14 items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Button asChild variant="ghost" size="sm"><Link to="/login">Log out</Link></Button>
        </div>
      </header>
      <main className="container-page py-10">
        <h1 className="text-2xl font-semibold">Good to see you</h1>
        <p className="mt-1 text-muted-foreground">Here's what LeadPilot worked on today. (Demo data)</p>
        <div className="mt-8"><DashboardPreview /></div>
      </main>
    </div>
  );
}
