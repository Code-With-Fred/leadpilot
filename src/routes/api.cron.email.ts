import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Scheduled every few minutes: pulls replies, then sends due follow-ups on auto-send campaigns.
async function run(request: Request) {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { runEmailWorker } = await import("@/lib/email/engine.server");
  try {
    const report = await runEmailWorker();
    return Response.json({ ok: true, ...report });
  } catch (e) {
    console.error("email worker failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/cron/email")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
