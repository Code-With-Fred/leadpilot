import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/site/logo";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { unsubscribeByToken } from "@/lib/unsubscribe.functions";

export const Route = createFileRoute("/unsubscribe/$token")({
  head: () => {
    const m = meta("Unsubscribe — LeadPilot", "Stop receiving emails from this sender.");
    return { ...m, meta: [...m.meta, { name: "robots", content: "noindex" }] };
  },
  server: {
    handlers: {
      // RFC 8058 one-click unsubscribe from the mail client's own button.
      POST: async ({ params }) => {
        const { unsubscribeLead } = await import("@/lib/email/unsubscribe.server");
        await unsubscribeLead(params.token);
        return new Response("Unsubscribed", { status: 200 });
      },
    },
  },
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function confirm() {
    setState("busy");
    try {
      const r = await unsubscribeByToken({ data: { token } });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface-muted px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 text-center shadow-raised sm:p-8">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {state === "done" ? (
          <>
            <h1 className="text-xl font-semibold">You're unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">You won't receive any more emails from this sender.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Unsubscribe from these emails?</h1>
            <p className="mt-2 text-sm text-muted-foreground">You'll stop receiving follow-ups from this sender.</p>
            {state === "error" && <p role="alert" className="mt-3 text-sm text-destructive">This link isn't valid anymore.</p>}
            <Button className="mt-6 w-full" onClick={confirm} disabled={state === "busy"}>
              {state === "busy" && <Loader2 className="size-4 animate-spin" />} Unsubscribe
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
