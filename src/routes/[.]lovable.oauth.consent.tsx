import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Details = { client?: { name?: string }; redirect_url?: string; redirect_to?: string } | null;
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: Details; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: Details; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: Details; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connect an app — LeadPilot" },
      { name: "description", content: "Approve an assistant to access your LeadPilot workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization request.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center bg-surface-muted px-4">
      <p className="max-w-md text-center text-sm text-muted-foreground">
        This connection request couldn't be loaded — it may have expired. Start the connection again from your assistant.
        <br />
        <span className="text-xs">{String((error as Error)?.message ?? error)}</span>
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "An app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect was returned. Please try connecting again."); }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface-muted px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-raised sm:p-8">
        <h1 className="text-2xl font-semibold">Connect {name} to LeadPilot</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {name} will be able to view and add leads, change pipeline stages, and see follow-ups in your workspace — acting as you.
        </p>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">Approve</Button>
          <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">Deny</Button>
        </div>
      </div>
    </main>
  );
}
