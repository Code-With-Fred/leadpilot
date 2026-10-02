import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";

import { CommandCenter } from "@/components/product/command-center";
import { CopilotChat } from "@/components/product/copilot-chat";
import { LeadsPanel } from "@/components/product/leads-panel";
import { useLeads } from "@/lib/leads";
import { useState } from "react";
import { OutreachDrafter } from "@/components/product/outreach-drafter";
import { OutreachLibrary } from "@/components/product/outreach-library";
import { SequenceBuilder } from "@/components/product/sequence-builder";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/site/logo";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CampaignsPanel } from "@/components/product/campaigns-panel";
import { FollowUpsPanel } from "@/components/product/follow-ups-panel";
import { SettingsPanel } from "@/components/product/settings-panel";
import { fetchWorkspace } from "@/lib/workspace";
import { FindLeadsPanel } from "@/components/product/find-leads-panel";
import { GettingStarted } from "@/components/product/getting-started";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => meta("Workspace — LeadPilot", "Your LeadPilot sales workspace: leads, outreach and follow ups."),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const [{ data: profile }, workspace] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle(),
      fetchWorkspace(),
    ]);
    if (!workspace) throw new Error("We couldn't find your workspace. Please refresh the page.");
    if (!workspace.onboarded_at) throw redirect({ to: "/app/onboarding" });
    return { email: data.user.email ?? "", name: profile?.full_name ?? "", workspace };
  },
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{(error as Error).message}</p>,
  component: AppPage,
});

function AppPage() {
  const { email, name, workspace } = Route.useRouteContext();
  const navigate = useNavigate();
  const { leads, loading, error } = useLeads();
  const [tab, setTab] = useState("today");

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <Toaster />
      <header className="border-b border-border bg-background">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">{workspace.name} · {email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
          </div>
        </div>
      </header>
      <main className="container-page space-y-10 py-8 sm:py-10">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Good to see you{name ? `, ${name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-muted-foreground">Organize your pipeline, qualify leads and write outreach.</p>
        </div>
        {!loading && <GettingStarted leads={leads} onGo={setTab} />}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="find">Find leads</TabsTrigger>
            <TabsTrigger value="leads">Leads{leads.length ? ` (${leads.length})` : ""}</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="message">Write message</TabsTrigger>
            <TabsTrigger value="sequence">Follow-up sequence</TabsTrigger>
            <TabsTrigger value="library">Saved</TabsTrigger>
            <TabsTrigger value="copilot">Copilot</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <TabsContent value="today" className="mt-4">{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : <CommandCenter leads={leads} onGoToLeads={() => setTab("leads")} />}</TabsContent>
          <TabsContent value="leads" className="mt-4">{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : <LeadsPanel leads={leads} />}</TabsContent>
          <TabsContent value="find" className="mt-4"><FindLeadsPanel /></TabsContent>
          <TabsContent value="followups" className="mt-4"><FollowUpsPanel /></TabsContent>
          <TabsContent value="campaigns" className="mt-4"><CampaignsPanel leads={leads} /></TabsContent>
          <TabsContent value="settings" className="mt-4"><SettingsPanel workspace={workspace} /></TabsContent>
          <TabsContent value="message" className="mt-4"><OutreachDrafter /></TabsContent>
          <TabsContent value="sequence" className="mt-4"><SequenceBuilder /></TabsContent>
          <TabsContent value="library" className="mt-4"><OutreachLibrary /></TabsContent>
          <TabsContent value="copilot" className="mt-4"><CopilotChat /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
