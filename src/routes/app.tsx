import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";

import { DashboardPreview } from "@/components/product/dashboard-preview";
import { OutreachDrafter } from "@/components/product/outreach-drafter";
import { OutreachLibrary } from "@/components/product/outreach-library";
import { SequenceBuilder } from "@/components/product/sequence-builder";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/site/logo";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => meta("Workspace — LeadPilot", "Your LeadPilot sales workspace: leads, outreach and follow ups."),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
    return { email: data.user.email ?? "", name: profile?.full_name ?? "" };
  },
  component: AppPage,
});

function AppPage() {
  const { email, name } = Route.useRouteContext();
  const navigate = useNavigate();

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
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">{email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
          </div>
        </div>
      </header>
      <main className="container-page space-y-10 py-8 sm:py-10">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Good to see you{name ? `, ${name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-muted-foreground">Draft outreach, plan follow-ups, and revisit what you've saved.</p>
        </div>
        <Tabs defaultValue="message">
          <TabsList>
            <TabsTrigger value="message">Single message</TabsTrigger>
            <TabsTrigger value="sequence">Follow-up sequence</TabsTrigger>
          </TabsList>
          <TabsContent value="message" className="mt-4"><OutreachDrafter /></TabsContent>
          <TabsContent value="sequence" className="mt-4"><SequenceBuilder /></TabsContent>
        </Tabs>
        <OutreachLibrary />
        <div>
          <h2 className="mb-4 text-lg font-semibold">Pipeline overview <span className="text-sm font-normal text-muted-foreground">(sample data)</span></h2>
          <DashboardPreview />
        </div>
      </main>
    </div>
  );
}
