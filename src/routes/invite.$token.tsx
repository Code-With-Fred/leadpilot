import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/site/logo";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resetWorkspaceCache } from "@/lib/workspace";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => meta("Join a workspace — LeadPilot", "Accept your invitation to a LeadPilot sales workspace."),
  component: InvitePage,
});

const REASONS: Record<string, string> = {
  not_found: "This invite link isn't valid. Ask for a new one.",
  used: "This invite has already been used.",
  expired: "This invite has expired. Ask the person who invited you for a new link.",
  wrong_email: "This invite was sent to a different email. Log in with the invited email address.",
};

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "signed_out" | "ready" | "joining" | "error">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setState(data.user ? "ready" : "signed_out"));
  }, []);

  async function accept() {
    setState("joining");
    const { data, error } = await supabase.rpc("accept_workspace_invite", { _token: token });
    const r = data as { ok: boolean; reason?: string } | null;
    if (error || !r?.ok) {
      setError(REASONS[r?.reason ?? ""] ?? "Couldn't accept the invite. Please try again.");
      setState("error");
      return;
    }
    resetWorkspaceCache();
    navigate({ to: "/app" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface-muted px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 text-center shadow-raised sm:p-8">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-xl font-semibold">You've been invited to a LeadPilot workspace</h1>
        {state === "checking" && <Loader2 className="mx-auto mt-6 size-5 animate-spin" />}
        {state === "signed_out" && (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Log in or create an account with the email the invite was sent to, then open this link again.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button asChild variant="outline"><Link to="/login">Log in</Link></Button>
              <Button asChild variant="cta"><Link to="/signup">Create account</Link></Button>
            </div>
          </>
        )}
        {(state === "ready" || state === "joining") && (
          <Button className="mt-6" variant="cta" onClick={accept} disabled={state === "joining"}>
            {state === "joining" && <Loader2 className="size-4 animate-spin" />} Join workspace
          </Button>
        )}
        {state === "error" && (
          <>
            <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => setState("ready")}>Try again</Button>
          </>
        )}
      </div>
    </div>
  );
}
