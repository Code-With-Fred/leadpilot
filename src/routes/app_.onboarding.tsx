import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { BusinessProfileForm } from "@/components/product/business-profile-form";
import { Logo } from "@/components/site/logo";
import { meta } from "@/components/site/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { fetchWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/app_/onboarding")({
  ssr: false,
  head: () => meta("Set up your workspace — LeadPilot", "Tell LeadPilot about your business so outreach fits what you sell."),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const workspace = await fetchWorkspace();
    if (!workspace) throw new Error("No workspace found for this account.");
    return { workspace };
  },
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{(error as Error).message} Please refresh the page.</p>,
  component: Onboarding,
});

function Onboarding() {
  const { workspace } = Route.useRouteContext();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface-muted px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-background p-6 shadow-raised sm:p-8">
          <p className="eyebrow">Step 1 of 1</p>
          <h1 className="mt-2 text-2xl font-semibold">Tell us about your business</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            LeadPilot uses this to research leads, score them and write messages that match what you sell. You can change it later in Settings.
          </p>
          <div className="mt-6">
            <BusinessProfileForm workspace={workspace} onboarding onSaved={() => navigate({ to: "/app" })} />
          </div>
        </div>
      </div>
    </div>
  );
}
